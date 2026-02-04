import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Sidebar from '@/components/Sidebar'
import ExpensesClient from '@/components/expenses/ExpensesClient'

// ⚡ Force dynamic to ensure data is always fresh
export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    // 🚀 PARALLEL FETCHING (The speed fix)
    const [expensesResult, debtsResult] = await Promise.all([
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('debts').select('*').order('due_date', { ascending: true })
    ])

    return (
        <div className="flex min-h-screen bg-[#050505] text-white font-['Inter']">
            {/* Fixed Sidebar */}
            <div className="fixed left-0 top-0 h-screen z-20">
                <Sidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 p-8 ml-72">
                <ExpensesClient
                    initialExpenses={expensesResult.data || []}
                    initialDebts={debtsResult.data || []}
                />
            </main>
        </div>
    )
}