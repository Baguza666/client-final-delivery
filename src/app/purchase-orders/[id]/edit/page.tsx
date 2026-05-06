import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import EditPurchaseOrderForm from '@/components/purchase-orders/EditPurchaseOrderForm'
import { getOrCreateWorkspace } from '@/lib/workspace'

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

    const { data: { user } } = await supabase.auth.getUser()
    const workspaceId = user ? await getOrCreateWorkspace(supabase, user.id) : ''

    const [{ data: clients }, { data: products }] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('products').select('id, name, description, price, unit')
            .eq('workspace_id', workspaceId).order('name'),
    ])

    if (!document) return notFound()

    return (
        <div className="min-h-screen flex">
            <main className="px-4 sm:px-6 lg:px-8 py-6 md:py-8 w-full">
                <div className="max-w-5xl mx-auto mb-8">
                    <h1 className="text-3xl font-bold mb-2">Modifier le Bon de Commande</h1>
                    <p className="text-zinc-500 font-mono text-sm">#{document.number}</p>
                </div>
                <EditPurchaseOrderForm document={document} clients={clients || []} products={products || []} />
            </main>
        </div>
    )
}