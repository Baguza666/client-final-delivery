'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { generateNextNumber } from '@/lib/document-numbering'

async function createSupabaseClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } }
            }
        }
    )
}

export async function createDeliveryNote(formData: FormData) {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }

    const clientId = formData.get('client_id')
    const rawDate = formData.get('date') as string | null
    const date = rawDate?.trim() || new Date().toISOString().split('T')[0]

    const itemsJson = formData.get('items') as string
    const items: any[] = itemsJson ? JSON.parse(itemsJson) : []

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
}

export async function updateDeliveryNote(id: string, formData: FormData) {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }

    const clientId = formData.get('client_id')
    const number = formData.get('number') as string
    const date = formData.get('date')
    const status = formData.get('status')

    const itemsJson = formData.get('items') as string
    const items = itemsJson ? JSON.parse(itemsJson) : []

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
