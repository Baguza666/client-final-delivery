import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import QuoteBuilder from '@/components/quotes/QuoteBuilder'
import { getOrCreateWorkspace } from '@/lib/workspace'

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const workspaceId = user ? await getOrCreateWorkspace(supabase, user.id) : ''

    const { data: products } = await supabase
        .from('products')
        .select('id, name, description, price, unit, base_currency')
        .eq('workspace_id', workspaceId)
        .order('name')

    return (
        <div className="w-full min-h-screen">
            <QuoteBuilder quoteId={id} products={products || []} />
        </div>
    )
}
