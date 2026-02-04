'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getDashboardStats() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    // 1. Fetch Invoices (Revenu)
    const { data: invoices, error: invError } = await supabase.from('invoices').select('*')
    if (invError) console.error("Server Invoice Error:", invError)

    // 2. Fetch Expenses (Dépenses)
    const { data: expenses, error: expError } = await supabase.from('expenses').select('*').order('date', { ascending: false })
    if (expError) console.error("Server Expense Error:", expError)

    // 3. Fetch Active Debts (Dettes)
    const { data: debts, error: debtError } = await supabase.from('debts').select('*').eq('status', 'active')
    if (debtError) console.error("Server Debt Error:", debtError)

    // --- CALCULATIONS ---
    const rawInvoices = invoices || []
    const rawExpenses = expenses || []
    const rawDebts = debts || []

    // Calculate Revenue (Paid Invoices Only)
    const totalRevenue = rawInvoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + (Number(inv.total_ttc) || 0), 0)

    // Calculate Total Expenses (Sum of all amounts)
    const totalExpenses = rawExpenses
        .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)

    // Calculate Active Debt
    const totalDebt = rawDebts
        .reduce((sum, debt) => sum + (Number(debt.remaining_amount) || 0), 0)

    const pendingCount = rawInvoices.filter((inv) => inv.status === 'sent').length
    const netTreasury = totalRevenue - totalExpenses

    return {
        stats: {
            revenue: totalRevenue,
            expenses: totalExpenses,
            treasury: netTreasury,
            pending: pendingCount,
            debt: totalDebt
        },
        recentExpenses: rawExpenses.slice(0, 5), // Send top 5 recent
        recentTransactions: rawInvoices.slice(0, 5) // Send top 5 invoices
    }
}