import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import InvoiceBuilder from '@/components/invoices/InvoiceBuilder'
import { getOrCreateWorkspace } from '@/lib/workspace'

export default async function NewInvoicePage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const workspaceId = user ? await getOrCreateWorkspace(supabase, user.id) : ''

    const [{ data: clients }, { data: products }] = await Promise.all([
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('products')
            .select('id, name, description, price, unit, base_currency')
            .eq('workspace_id', workspaceId)
            .order('name'),
    ])

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            <header className="mb-8 max-w-5xl mx-auto">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">Facturation</p>
                <h1 className="text-2xl md:text-3xl font-[800] tracking-tight text-white">Nouvelle Facture</h1>
            </header>
            <Suspense>
                <InvoiceBuilder clients={clients || []} products={products || []} />
            </Suspense>
        </main>
    )
}
