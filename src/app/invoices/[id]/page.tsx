import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import InvoiceViewer from '@/components/invoices/InvoiceViewer'
import PaymentLedger from '@/components/invoices/PaymentLedger'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const [{ data: invoice }, { data: payments }] = await Promise.all([
        supabase
            .from('invoices')
            .select('*, client:clients(*), invoice_items(*), workspace:workspaces(*)')
            .eq('id', id)
            .single(),
        supabase
            .from('payments')
            .select('*')
            .eq('invoice_id', id)
            .order('payment_date', { ascending: false }),
    ])

    if (!invoice) return notFound()

    let baseWorkspace = invoice.workspace;
    if (!baseWorkspace) {
        const { data: defaultWs } = await supabase.from('workspaces').select('*').limit(1).single();
        baseWorkspace = defaultWs || {};
    }

    const items = invoice.invoice_items || []
    const totalHT = items.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0)
    const discount = invoice.discount || 0
    const netHT = totalHT * (1 - discount / 100)
    const totalTTC = invoice.total_ttc || (netHT * 1.20)

    return (
        <div className="bg-zinc-950 min-h-screen font-sans text-white print:bg-white print:min-h-0 print:block">
            <InvoiceViewer invoice={invoice} client={invoice.client} ws={baseWorkspace} />
            <PaymentLedger
                invoiceId={id}
                totalTTC={totalTTC}
                payments={payments || []}
            />
        </div>
    )
}