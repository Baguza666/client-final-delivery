import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ReconciliationClient from '@/components/reconciliation/ReconciliationClient'

async function getInvoices() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } },
    )
    const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_ttc, date, status, client:clients(name)')
        .order('date', { ascending: false })
    return (data || []).map((inv: any) => ({
        id: inv.id,
        number: inv.invoice_number || 'BROUILLON',
        clientName: inv.client?.name || '',
        total: Number(inv.total_ttc) || 0,
        date: inv.date || '',
        status: inv.status || 'draft',
    }))
}

export default async function ReconciliationPage() {
    const invoices = await getInvoices()
    return <ReconciliationClient invoices={invoices} />
}
