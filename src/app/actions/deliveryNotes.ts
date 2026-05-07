'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { withWorkspace } from '@/lib/action-wrapper'
import { generateNextNumber } from '@/lib/document-numbering'

export async function createDeliveryNote(formData: FormData) {
    return withWorkspace(async ({ supabase, user, workspaceId }) => {
        const clientId = formData.get('client_id')
        const rawDate = formData.get('date') as string | null
        const date = rawDate?.trim() || new Date().toISOString().split('T')[0]

        const itemsJson = formData.get('items') as string
        const items: { description: string; unit?: string | null; quantity: number }[] = itemsJson ? JSON.parse(itemsJson) : []

        const number = await generateNextNumber(supabase, 'delivery_notes', 'number', 'BL')

        const { data: dn, error: dnError } = await supabase
            .from('delivery_notes')
            .insert({ workspace_id: workspaceId, client_id: clientId, owner_id: user.id, number, date, status: 'draft' })
            .select()
            .single()

        if (dnError) return { error: `Erreur DB: ${dnError.message}` }

        if (items.length > 0) {
            const { error: itemsError } = await supabase.from('delivery_note_items').insert(
                items.map(item => ({
                    delivery_note_id: dn.id,
                    description: item.description,
                    unit: item.unit || null,
                    quantity: Number(item.quantity) || 0,
                }))
            )
            if (itemsError) {
                await supabase.from('delivery_notes').delete().eq('id', dn.id)
                return { error: `Erreur lignes: ${itemsError.message}` }
            }
        }

        revalidatePath('/delivery-notes')
        redirect(`/delivery-notes/${dn.id}`)
    })
}

export async function updateDeliveryNote(id: string, formData: FormData) {
    return withWorkspace(async ({ supabase, workspaceId }) => {
        const clientId = formData.get('client_id')
        const number = formData.get('number') as string
        const date = formData.get('date')
        const status = formData.get('status')

        const itemsJson = formData.get('items') as string
        const items: { description: string; unit?: string | null; quantity: number }[] = itemsJson ? JSON.parse(itemsJson) : []

        const { error: dnError } = await supabase
            .from('delivery_notes')
            .update({
                client_id: clientId,
                number: number,
                date: date,
                status: status
            })
            .eq('id', id)
            .eq('workspace_id', workspaceId) // IDOR guard

        if (dnError) return { error: dnError.message }

        await supabase.from('delivery_note_items').delete().eq('delivery_note_id', id)

        if (items.length > 0) {
            await supabase.from('delivery_note_items').insert(
                items.map((item) => ({
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
    })
}
