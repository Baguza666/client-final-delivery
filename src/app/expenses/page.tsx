import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ExpensesClient from '@/components/expenses/ExpensesClient'
import { getOrCreateWorkspace } from '@/lib/workspace'

// ⚡ Force dynamic to ensure data is always fresh
export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const workspaceId = user ? await getOrCreateWorkspace(supabase, user.id) : null

    const [expensesResult, debtsResult] = await Promise.all([
        workspaceId
            ? supabase.from('expenses').select('*').eq('workspace_id', workspaceId).order('date', { ascending: false })
            : supabase.from('expenses').select('*').order('date', { ascending: false }),
        workspaceId
            ? supabase.from('debts').select('*').eq('workspace_id', workspaceId).order('due_date', { ascending: true })
            : supabase.from('debts').select('*').order('due_date', { ascending: true }),
    ])

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            <ExpensesClient
                initialExpenses={expensesResult.data || []}
                initialDebts={debtsResult.data || []}
                workspaceId={workspaceId}
            />
        </main>
    )
}