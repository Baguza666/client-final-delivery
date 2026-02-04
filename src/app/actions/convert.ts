'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

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
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const { data: quote, error: quoteError } = await supabase.from('quotes').select('*, quote_items(*)').eq('id', quoteId).single()
    if (quoteError || !quote) throw new Error('Quote not found')

    const invNum = await generateNextNumber(supabase, 'invoices', 'invoice_number', 'INV')
    const blNum = await generateNextNumber(supabase, 'delivery_notes', 'number', 'BL')
    const bcNum = await generateNextNumber(supabase, 'purchase_orders', 'number', 'BC')

    // 🧮 Recalculate Invoice Math from Quote
    // Note: quote.total_amount usually stores the TTC in your schema
    // We need to re-derive HT Gross if not stored, but usually quotes store items.

    const items = quote.quote_items
    const totalHT_Gross = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
    const discount = quote.discount || 0
    const discountAmount = totalHT_Gross * (discount / 100)
    const totalHT_Net = totalHT_Gross - discountAmount
    const totalTVA = totalHT_Net * 0.20
    const totalTTC = totalHT_Net + totalTVA

    // 1. INVOICE
    const { data: newInvoice, error: invError } = await supabase
        .from('invoices')
        .insert({
            invoice_number: invNum,
            number: invNum,
            date: new Date().toISOString(),
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            client_id: quote.client_id,
            workspace_id: quote.workspace_id,
            status: 'draft',
            discount: discount, // ✅ Copy Discount
            total_ht: totalHT_Gross,
            total_tva: totalTVA,
            total_ttc: totalTTC,
            total: totalTTC,
            total_amount: totalTTC
        })
        .select()
        .single()

    if (invError) throw new Error('Failed to create Invoice: ' + invError.message)

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

    // ... (BL and PO creation remains the same, usually without discount logic) ...
    // BL
    const { data: newBL } = await supabase.from('delivery_notes').insert({
        number: blNum,
        date: new Date().toISOString(),
        client_id: quote.client_id,
        workspace_id: quote.workspace_id,
        status: 'pending'
    }).select().single()

    if (newBL) {
        await supabase.from('delivery_note_items').insert(items.map((item: any) => ({
            delivery_note_id: newBL.id,
            description: item.description,
            unit: item.unit || null,
            quantity: item.quantity
        })))
    }

    // BC
    const { data: newPO } = await supabase.from('purchase_orders').insert({
        number: bcNum,
        date: new Date().toISOString(),
        client_id: quote.client_id,
        workspace_id: quote.workspace_id,
        status: 'pending',
        total_ht: totalHT_Gross, // POs usually show Gross agreed price or Net, let's keep Gross for now
        total_ttc: totalTTC,
    }).select().single()

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

    await supabase.from('quotes').update({ status: 'accepted' }).eq('id', quoteId)
    redirect(`/invoices/${newInvoice.id}`)
}