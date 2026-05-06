import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ReportsPageClient from '@/components/reports/ReportsPageClient'

export const dynamic = 'force-dynamic'

async function getData() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } },
    )

    const [{ data: invoices }, { data: expenses }] = await Promise.all([
        supabase
            .from('invoices')
            .select('*, client:clients(name, email), invoice_items(*)')
            .order('date', { ascending: false }),
        supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false }),
    ])

    return { invoices: invoices || [], expenses: expenses || [] }
}

export default async function ReportsPage() {
    const { invoices, expenses } = await getData()
    return <ReportsPageClient invoices={invoices} expenses={expenses} />
}
