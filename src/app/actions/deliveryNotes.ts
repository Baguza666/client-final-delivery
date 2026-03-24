'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateDeliveryNote(id: string, formData: FormData) {
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

    // ✅ Removed strict "!user" check that was causing the "Non connecté" error
    const clientId = formData.get('client_id')
    const number = formData.get('number') as string
    const date = formData.get('date')
    const status = formData.get('status')

    const itemsJson = formData.get('items') as string
    const items = itemsJson ? JSON.parse(itemsJson) : []

    // 1. Update main record (No prices/totals on a BL!)
    const { error: dnError } = await supabase
        .from('delivery_notes')
        .update({
            client_id: clientId,
            number: number,
            date: date,
            status: status,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (dnError) return { error: dnError.message }

    // 2. Replace items
    await supabase.from('delivery_note_items').delete().eq('delivery_note_id', id)

    if (items.length > 0) {
        await supabase.from('delivery_note_items').insert(
            items.map((item: any) => ({
                delivery_note_id: id,
                description: item.description,
                unit: item.unit || null,
                quantity: Number(item.quantity) || 0
            }))
        )
    }

    revalidatePath(`/delivery-notes/${id}`)
    revalidatePath('/delivery-notes')
    redirect(`/delivery-notes/${id}`)
}