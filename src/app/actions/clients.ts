'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getOrCreateWorkspace } from '@/lib/workspace'

async function getSupabase() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        )
                    } catch {
                        // Server actions may run in read-only cookie context.
                    }
                },
            },
        },
    )
}

export interface ClientActionResult {
    success: boolean
    message?: string
    id?: string
}

// ─── CREATE ────────────────────────────────────────────────
export async function createNewClient(formData: FormData): Promise<ClientActionResult> {
    const supabase = await getSupabase()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, message: 'Vous devez être connecté.' }
    }

    let workspaceId: string
    try {
        workspaceId = await getOrCreateWorkspace(supabase, user.id)
    } catch (e: any) {
        return { success: false, message: e.message }
    }

    const name = (formData.get('name') as string)?.trim()
    if (!name) {
        return { success: false, message: 'Le nom est requis.' }
    }

    const newClient = {
        workspace_id: workspaceId,
        name,
        email: ((formData.get('email') as string) || '').trim() || null,
        phone: ((formData.get('phone') as string) || '').trim() || null,
        address: ((formData.get('address') as string) || '').trim() || null,
        city: ((formData.get('city') as string) || '').trim() || null,
        ice: ((formData.get('ice') as string) || '').trim() || null,
        type: (formData.get('type') as string) || 'client',
    }

    const { data, error } = await supabase.from('clients').insert(newClient).select().single()

    if (error) {
        console.error('Supabase Create Error:', error)
        return { success: false, message: error.message }
    }

    revalidatePath('/clients')
    return { success: true, message: 'Client créé avec succès !', id: data?.id }
}

// ─── UPDATE ────────────────────────────────────────────────
export async function updateClient(formData: FormData): Promise<ClientActionResult> {
    const supabase = await getSupabase()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Non authentifié.' }

    let workspaceId: string
    try { workspaceId = await getOrCreateWorkspace(supabase, user.id) }
    catch (e: any) { return { success: false, message: e.message } }

    const id = formData.get('id') as string
    if (!id) return { success: false, message: 'ID manquant.' }

    const updates: Record<string, any> = {
        name: ((formData.get('name') as string) || '').trim(),
        email: ((formData.get('email') as string) || '').trim() || null,
        phone: ((formData.get('phone') as string) || '').trim() || null,
        address: ((formData.get('address') as string) || '').trim() || null,
        city: ((formData.get('city') as string) || '').trim() || null,
        ice: ((formData.get('ice') as string) || '').trim() || null,
    }
    const type = formData.get('type') as string
    if (type) updates.type = type

    if (!updates.name) {
        return { success: false, message: 'Le nom est requis.' }
    }

    const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .eq('workspace_id', workspaceId) // IDOR guard
    if (error) {
        console.error('Supabase Update Error:', error)
        return { success: false, message: error.message }
    }

    revalidatePath('/clients')
    return { success: true }
}

// ─── DELETE ────────────────────────────────────────────────
export async function deleteClient(id: string): Promise<ClientActionResult> {
    const supabase = await getSupabase()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Non authentifié.' }

    let workspaceId: string
    try { workspaceId = await getOrCreateWorkspace(supabase, user.id) }
    catch (e: any) { return { success: false, message: e.message } }

    const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId) // IDOR guard
    if (error) {
        console.error('Supabase Delete Error:', error)
        return { success: false, message: error.message }
    }
    revalidatePath('/clients')
    return { success: true }
}

// ─── BULK DELETE ───────────────────────────────────────────
export async function deleteClientsBulk(ids: string[]): Promise<ClientActionResult> {
    if (!ids.length) return { success: false, message: 'Aucun client sélectionné.' }

    const supabase = await getSupabase()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Non authentifié.' }

    let workspaceId: string
    try { workspaceId = await getOrCreateWorkspace(supabase, user.id) }
    catch (e: any) { return { success: false, message: e.message } }

    const { error } = await supabase
        .from('clients')
        .delete()
        .in('id', ids)
        .eq('workspace_id', workspaceId) // IDOR guard
    if (error) {
        console.error('Supabase Bulk Delete Error:', error)
        return { success: false, message: error.message }
    }
    revalidatePath('/clients')
    return { success: true, message: `${ids.length} client(s) supprimé(s).` }
}
