'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getOrCreateWorkspace } from '@/lib/workspace'

async function createClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } }
            }
        }
    )
}

// --- 1. CREATE EXPENSE ---
export async function createExpense(formData: any) {
    const supabase = await createClient()

    // Auth check: workspace_id is derived from the session, never from the caller
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) return { error: 'Montant invalide.' }

    try {
        const payload: Record<string, any> = {
            workspace_id: workspaceId, // Always from session, never from caller
            description: formData.description,
            amount,
            category: formData.category,
            date: formData.date,
            payment_method: formData.payment_method || 'Espèces',
            proof_url: formData.proof_url || null,
            is_recurring: formData.is_recurring === 'true' || formData.is_recurring === true,
            frequency: formData.frequency || null,
            status: 'paid',
        }

        const { error } = await supabase.from('expenses').insert(payload)
        if (error) throw new Error(error.message)

        revalidatePath('/expenses')
        revalidatePath('/')
        return { success: true }

    } catch (error: any) {
        return { error: error.message || "Erreur lors de la création de la dépense." }
    }
}

// --- 2. PAY DEBT INSTALLMENT ---
export async function payDebtInstallment(debtId: string, amount: number, debtName: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }

    try {
        // Fetch debt and verify it belongs to the authenticated user's workspace
        const { data: debt, error: fetchError } = await supabase
            .from('debts')
            .select('remaining_amount, workspace_id')
            .eq('id', debtId)
            .eq('workspace_id', workspaceId) // IDOR guard
            .single()

        if (fetchError || !debt) throw new Error("Dette introuvable.")

        const newRemaining = Math.max(0, debt.remaining_amount - amount)
        const newStatus = newRemaining === 0 ? 'paid' : 'active'

        const { error: updateError } = await supabase
            .from('debts')
            .update({
                remaining_amount: newRemaining,
                status: newStatus,
                last_payment: new Date().toISOString()
            })
            .eq('id', debtId)
            .eq('workspace_id', workspaceId)

        if (updateError) throw new Error(`Erreur DB: ${updateError.message}`)

        const { error: expenseError } = await supabase.from('expenses').insert({
            workspace_id: workspaceId,
            description: `Remboursement Dette: ${debtName}`,
            amount: amount,
            category: 'Dette',
            date: new Date().toISOString(),
            payment_method: 'Virement',
            status: 'paid'
        })

        if (expenseError) throw new Error("Erreur création dépense.")

        revalidatePath('/', 'layout')

        return { success: true }

    } catch (error: any) {
        console.error("Payment Error:", error)
        return { error: error.message }
    }
}

// --- 3. DELETE EXPENSE ---
export async function deleteExpense(id: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }

    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId) // IDOR guard

    if (error) return { error: error.message }
    revalidatePath('/expenses')
    revalidatePath('/')
    return { success: true }
}
