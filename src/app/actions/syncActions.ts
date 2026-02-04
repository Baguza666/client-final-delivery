'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// --- HELPER FUNCTION ---
async function createClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )
}

// --- MAIN ACTION ---

export async function syncInvoiceWithDN(invoiceId: string, deliveryNoteId: string) {
    const supabase = await createClient()

    const { data: dn } = await supabase
        .from('delivery_notes')
        .select('*, dn_items(*)')
        .eq('id', deliveryNoteId)
        .single()

    if (!dn) return { success: false, message: "Delivery Note not found" }

    const newInvoiceItems = dn.dn_items.map((item: any) => ({
        invoice_id: invoiceId,
        line_uid: item.line_uid,
        description: item.description,
        quantity: item.quantity_delivered,
        unit_price: 0,
        total: 0,
        sort_order: item.sort_order
    }))

    await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
    await supabase.from('invoice_items').insert(newInvoiceItems)

    await supabase.from('invoices').update({
        upstream_hash_at_sync: dn.content_hash,
        updated_at: new Date().toISOString()
    }).eq('id', invoiceId)

    return { success: true }
}