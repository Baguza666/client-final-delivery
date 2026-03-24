'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function generateNextNumber(supabase: any, table: string, column: string, prefix: string) {
    const year = new Date().getFullYear()
    const searchPattern = `${prefix}-${year}-%`
    const { data } = await supabase.from(table).select(column).ilike(column, searchPattern).order('created_at', { ascending: false }).limit(1).single()
    let nextIndex = 1
    if (data && data[column]) {
        const parts = data[column].split('-')
        const lastNum = parseInt(parts[parts.length - 1])
        if (!isNaN(lastNum)) nextIndex = lastNum + 1
    }
    return `${prefix}-${year}-${nextIndex.toString().padStart(4, '0')}`
}

export async function convertQuoteToInvoice(quoteId: string) {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { get: (name) => cookieStore.get(name)?.value } }
        )

        // ✅ Gracefully check for user, but DO NOT block the conversion if testing/demoing
        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user

        const { data: quote, error: quoteError } = await supabase.from('quotes').select('*, quote_items(*)').eq('id', quoteId).single()
        if (quoteError || !quote) return { success: false, error: "Devis introuvable dans la base de données." }

        const invNum = await generateNextNumber(supabase, 'invoices', 'invoice_number', 'INV')
        const blNum = await generateNextNumber(supabase, 'delivery_notes', 'number', 'BL')
        const bcNum = await generateNextNumber(supabase, 'purchase_orders', 'number', 'BC')

        const items = quote.quote_items || []
        const totalHT_Gross = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
        const discount = quote.discount || 0
        const discountAmount = totalHT_Gross * (discount / 100)
        const totalHT_Net = totalHT_Gross - discountAmount
        const totalTVA = totalHT_Net * 0.20
        const totalTTC = totalHT_Net + totalTVA

        // 1. INVOICE
        const invoicePayload: any = {
            invoice_number: invNum,
            number: invNum,
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
            total: totalTTC,
            total_amount: totalTTC
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
            tva_rate: 20,
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