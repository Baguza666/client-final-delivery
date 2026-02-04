import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import QuoteBuilder from '@/components/quotes/QuoteBuilder'

export default async function NewQuotePage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    // 1. Fetch Clients
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .order('name')

    // 2. Fetch Products
    const { data: products } = await supabase
        .from('products')
        .select('id, name, price, description')
        .order('name')

    return (
        <div className="bg-zinc-950 min-h-screen font-sans text-white flex justify-center p-12">
            <div className="w-full max-w-5xl">
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/quotes" className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Nouveau Devis</h1>
                        <p className="text-zinc-500 text-sm mt-1">Éditeur avancé</p>
                    </div>
                </div>

                {/* 👇 FIXED: Changed 'initialProducts' to 'products' */}
                <QuoteBuilder
                    clients={clients || []}
                    products={products || []}
                />
            </div>
        </div>
    )
}