'use server'

import { revalidatePath } from 'next/cache'
import { withWorkspace } from '@/lib/action-wrapper'

export interface ClientActionResult {
    success: boolean
    message?: string
    id?: string
}

/** Normalise the withWorkspace { error } shape into ClientActionResult. */
async function wrap(
    fn: Parameters<typeof withWorkspace<ClientActionResult>>[0],
): Promise<ClientActionResult> {
    const result = await withWorkspace(fn)
    if ('error' in result) return { success: false, message: result.error }
    return result
}

// ─── CREATE ────────────────────────────────────────────────
export async function createNewClient(formData: FormData): Promise<ClientActionResult> {
    return wrap(async ({ supabase, workspaceId }) => {
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
    })
}

// ─── UPDATE ────────────────────────────────────────────────
export async function updateClient(formData: FormData): Promise<ClientActionResult> {
    return wrap(async ({ supabase, workspaceId }) => {
        const id = formData.get('id') as string
        if (!id) return { success: false, message: 'ID manquant.' }

        const updates: Record<string, string | null> = {
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
    })
}

// ─── DELETE ────────────────────────────────────────────────
export async function deleteClient(id: string): Promise<ClientActionResult> {
    return wrap(async ({ supabase, workspaceId }) => {
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
    })
}

// ─── BULK DELETE ───────────────────────────────────────────
export async function deleteClientsBulk(ids: string[]): Promise<ClientActionResult> {
    if (!ids.length) return { success: false, message: 'Aucun client sélectionné.' }

    return wrap(async ({ supabase, workspaceId }) => {
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
    })
}
