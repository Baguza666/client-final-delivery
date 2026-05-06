'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getOrCreateWorkspace } from '@/lib/workspace'

// Allowlist prevents callers from targeting arbitrary tables
const ALLOWED_TABLES = new Set(['invoices', 'quotes', 'delivery_notes', 'purchase_orders'])

async function createClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )
}

// --- UPDATE STATUS ---
export async function updateStatus(table: string, id: string, status: string) {
    if (!ALLOWED_TABLES.has(table)) throw new Error('Table non autorisée.')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié.')

    const workspaceId = await getOrCreateWorkspace(supabase, user.id)

    const { error } = await supabase
        .from(table)
        .update({ status })
        .eq('id', id)
        .eq('workspace_id', workspaceId) // IDOR guard

    if (error) throw new Error(error.message)

    revalidatePath(`/${table.replace(/_/g, '-')}`)
    revalidatePath(`/${table.replace(/_/g, '-')}/${id}`)
}

// --- DELETE DOCUMENT ---
export async function deleteDocument(table: string, id: string, redirectPath: string) {
    if (!ALLOWED_TABLES.has(table)) throw new Error('Table non autorisée.')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié.')

    const workspaceId = await getOrCreateWorkspace(supabase, user.id)

    const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId) // IDOR guard

    if (error) throw new Error(error.message)

    redirect(redirectPath)
}
