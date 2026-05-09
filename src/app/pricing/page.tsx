import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import PricingTable from '@/components/billing/PricingTable'
import Faq from '@/components/billing/Faq'

export const metadata = {
    title: 'Tarifs · Invoicify',
    description: 'Facturation simple pour les auto-entrepreneurs et PME marocaines. À partir de 99 MAD/mois. Garantie 30 jours.',
}

interface PricingSearchParams {
    wl?: string
    plan?: string
    cadence?: string
    from?: string
}

async function detectFoundingCustomer(searchParams: PricingSearchParams): Promise<{
    isFounding: boolean
    firstName: string | null
}> {
    const cookieStore = await cookies()
    const wlToken = searchParams.wl ?? cookieStore.get('wl_token')?.value
    if (!wlToken) return { isFounding: false, firstName: null }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } },
    )

    const { data } = await supabase
        .from('wishlist_signups')
        .select('name, email')
        .eq('email', wlToken)
        .maybeSingle<{ name: string | null; email: string }>()

    if (!data) return { isFounding: false, firstName: null }
    return { isFounding: true, firstName: data.name }
}

export default async function PricingPage({
    searchParams,
}: {
    searchParams: Promise<PricingSearchParams>
}) {
    const params = await searchParams
    const { isFounding, firstName } = await detectFoundingCustomer(params)

    return (
        <main className="min-h-screen bg-black text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                {/* Hero */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
                        Tarification simple, sans surprise
                    </h1>
                    <p className="text-lg text-white/60 max-w-2xl mx-auto">
                        Facturation conforme DGI 2026 pour les auto-entrepreneurs et PME marocaines.
                        Annulez à tout moment · 30 jours satisfait ou remboursé.
                    </p>
                </div>

                {/* Wishlist banner */}
                {isFounding && (
                    <div className="max-w-3xl mx-auto mb-12 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
                        <p className="text-2xl mb-2">🎉</p>
                        <p className="text-lg font-bold text-emerald-200">
                            Bienvenue{firstName ? ` ${firstName}` : ''} · Votre code{' '}
                            <code className="rounded bg-black/40 px-2 py-0.5 text-emerald-300">FOUNDER30</code>{' '}
                            est prêt
                        </p>
                        <p className="text-sm text-emerald-200/80 mt-2">
                            <strong>30% à vie</strong> sur Pro ou Business — code valable 90 jours après le lancement.
                            Le code sera appliqué automatiquement à la caisse.
                        </p>
                    </div>
                )}

                {/* Pricing table */}
                <PricingTable
                    defaultCadence={params.cadence === 'annual' ? 'annual' : 'monthly'}
                    foundingDiscount={isFounding}
                    ctaTarget="signup"
                />

                {/* Disclosures */}
                <div className="max-w-2xl mx-auto mt-12 space-y-3 text-center text-xs text-white/40">
                    <p>
                        Tarifs hors taxes (TVA non applicable, article 91 du CGI - statut auto-entrepreneur).
                    </p>
                    <p>
                        Paiement traité par Lemon Squeezy (Merchant of Record). Pour les cartes marocaines,
                        des frais bancaires de change peuvent s&apos;appliquer selon votre banque.
                    </p>
                    <p>
                        <strong className="text-white/60">Support en français · WhatsApp et email · Réponse sous 24h.</strong>
                    </p>
                </div>

                {/* FAQ */}
                <div className="mt-24">
                    <Faq />
                </div>

                {/* Footer CTA */}
                <div className="mt-24 text-center">
                    <p className="text-white/60 mb-4">Une question avant de vous abonner ?</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                            href="https://wa.me/212600000000"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-5 py-3 font-medium hover:bg-emerald-500/20 transition"
                        >
                            <span className="material-symbols-outlined">chat</span>
                            WhatsApp +212 6 00 00 00 00
                        </a>
                        <a
                            href="mailto:support@invoicify.ma"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 text-white px-5 py-3 font-medium hover:bg-white/10 transition"
                        >
                            <span className="material-symbols-outlined">mail</span>
                            support@invoicify.ma
                        </a>
                    </div>
                </div>
            </div>
        </main>
    )
}
