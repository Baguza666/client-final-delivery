'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createHash } from 'crypto'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { generateNextNumber } from '@/lib/document-numbering'
import type { PoLineItem, DnLineItem, QuoteLineItem } from '@/lib/document-types'

export async function convertQuoteToInvoice(quoteId: string) {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { get: (name) => cookieStore.get(name)?.value } }
        )

        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (!user) return { success: false, error: 'Non authentifié.' }

        // Fetch workspace to verify ownership before reading or writing
        const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
        if (!workspaceId) return { success: false, error: 'Espace de travail introuvable.' }

        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select('*, quote_items(*)')
            .eq('id', quoteId)
            .eq('workspace_id', workspaceId) // IDOR guard: only fetch quotes owned by this workspace
            .single()
        if (quoteError || !quote) return { success: false, error: "Devis introuvable dans la base de données." }

        const invNum = await generateNextNumber(supabase, 'invoices', 'invoice_number', 'INV')
        const blNum = await generateNextNumber(supabase, 'delivery_notes', 'number', 'BL')
        const bcNum = await generateNextNumber(supabase, 'purchase_orders', 'number', 'BC')

        const items = quote.quote_items || []
        const totalHT_Gross = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
        const discount = quote.discount || 0
        const discountRatio = totalHT_Gross > 0 ? (1 - discount / 100) : 1
        const totalHT_Net = totalHT_Gross * discountRatio
        const totalTVA = items.reduce((sum: number, item: any) => {
            const lineHT = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0) * discountRatio
            const rate = item.tva_rate != null ? Number(item.tva_rate) : 20
            return sum + lineHT * (rate / 100)
        }, 0)
        const totalTTC = totalHT_Net + totalTVA

        // 1. INVOICE
        const invoicePayload: any = {
            invoice_number: invNum,
            date: new Date().toISOString(),
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            client_id: quote.client_id,
            workspace_id: quote.workspace_id,
            status: 'draft',
            discount: discount,
            notes: quote.notes || null,
            total_ht: totalHT_Gross,
            total_tva: totalTVA,
            total_ttc: totalTTC,
        }
        if (user) invoicePayload.owner_id = user.id // ✅ Only add if user exists

        const { data: newInvoice, error: invError } = await supabase
            .from('invoices')
            .insert(invoicePayload)
            .select()
            .single()

        if (invError) return { success: false, error: `Erreur Facture: ${invError.message}` }

        const invoiceItems = items.map((item: any) => ({
            invoice_id: newInvoice.id,
            description: item.description,
            unit: item.unit || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tva_rate: item.tva_rate != null ? Number(item.tva_rate) : 20,
            total: item.total
        }))
        await supabase.from('invoice_items').insert(invoiceItems)

        // 2. DELIVERY NOTE (BL)
        const blPayload: any = {
            number: blNum,
            date: new Date().toISOString(),
            client_id: quote.client_id,
            workspace_id: quote.workspace_id,
            status: 'pending'
        }
        if (user) blPayload.owner_id = user.id

        const { data: newBL } = await supabase.from('delivery_notes').insert(blPayload).select().single()

        if (newBL) {
            await supabase.from('delivery_note_items').insert(items.map((item: any) => ({
                delivery_note_id: newBL.id,
                description: item.description,
                unit: item.unit || null,
                quantity: item.quantity
            })))
        }

        // 3. PURCHASE ORDER (BC)
        const poPayload: any = {
            number: bcNum,
            date: new Date().toISOString(),
            client_id: quote.client_id,
            workspace_id: quote.workspace_id,
            status: 'pending',
            total_ht: totalHT_Gross,
            total_ttc: totalTTC,
        }
        if (user) poPayload.owner_id = user.id

        const { data: newPO } = await supabase.from('purchase_orders').insert(poPayload).select().single()

        if (newPO) {
            await supabase.from('purchase_order_items').insert(items.map((item: any) => ({
                purchase_order_id: newPO.id,
                description: item.description,
                unit: item.unit || null,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.total
            })))
        }

        // Update Quote Status
        await supabase.from('quotes').update({ status: 'accepted' }).eq('id', quoteId)

        return { success: true, invoiceId: newInvoice.id }

    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function convertInvoiceToDeliveryNote(invoiceId: string) {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { get: (name) => cookieStore.get(name)?.value } }
        )

        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (!user) return { success: false, error: 'Non authentifié.' }

        const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
        if (!workspaceId) return { success: false, error: 'Espace de travail introuvable.' }

        const { data: invoice, error: invError } = await supabase
            .from('invoices')
            .select('*, invoice_items(*)')
            .eq('id', invoiceId)
            .eq('workspace_id', workspaceId) // IDOR guard
            .single()

        if (invError || !invoice) return { success: false, error: 'Facture introuvable.' }

        const blNum = await generateNextNumber(supabase, 'delivery_notes', 'number', 'BL')

        const blPayload: any = {
            number: blNum,
            date: new Date().toISOString(),
            client_id: invoice.client_id,
            workspace_id: invoice.workspace_id,
            status: 'pending',
        }
        if (user) blPayload.owner_id = user.id

        const { data: newBL, error: blError } = await supabase
            .from('delivery_notes')
            .insert(blPayload)
            .select()
            .single()

        if (blError || !newBL) return { success: false, error: `Erreur BL: ${blError?.message}` }

        const items = invoice.invoice_items || []
        if (items.length > 0) {
            await supabase.from('delivery_note_items').insert(
                items.map((i: any) => ({
                    delivery_note_id: newBL.id,
                    description: i.description,
                    unit: i.unit || null,
                    quantity: i.quantity,
                }))
            )
        }

        revalidatePath('/delivery-notes')
        return { success: true, deliveryNoteId: newBL.id }

    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

