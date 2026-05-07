'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getOrCreateWorkspace } from '@/lib/workspace'

export interface DashboardStats {
    revenue: number
    expenses: number
    treasury: number
    pending: number
    debt: number
}

export interface DebtSummary {
    activeCount: number
    totalRemaining: number
    totalAmount: number
    progressPct: number     // 0..100, weighted by total_amount
    nextDueDate: string | null
}

export interface TopClient {
    name: string
    revenue: number
    invoiceCount: number
}

export interface MonthBar {
    label: string
    revenue: number
}

export interface Reminder {
    id: string
    invoiceNumber: string
    clientName: string
    amount: number
    dueDate: string | null
    type: 'overdue' | 'pending'
}

export interface DashboardData {
    stats: DashboardStats
    debt: DebtSummary
    recentTransactions: any[]
    recentExpenses: any[]
    revenueByMonth: number[] // last 12 months ordered oldest → newest
    expensesByMonth: number[] // last 12 months ordered oldest → newest
    monthLabels: string[]    // matching labels for sparkline tooltips
    expensesByCategory: Record<string, number>
    topClients: TopClient[]
    momGrowthPct: number     // month-over-month revenue growth %
    hasAnyData: boolean
    // KPI spec fields
    pendingAmount: number    // sum of total_ttc for pending/draft invoices
    invoicesThisMonth: number // count of invoices created this calendar month
    clientCount: number      // total clients in workspace
    revenueByYear: MonthBar[] // paid revenue per month for the current calendar year
    reminders: Reminder[]
}

const SPARKLINE_MONTHS = 12

type InvoiceRow = {
    id: string
    status: string | null
    total_ttc: string | number | null
    date?: string | null
    created_at?: string | null
    due_date?: string | null
    client_id?: string | null
    invoice_number?: string | null
    client?: { name?: string | null } | null
}

type ExpenseRow = {
    amount: string | number | null
    date?: string | null
    created_at?: string | null
    category?: string | null
}

type DebtRow = {
    status?: string | null
    remaining_amount?: string | number | null
    total_amount?: string | number | null
    due_date?: string | null
}

export function aggregateDebt(debts: DebtRow[]): DebtSummary {
    const activeDebts = debts.filter((d) => (d.status || '').toLowerCase() !== 'paid')
    const totalRemaining = activeDebts.reduce((sum, d) => sum + (Number(d.remaining_amount) || 0), 0)
    const totalAmount = debts.reduce((sum, d) => sum + (Number(d.total_amount) || 0), 0)
    const progressPct =
        totalAmount > 0 ? Math.round(((totalAmount - totalRemaining) / totalAmount) * 100) : 0
    const nextDueDate =
        activeDebts.map((d) => d.due_date).filter((d): d is string => !!d).sort()[0] ?? null
    return { activeCount: activeDebts.length, totalRemaining, totalAmount, progressPct, nextDueDate }
}

export function buildReminders(invoices: InvoiceRow[], todayStr: string): Reminder[] {
    const reminders: Reminder[] = []
    for (const inv of invoices) {
        const status = (inv.status || '').toLowerCase()
        const clientName = inv.client?.name || 'Client inconnu'
        const invoiceNumber = inv.invoice_number || inv.id.slice(0, 8).toUpperCase()
        const amount = Number(inv.total_ttc) || 0
        const dueDate: string | null = inv.due_date || null
        if (status === 'overdue') {
            reminders.push({ id: inv.id, invoiceNumber, clientName, amount, dueDate, type: 'overdue' })
        } else if (
            (status === 'sent' || status === 'pending' || status === 'en_attente') &&
            dueDate && dueDate < todayStr
        ) {
            reminders.push({ id: inv.id, invoiceNumber, clientName, amount, dueDate, type: 'overdue' })
        } else if (status === 'draft') {
            reminders.push({ id: inv.id, invoiceNumber, clientName, amount, dueDate, type: 'pending' })
        }
    }
    return reminders
}

export function bucketExpensesByCategory(expenses: ExpenseRow[]): Record<string, number> {
    const result: Record<string, number> = {}
    for (const exp of expenses) {
        const cat = exp.category || 'Autre'
        result[cat] = (result[cat] || 0) + (Number(exp.amount) || 0)
    }
    return result
}

export function aggregateRevenueByMonth(invoices: InvoiceRow[], keys: string[]): number[] {
    const bucketMap = new Map<string, number>(keys.map((k) => [k, 0]))
    for (const inv of invoices) {
        if ((inv.status || '').toLowerCase() !== 'paid') continue
        const ref = new Date(inv.date || inv.created_at || '')
        if (isNaN(ref.getTime())) continue
        const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`
        if (bucketMap.has(key)) bucketMap.set(key, (bucketMap.get(key) || 0) + (Number(inv.total_ttc) || 0))
    }
    return keys.map((k) => bucketMap.get(k) || 0)
}

export function findTopClients(invoices: InvoiceRow[]): TopClient[] {
    const clientMap = new Map<string, { name: string; revenue: number; invoiceCount: number }>()
    for (const inv of invoices) {
        if ((inv.status || '').toLowerCase() !== 'paid') continue
        const name = inv.client?.name || 'Inconnu'
        const id = inv.client_id || name
        const existing = clientMap.get(id) || { name, revenue: 0, invoiceCount: 0 }
        existing.revenue += Number(inv.total_ttc) || 0
        existing.invoiceCount++
        clientMap.set(id, existing)
    }
    return [...clientMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
}

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

export async function getDashboardStats(): Promise<DashboardData> {
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

    // ── Aggregates ───────────────────────────────────────────
    const totalRevenue = safeInvoices
        .filter((i) => (i.status || '').toLowerCase() === 'paid')
        .reduce((sum, i) => sum + (Number(i.total_ttc) || 0), 0)

    const totalExpenses = safeExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

    const pendingCount = safeInvoices.filter((i) => {
        const s = (i.status || '').toLowerCase()
        return s === 'sent' || s === 'pending' || s === 'en_attente' || s === 'en attente'
    }).length

    // ── Debt summary (weighted progress) ────────────────────
    const debt = aggregateDebt(safeDebts)

    // ── Monthly revenue (paid invoices) ─────────────────────
    const { keys, labels } = buildMonthBuckets(new Date())
    const revenueByMonth = aggregateRevenueByMonth(safeInvoices, keys)

    // ── Monthly expenses ─────────────────────────────────────
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

    // ── Expenses by category ──────────────────────────────────
    const expensesByCategory = bucketExpensesByCategory(safeExpenses)

    // ── Top clients by revenue ────────────────────────────────
    const topClients = findTopClients(safeInvoices)

    // ── Month-over-month growth ───────────────────────────────
    const lastMonthRev = revenueByMonth[revenueByMonth.length - 2] || 0
    const thisMonthRev = revenueByMonth[revenueByMonth.length - 1] || 0
    const momGrowthPct = lastMonthRev > 0
        ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100
        : thisMonthRev > 0 ? 100 : 0

    // ── KPI spec: pending amount, invoices this month, client count ───
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

    // ── Current-year monthly revenue (for BarChart) ───────────
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

    // ── Reminders ────────────────────────────────────────────
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
