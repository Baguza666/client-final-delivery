'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// Helper to create the client securely
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

// --- 1. CREATE EXPENSE (Fixed Export) ---
export async function createExpense(formData: any) {
    const supabase = await createClient()

    try {
        const { error } = await supabase.from('expenses').insert({
            description: formData.description,
            amount: parseFloat(formData.amount),
            category: formData.category,
            date: formData.date,
            payment_method: formData.payment_method || 'Espèces',
            proof_url: formData.proof_url || null,
            is_recurring: formData.is_recurring === 'true' || formData.is_recurring === true,
            frequency: formData.frequency || null,
            status: 'paid'
        })

        if (error) throw new Error(error.message)

        revalidatePath('/expenses')
        revalidatePath('/') // Updates Dashboard Treasury
        return { success: true }

    } catch (error: any) {
        return { error: error.message || "Erreur lors de la création de la dépense." }
    }
}

// --- 2. PAY DEBT ---
export async function payDebtInstallment(debtId: string, amount: number, debtName: string) {
    const supabase = await createClient()

    try {
        // A. Get current debt info
        const { data: debt, error: fetchError } = await supabase
            .from('debts')
            .select('remaining_amount')
            .eq('id', debtId)
            .single()

        if (fetchError || !debt) throw new Error("Dette introuvable.")

        // B. Calculate new remaining amount
        const newRemaining = Math.max(0, debt.remaining_amount - amount)
        const newStatus = newRemaining === 0 ? 'paid' : 'active'

        // C. Update Debt Record (Now 'last_payment' will work after SQL fix)
        const { error: updateError } = await supabase
            .from('debts')
            .update({
                remaining_amount: newRemaining,
                status: newStatus,
                last_payment: new Date().toISOString()
            })
            .eq('id', debtId)

        if (updateError) throw new Error(`Erreur DB: ${updateError.message}`)

        // D. Create Expense (Trace in Treasury)
        const { error: expenseError } = await supabase.from('expenses').insert({
            description: `Remboursement Dette: ${debtName}`,
            amount: amount,
            category: 'Dette',
            date: new Date().toISOString(),
            payment_method: 'Virement',
            status: 'paid'
        })

        if (expenseError) throw new Error("Erreur création dépense.")

        // Force refresh everything
        revalidatePath('/', 'layout')

        return { success: true }

    } catch (error: any) {
        console.error("Payment Error:", error)
        return { error: error.message }
    }
}