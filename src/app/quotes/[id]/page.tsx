import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import QuoteViewer from '@/components/quotes/QuoteViewer'

export const dynamic = 'force-dynamic'

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const { data: quote } = await supabase
        .from('quotes')
        .select('*, client:clients(*), quote_items(*), workspace:workspaces(*)')
        .eq('id', id)
        .single()

    if (!quote) return notFound()

    let baseWorkspace = quote.workspace;
    if (!baseWorkspace) {
        const { data: defaultWs } = await supabase.from('workspaces').select('*').limit(1).single();
        baseWorkspace = defaultWs || {};
    }

    return (
        <div className="bg-zinc-950 min-h-screen font-sans text-white print:bg-white print:min-h-0 print:block">
            <QuoteViewer document={quote} client={quote.client} ws={baseWorkspace} />
        </div>
    )
}