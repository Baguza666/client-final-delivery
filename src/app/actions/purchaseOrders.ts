'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updatePurchaseOrder(id: string, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } }
            }
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Non connecté" }

    const clientId = formData.get('client_id')
    const number = formData.get('number') as string
    const date = formData.get('date')
    const status = formData.get('status')

    const itemsJson = formData.get('items') as string
    const items = itemsJson ? JSON.parse(itemsJson) : []

    // 🧮 CALCULATIONS
    const totalHT = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
    const totalTVA = totalHT * 0.20
    const totalTTC = totalHT + totalTVA

    // 1. Update main record
    const { error: poError } = await supabase
        .from('purchase_orders')
        .update({
            client_id: clientId,
            number: number,
            date: date,
            status: status,
            total_ht: totalHT,
            total_ttc: totalTTC,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (poError) return { error: poError.message }

    // 2. Replace items
    await supabase.from('purchase_order_items').delete().eq('purchase_order_id', id)

    if (items.length > 0) {
        await supabase.from('purchase_order_items').insert(
            items.map((item: any) => ({
                purchase_order_id: id,
                description: item.description,
                unit: item.unit || null,
                quantity: Number(item.quantity) || 0,
                unit_price: Number(item.unit_price) || 0,
                total: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
            }))
        )
    }

    revalidatePath(`/purchase-orders/${id}`)
    revalidatePath('/purchase-orders')
    redirect(`/purchase-orders/${id}`)
}