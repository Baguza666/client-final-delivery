'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function payDebt(debtId: string, amount: number, debtName: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    // 1. Verify the debt exists
    const { data: debt } = await supabase
        .from('debts')
        .select('*')
        .eq('id', debtId)
        .single()

    if (!debt) return { error: "Dette introuvable" }

    const newRemaining = debt.remaining_amount - amount
    const newStatus = newRemaining <= 0 ? 'paid' : 'active'

    // 2. Update the Debt
    const { error: debtError } = await supabase
        .from('debts')
        .update({
            remaining_amount: Math.max(0, newRemaining),
            status: newStatus
        })
        .eq('id', debtId)

    if (debtError) return { error: debtError.message }

    // 3. Create a Trace (Expense) for this payment
    // This ensures your Treasury graph updates automatically!
    await supabase.from('expenses').insert({
        description: `Remboursement: ${debtName}`,
        amount: amount,
        category: 'Dette',
        date: new Date().toISOString()
    })

    revalidatePath('/expenses')
    revalidatePath('/') // Update dashboard too
    return { success: true }
}