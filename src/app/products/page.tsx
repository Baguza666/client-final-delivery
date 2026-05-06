import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ProductManager from '@/components/products/ProductManager'
import { getOrCreateWorkspace } from '@/lib/workspace'

export default async function ProductsPage() {
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
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name')

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">
                        Catalogue
                    </p>
                    <h1 className="text-2xl md:text-3xl font-[800] tracking-tight text-white">
                        Produits & Services
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        Gérez votre catalogue pour accélérer la création de documents.
                    </p>
                </div>
            </header>

            <ProductManager products={products || []} workspaceId={workspaceId} />
        </main>
    )
}
