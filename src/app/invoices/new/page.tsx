import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Sidebar from '@/components/Sidebar'
import NewInvoiceForm from '@/components/invoices/NewInvoiceForm'

export default async function NewInvoicePage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    // 1. Fetch Clients (for the dropdown)
    const { data: clients } = await supabase.from('clients').select('*').order('name')

    // 2. CALCULATE NEXT NUMBER ("1/26")
    // We count invoices created this year (2026)
    const currentYear = new Date().getFullYear()
    const startOfYear = `${currentYear}-01-01`

    const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .gte('date', startOfYear)

    // Logic: Count + 1 / Year (last 2 digits)
    const nextSequence = (count || 0) + 1
    const yearShort = currentYear.toString().slice(-2)
    const nextNumber = `${nextSequence}/${yearShort}`

    return (
        <div className="bg-background-dark min-h-screen font-sans text-white flex">
            <div className="fixed left-0 top-0 h-screen z-20">
                <Sidebar />
            </div>

            <main className="ml-72 w-full p-8">
                <h1 className="text-3xl font-bold mb-8">NOUVELLE FACTURE</h1>

                {/* Pass the calculated number to the form */}
                <NewInvoiceForm clients={clients || []} nextNumber={nextNumber} />
            </main>
        </div>
    )
}