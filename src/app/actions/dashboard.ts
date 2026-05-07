'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getOrCreateWorkspace } from '@/lib/workspace'
import {
    aggregateDebt,
    buildReminders,
    bucketExpensesByCategory,
    aggregateRevenueByMonth,
    findTopClients,
} from '@/lib/dashboard-helpers'
import type { InvoiceRow, ExpenseRow, DebtRow } from '@/lib/dashboard-helpers'

export type {
    DashboardStats,
    DebtSummary,
    TopClient,
    MonthBar,
    Reminder,
    DashboardData,
} from '@/lib/dashboard-helpers'

const SPARKLINE_MONTHS = 12

function buildMonthBuckets(now: Date): { keys: string[]; labels: string[] } {
    const keys: string[] = []
    const labels: string[] = []
    for (let i = SPARKLINE_MONTHS - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        labels.push(d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }))
    }
    return { keys, labels }
}

export async function getDashboardStats() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } },
    )

    const { data: { user } } = await supabase.auth.getUser()
    const wsId = user ? await getOrCreateWorkspace(supabase, user.id).catch(() => null) : null

    const [{ data: invoices }, { data: expenses }, { data: debts }, { data: clients }] = await Promise.all([
        wsId
            ? supabase.from('invoices').select('*, client:clients(name)').eq('workspace_id', wsId).order('created_at', { ascending: false })
            : Promise.resolve({ data: [] }),
        wsId
            ? supabase.from('expenses').select('*').eq('workspace_id', wsId).order('date', { ascending: false })
            : Promise.resolve({ data: [] }),
        wsId
            ? supabase.from('debts').select('*').eq('workspace_id', wsId)
            : Promise.resolve({ data: [] }),
        wsId
            ? supabase.from('clients').select('id').eq('workspace_id', wsId)
            : Promise.resolve({ data: [] }),
    ])

    const safeInvoices: InvoiceRow[] = (invoices as InvoiceRow[] | null) ?? []
    const safeExpenses: ExpenseRow[] = (expenses as ExpenseRow[] | null) ?? []
    const safeDebts: DebtRow[] = (debts as DebtRow[] | null) ?? []
    const safeClients = clients ?? []

    const totalRevenue = safeInvoices
        .filter((i) => (i.status || '').toLowerCase() === 'paid')
        .reduce((sum, i) => sum + (Number(i.total_ttc) || 0), 0)

    const totalExpenses = safeExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

    const pendingCount = safeInvoices.filter((i) => {
        const s = (i.status || '').toLowerCase()
        return s === 'sent' || s === 'pending' || s === 'en_attente' || s === 'en attente'
    }).length

    const debt = aggregateDebt(safeDebts)

    const { keys, labels } = buildMonthBuckets(new Date())
    const revenueByMonth = aggregateRevenueByMonth(safeInvoices, keys)

    const expBucketMap = new Map<string, number>(keys.map((k) => [k, 0]))
    for (const exp of safeExpenses) {
        const ref = new Date(exp.date || exp.created_at || '')
        if (isNaN(ref.getTime())) continue
        const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`
        if (expBucketMap.has(key)) {
            expBucketMap.set(key, (expBucketMap.get(key) || 0) + (Number(exp.amount) || 0))
        }
    }
    const expensesByMonth = keys.map((k) => expBucketMap.get(k) || 0)

    const expensesByCategory = bucketExpensesByCategory(safeExpenses)
    const topClients = findTopClients(safeInvoices)

    const lastMonthRev = revenueByMonth[revenueByMonth.length - 2] || 0
    const thisMonthRev = revenueByMonth[revenueByMonth.length - 1] || 0
    const momGrowthPct = lastMonthRev > 0
        ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100
        : thisMonthRev > 0 ? 100 : 0

    const pendingAmount = safeInvoices
        .filter((i) => {
            const s = (i.status || '').toLowerCase()
            return s === 'pending' || s === 'draft'
        })
        .reduce((sum, i) => sum + (Number(i.total_ttc) || 0), 0)

    const nowDate = new Date()
    const curYear = nowDate.getFullYear()
    const curMonth = nowDate.getMonth()

    const invoicesThisMonth = safeInvoices.filter((i) => {
        const d = new Date(i.created_at || '')
        return d.getFullYear() === curYear && d.getMonth() === curMonth
    }).length

    const clientCount = safeClients.length

    const MONTH_LABELS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    const revenueByYear: { label: string; revenue: number }[] = Array.from(
        { length: curMonth + 1 },
        (_, m) => ({ label: MONTH_LABELS_FR[m], revenue: 0 }),
    )
    for (const inv of safeInvoices) {
        if ((inv.status || '').toLowerCase() !== 'paid') continue
        const d = new Date(inv.date || inv.created_at || '')
        if (isNaN(d.getTime()) || d.getFullYear() !== curYear) continue
        const m = d.getMonth()
        if (m <= curMonth) revenueByYear[m].revenue += Number(inv.total_ttc) || 0
    }

    const todayStr = nowDate.toISOString().slice(0, 10)
    const reminders = buildReminders(safeInvoices, todayStr)

    return {
        stats: {
            revenue: totalRevenue,
            expenses: totalExpenses,
            treasury: totalRevenue - totalExpenses,
            pending: pendingCount,
            debt: debt.totalRemaining,
        },
        debt,
        recentTransactions: safeInvoices.slice(0, 5),
        recentExpenses: safeExpenses.slice(0, 5),
        revenueByMonth,
        expensesByMonth,
        monthLabels: labels,
        expensesByCategory,
        topClients,
        momGrowthPct,
        hasAnyData:
            safeInvoices.length > 0 || safeExpenses.length > 0 || safeDebts.length > 0 || safeClients.length > 0,
        pendingAmount,
        invoicesThisMonth,
        clientCount,
        revenueByYear,
        reminders,
    }
}
