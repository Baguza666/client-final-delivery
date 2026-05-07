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
    progressPct: number
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
    revenueByMonth: number[]
    expensesByMonth: number[]
    monthLabels: string[]
    expensesByCategory: Record<string, number>
    topClients: TopClient[]
    momGrowthPct: number
    hasAnyData: boolean
    pendingAmount: number
    invoicesThisMonth: number
    clientCount: number
    revenueByYear: MonthBar[]
    reminders: Reminder[]
}

export type InvoiceRow = {
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

export type ExpenseRow = {
    amount: string | number | null
    date?: string | null
    created_at?: string | null
    category?: string | null
}

export type DebtRow = {
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
