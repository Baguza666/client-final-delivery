'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'
import { getOrCreateWorkspace } from '@/lib/workspace'

async function createClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } } } }
    )
}

function generateHash(data: any): string {
    if (!data) return ''
    const str = JSON.stringify(data, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value).sort().reduce((sorted: any, key: string) => {
                sorted[key] = value[key]
                return sorted
            }, {})
        }
        return value
    })
    return createHash('md5').update(str).digest('hex')
}

export async function acceptQuote(quoteId: string) {
    const supabase = await createClient()

    // Auth check — must be first
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié.')

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) throw new Error('Espace de travail introuvable.')

    // Fetch Quote — scoped to this workspace to prevent IDOR
    const { data: quote } = await supabase
        .from('quotes')
        .select('*, quote_items(*)')
        .eq('id', quoteId)
        .eq('workspace_id', workspaceId) // IDOR guard
        .single()

    if (!quote) throw new Error("Devis introuvable")

    // Idempotency check
    const { data: existing } = await supabase.from('purchase_orders').select('id').eq('quote_id', quoteId).single()
    if (existing) return { success: false, message: "Documents déjà générés" }

    const currentHash = generateHash(quote.quote_items)

    // Generate PO
    const { data: po, error: poError } = await supabase.from('purchase_orders').insert({
        quote_id: quote.id,
        workspace_id: workspaceId, // Use verified workspaceId, not quote.workspace_id
        number: `PO-${quote.number}`,
        status: 'draft',
        content_hash: currentHash
    }).select().single()

    if (poError || !po) {
        console.error("PO Error:", poError)
        return { success: false, message: "Erreur création Bon de Commande: " + poError?.message }
    }

    // Generate PO Items
    const poItems = quote.quote_items.map((item: any) => ({
        purchase_order_id: po.id,
        line_uid: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tva_rate: Number(item.tva_rate) || 20,
        total: item.total
    }))
    await supabase.from('purchase_order_items').insert(poItems)

    // Generate DN
    const { data: dn } = await supabase.from('delivery_notes').insert({
        purchase_order_id: po.id,
        workspace_id: workspaceId,
        number: `DN-${quote.number}`,
        status: 'draft',
        upstream_hash_at_sync: currentHash
    }).select().single()

    if (!dn) return { success: false, message: "Erreur création Bon de Livraison" }

    // Generate DN Items
    const dnItems = poItems.map((item: any) => ({
        delivery_note_id: dn.id,
        line_uid: item.line_uid,
        description: item.description,
        quantity: item.quantity,
    }))
    await supabase.from('delivery_note_items').insert(dnItems)

    // Generate Invoice
    const { data: invoice } = await supabase.from('invoices').insert({
        client_id: quote.client_id,
        workspace_id: workspaceId,
        invoice_number: `INV-${quote.number}`,
        status: 'draft',
        total_ttc: quote.total_amount,
    }).select().single()

    if (!invoice) return { success: false, message: "Erreur création Facture" }

    // Generate Invoice Items
    const invoiceItems = dnItems.map((item: any, idx: number) => {
        const originalItem = poItems[idx]
        return {
            invoice_id: invoice.id,
            line_uid: item.line_uid,
            description: item.description,
            quantity: item.quantity,
            unit_price: originalItem.unit_price,
            tva_rate: originalItem.tva_rate,
            total: item.quantity * originalItem.unit_price
        }
    })
    await supabase.from('invoice_items').insert(invoiceItems)

    // Update Quote Status — scoped to workspace
    await supabase.from('quotes').update({ status: 'accepted' }).eq('id', quoteId).eq('workspace_id', workspaceId)

    return { success: true }
}
