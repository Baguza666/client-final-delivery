import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns the workspace ID for the given user, creating one if it doesn't exist.
 * The unique index on owner_id makes concurrent first-run inserts safe:
 * one succeeds, the other gets a 23505 violation and fetches the winner.
 */
export async function getOrCreateWorkspace(
    supabase: SupabaseClient,
    userId: string,
): Promise<string> {
    const { data: existing } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', userId)
        .single()

    if (existing?.id) return existing.id

    const { data: created, error: insertError } = await supabase
        .from('workspaces')
        .insert({ owner_id: userId, name: 'Mon Espace' })
        .select('id')
        .single()

    if (created?.id) return created.id

    // 23505 = concurrent first-insert race; re-fetch the winner
    if (insertError?.code === '23505') {
        const { data: winner } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', userId)
            .single()
        if (winner?.id) return winner.id
    }

    throw new Error(
        `Impossible de créer l'espace de travail: ${insertError?.message ?? 'erreur inconnue'}`,
    )
}
