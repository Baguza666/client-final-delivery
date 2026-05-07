import { createClient } from '@/utils/supabase/server'
import { getOrCreateWorkspace } from '@/lib/workspace'
import type { User } from '@supabase/supabase-js'

type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>

export type WorkspaceContext = {
    supabase: AppSupabaseClient
    user: User
    workspaceId: string
}

export async function withWorkspace<T>(
    handler: (ctx: WorkspaceContext) => Promise<T>,
): Promise<T | { error: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }
    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }
    return handler({ supabase, user, workspaceId })
}
