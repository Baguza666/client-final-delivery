'use server'

import { revalidatePath } from 'next/cache'
import { withWorkspace, requireTier, isTierLockedError } from '@/lib/action-wrapper'

export interface ExpenseInput {
    description: string
    amount: number | string
    category: string
    date: string
    payment_method?: string
    proof_url?: string | null
    is_recurring?: boolean | string
    frequency?: string | null
}

// --- 1. CREATE EXPENSE ---
export async function createExpense(formData: ExpenseInput) {
    return withWorkspace(async (ctx) => {
        const { supabase, workspaceId } = ctx
        const gate = await requireTier(ctx, 'pro', 'expenses')
        if (isTierLockedError(gate)) return gate
        const amount = parseFloat(String(formData.amount))
        if (isNaN(amount) || amount <= 0) return { error: 'Montant invalide.' }

        try {
            const payload: Record<string, unknown> = {
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

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erreur lors de la création de la dépense."
            return { error: message }
        }
    })
}

// --- 2. PAY DEBT INSTALLMENT ---
export async function payDebtInstallment(debtId: string, amount: number, debtName: string): Promise<{ success: boolean; error?: string }> {
    const result = await withWorkspace(async (ctx) => {
        const { supabase, workspaceId } = ctx
        const gate = await requireTier(ctx, 'pro', 'debts')
        if (isTierLockedError(gate)) return { success: false as const, error: gate.error }
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

            return { success: true as const }

        } catch (err: unknown) {
            console.error("Payment Error:", err)
            const message = err instanceof Error ? err.message : "Erreur de paiement."
            return { success: false as const, error: message }
        }
    })

    if ('error' in result && !('success' in result)) {
        return { success: false, error: result.error }
    }
    return result as { success: boolean; error?: string }
}

// --- 3. DELETE EXPENSE ---
export async function deleteExpense(id: string) {
    return withWorkspace(async (ctx) => {
        const { supabase, workspaceId } = ctx
        const gate = await requireTier(ctx, 'pro', 'expenses')
        if (isTierLockedError(gate)) return gate
        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id)
            .eq('workspace_id', workspaceId) // IDOR guard

        if (error) return { error: error.message }
        revalidatePath('/expenses')
        revalidatePath('/')
        return { success: true }
    })
}

// --- 4. ADD EXPENSE (FormData, with receipt upload) ---
export async function addExpense(formData: FormData): Promise<{ success: boolean; error?: string }> {
    const result = await withWorkspace(async (ctx) => {
        const { supabase, workspaceId } = ctx
        const gate = await requireTier(ctx, 'pro', 'expenses')
        if (isTierLockedError(gate)) return { success: false as const, error: gate.error }
        const amount = formData.get('amount');
        const description = formData.get('description');
        const category = formData.get('category');
        const receiptFile = formData.get('receipt') as File;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return { success: false, error: 'Montant invalide.' };
        }

        let receiptUrl: string | null = null;

        if (receiptFile && receiptFile.size > 0) {
            const fileName = `${Date.now()}-${receiptFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(fileName, receiptFile);
            if (!uploadError) {
                const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
                receiptUrl = data.publicUrl;
            }
        }

        const { error } = await supabase.from('expenses').insert({
            workspace_id: workspaceId, // Always from session
            amount: Number(amount),
            description: description,
            category: category,
            receipt_url: receiptUrl,
            date: new Date().toISOString()
        });

        if (error) return { success: false, error: error.message };

        revalidatePath('/dashboard');
        revalidatePath('/expenses');
        return { success: true };
    })

    if ('error' in result && typeof result.error === 'string' && !('success' in result)) {
        return { success: false, error: result.error }
    }
    return result as { success: boolean; error?: string }
}

// --- 5. CREATE NEW DEBT ---
export async function createDebt(formData: FormData): Promise<{ success: boolean; error?: string }> {
    const result = await withWorkspace(async (ctx) => {
        const { supabase, workspaceId } = ctx
        const gate = await requireTier(ctx, 'pro', 'debts')
        if (isTierLockedError(gate)) return { success: false as const, error: gate.error }
        const creditor = (formData.get('creditor') as string)?.trim();
        if (!creditor) return { success: false, error: 'Le nom du créancier est requis.' };

        const totalAmount = Number(formData.get('total_amount'));
        if (isNaN(totalAmount) || totalAmount <= 0) return { success: false, error: 'Montant total invalide.' };

        const monthlyPayment = Number(formData.get('monthly_payment'));
        if (isNaN(monthlyPayment) || monthlyPayment <= 0) return { success: false, error: 'Mensualité invalide.' };

        const dueDate = formData.get('due_date') as string;

        const { error } = await supabase.from('debts').insert({
            workspace_id: workspaceId, // Always from session
            creditor_name: creditor,
            total_amount: totalAmount,
            remaining_amount: totalAmount,
            monthly_payment: monthlyPayment,
            due_date: dueDate,
            status: 'Active'
        });

        if (error) return { success: false, error: error.message };

        revalidatePath('/dashboard');
        revalidatePath('/expenses');
        return { success: true };
    })

    if ('error' in result && typeof result.error === 'string' && !('success' in result)) {
        return { success: false, error: result.error }
    }
    return result as { success: boolean; error?: string }
}
