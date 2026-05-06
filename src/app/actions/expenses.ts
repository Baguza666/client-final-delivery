'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getOrCreateWorkspace } from '@/lib/workspace'

export async function payDebt(debtId: string, amount: number, debtName: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }

    // Fetch debt and verify it belongs to the authenticated user's workspace
    const { data: debt } = await supabase
        .from('debts')
        .select('*')
        .eq('id', debtId)
        .eq('workspace_id', workspaceId) // IDOR guard
        .single()

    if (!debt) return { error: "Dette introuvable" }

    const newRemaining = debt.remaining_amount - amount
    const newStatus = newRemaining <= 0 ? 'paid' : 'active'

    const { error: debtError } = await supabase
        .from('debts')
        .update({
            remaining_amount: Math.max(0, newRemaining),
            status: newStatus
        })
        .eq('id', debtId)
        .eq('workspace_id', workspaceId)

    if (debtError) return { error: debtError.message }

    await supabase.from('expenses').insert({
        workspace_id: workspaceId,
        description: `Remboursement: ${debtName}`,
        amount: amount,
        category: 'Dette',
        date: new Date().toISOString()
    })

    revalidatePath('/expenses')
    revalidatePath('/')
    return { success: true }
}
