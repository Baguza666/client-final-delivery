'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'

// --- HELPER FUNCTIONS ---
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

// --- MAIN ACTION ---

export async function acceptQuote(quoteId: string) {
    const supabase = await createClient()

    // 1. Fetch Quote & Items
    const { data: quote } = await supabase.from('quotes').select('*, quote_items(*)').eq('id', quoteId).single()
    if (!quote) throw new Error("Devis introuvable")

    // 2. Check Idempotency
    const { data: existing } = await supabase.from('purchase_orders').select('id').eq('quote_id', quoteId).single()
    if (existing) return { success: false, message: "Documents déjà générés" }

    const currentHash = generateHash(quote.quote_items)

    // 3. Generate PO
    const { data: po, error: poError } = await supabase.from('purchase_orders').insert({
        quote_id: quote.id,
        workspace_id: quote.workspace_id,
        number: `PO-${quote.number}`,
        status: 'draft',
        content_hash: currentHash
    }).select().single()

    // 🔴 CRASH FIX: Check if PO creation failed
    if (poError || !po) {
        console.error("PO Error:", poError)
        return { success: false, message: "Erreur création Bon de Commande: " + poError?.message }
    }

    // 4. Generate PO Items
    const poItems = quote.quote_items.map((item: any) => ({
        po_id: po.id, // This is now safe because we checked 'po' above
        line_uid: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total
    }))
    await supabase.from('po_items').insert(poItems)

    // 5. Generate DN
    const { data: dn } = await supabase.from('delivery_notes').insert({
        purchase_order_id: po.id,
        number: `DN-${quote.number}`,
        status: 'draft',
        upstream_hash_at_sync: currentHash
    }).select().single()

    if (!dn) return { success: false, message: "Erreur création Bon de Livraison" }

    // 6. Generate DN Items
    const dnItems = poItems.map((item: any) => ({
        dn_id: dn.id,
        line_uid: item.line_uid,
        description: item.description,
        quantity_delivered: item.quantity,
    }))
    await supabase.from('dn_items').insert(dnItems)

    // 7. Generate Invoice
    const { data: invoice } = await supabase.from('invoices').insert({
        delivery_note_id: dn.id,
        client_id: quote.client_id,
        workspace_id: quote.workspace_id,
        number: `INV-${quote.number}`,
        status: 'draft',
        total_amount: quote.total_amount,
        upstream_hash_at_sync: currentHash
    }).select().single()

    if (!invoice) return { success: false, message: "Erreur création Facture" }

    // 8. Generate Invoice Items
    const invoiceItems = dnItems.map((item: any, idx: number) => {
        const originalItem = poItems[idx]
        return {
            invoice_id: invoice.id,
            line_uid: item.line_uid,
            description: item.description,
            quantity: item.quantity_delivered,
            unit_price: originalItem.unit_price,
            total: item.quantity_delivered * originalItem.unit_price
        }
    })
    await supabase.from('invoice_items').insert(invoiceItems)

    // 9. Update Quote Status
    await supabase.from('quotes').update({ status: 'accepted' }).eq('id', quoteId)

    return { success: true }
}