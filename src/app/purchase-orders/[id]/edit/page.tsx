import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import EditPurchaseOrderForm from '@/components/purchase-orders/EditPurchaseOrderForm'

export default async function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    // 1. Fetch PO with Items
    const { data: document } = await supabase
        .from('purchase_orders')
        .select('*, purchase_order_items(*)')
        .eq('id', id)
        .single()

    // 2. Fetch Clients (for the dropdown)
    const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .order('name')

    if (!document) return notFound()

    return (
        <div className="bg-black min-h-screen font-['Inter'] text-white flex">
            {/* Sidebar */}
            <div className="fixed left-0 top-0 h-screen z-20 hidden md:block">
                <Sidebar />
            </div>

            {/* Main Content */}
            <main className="md:ml-72 w-full p-8 md:p-12">
                <div className="max-w-5xl mx-auto mb-8">
                    <h1 className="text-3xl font-bold mb-2">Modifier le Bon de Commande</h1>
                    <p className="text-zinc-500 font-mono text-sm">#{document.number}</p>
                </div>
                <EditPurchaseOrderForm document={document} clients={clients || []} />
            </main>
        </div>
    )
}