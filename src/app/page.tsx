import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import DashboardUI from '@/components/dashboard/DashboardUI'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )

  // 1. Fetch ALL Data
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, client:clients(name)')
    .order('created_at', { ascending: false })

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })

  // 👇 FIX: Fetch ALL debts, don't filter by 'status' yet
  const { data: debts } = await supabase
    .from('debts')
    .select('*')

  // --- CALCULATIONS ---
  const safeInvoices = invoices || []
  const safeExpenses = expenses || []
  const safeDebts = debts || []

  // A. Revenue
  const totalRevenue = safeInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, item) => sum + Number(item.total_ttc || 0), 0)

  // B. Expenses
  const totalExpenses = safeExpenses
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  // C. Debt (THE FIX 🔧)
  // We sum up anything where remaining_amount > 0. Simple and robust.
  const totalDebt = safeDebts
    .filter(d => d.remaining_amount > 0)
    .reduce((sum, item) => sum + Number(item.remaining_amount || 0), 0)

  // D. Pending Count
  const pendingCount = safeInvoices.filter(i => {
    const s = (i.status || '').toLowerCase()
    return ['sent', 'pending', 'en_attente', 'en attente'].includes(s)
  }).length

  const stats = {
    revenue: totalRevenue,
    expenses: totalExpenses,
    treasury: totalRevenue - totalExpenses,
    pending: pendingCount,
    debt: totalDebt
  }

  return (
    <DashboardUI
      stats={stats}
      recentExpenses={safeExpenses.slice(0, 5)}
      recentTransactions={safeInvoices.slice(0, 5)}
    />
  )
}