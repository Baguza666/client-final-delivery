'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getOrCreateWorkspace } from '@/lib/workspace'

export async function generateShareLink(invoiceId: string): Promise<{ url?: string; error?: string }> {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }

    // Verify the invoice belongs to this workspace before generating a share link (IDOR guard)
    const { data: invoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('id', invoiceId)
        .eq('workspace_id', workspaceId)
        .single()

    if (!invoice) return { error: 'Facture introuvable.' }

    // Check for existing link
    const { data: existing } = await supabase
        .from('invoice_share_links')
        .select('token')
        .eq('invoice_id', invoiceId)
        .single()

    if (existing?.token) {
        return { url: `/view/${existing.token}` }
    }

    // Generate new token (32 hex chars)
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

    const { error } = await supabase.from('invoice_share_links').insert({
        invoice_id: invoiceId,
        token,
        created_by: user.id,
    })

    if (error) return { error: error.message }
    return { url: `/view/${token}` }
}