function generateHash(data: unknown): string {
    if (!data) return ''
    const str = JSON.stringify(data, (key, value: unknown) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value as Record<string, unknown>).sort().reduce((sorted: Record<string, unknown>, k: string) => {
                sorted[k] = (value as Record<string, unknown>)[k]
                return sorted
            }, {})
        }
        return value
    })
    return createHash('md5').update(str).digest('hex')
}

export async function acceptQuote(quoteId: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } } } }
    )

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
    const poItems: PoLineItem[] = (quote.quote_items as QuoteLineItem[]).map((item) => ({
        purchase_order_id: po.id,
        line_uid: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tva_rate: item.tva_rate != null ? Number(item.tva_rate) : 20,
        total: item.total
    }))
    const { error: poItemsError } = await supabase.from('purchase_order_items').insert(poItems)
    if (poItemsError) return { success: false, message: `Erreur lignes BC: ${poItemsError.message}` }

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
    const dnItems: DnLineItem[] = poItems.map((item) => ({
        delivery_note_id: dn.id,
        line_uid: item.line_uid,
        description: item.description,
        quantity: item.quantity,
    }))
    const { error: dnItemsError } = await supabase.from('delivery_note_items').insert(dnItems)
    if (dnItemsError) return { success: false, message: `Erreur lignes BL: ${dnItemsError.message}` }

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
    const poByUid = new Map(poItems.map((p) => [p.line_uid, p]))
    const invoiceItems = dnItems.map((item) => {
        const original = poByUid.get(item.line_uid)
        if (!original) throw new Error(`PO item missing for line_uid: ${item.line_uid}`)
        return {
            invoice_id: invoice.id,
            line_uid: item.line_uid,
            description: item.description,
            quantity: item.quantity,
            unit_price: original.unit_price,
            tva_rate: original.tva_rate,
            total: item.quantity * original.unit_price,
        }
    })
    await supabase.from('invoice_items').insert(invoiceItems)

    // Update Quote Status — scoped to workspace
    await supabase.from('quotes').update({ status: 'accepted' }).eq('id', quoteId).eq('workspace_id', workspaceId)

    return { success: true }
}