import React from 'react'
import { notFound } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import PurchaseOrderViewer from '@/components/purchase-orders/PurchaseOrderViewer'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function PurchaseOrderPage({ params }: PageProps) {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const { data: document } = await supabase.from('purchase_orders').select('*, purchase_order_items(*)').eq('id', id).single()
    if (!document) return notFound()

    const { data: client } = await supabase.from('clients').select('*').eq('id', document.client_id).single()

    let { data: dbWorkspace } = await supabase.from('workspaces').select('*').eq('id', document.workspace_id).single()
    if (!dbWorkspace) {
        const { data: defaultWs } = await supabase.from('workspaces').select('*').limit(1).single()
        dbWorkspace = defaultWs || {}
    }

    return (
        <div className="min-h-screen print:bg-white print:min-h-0 print:block">
            <PurchaseOrderViewer document={document} client={client} ws={dbWorkspace} />
        </div>
    )
}