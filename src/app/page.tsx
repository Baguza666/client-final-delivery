import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
    CheckCircle2,
    Lock,
    Clock,
    PhoneCall,
    Vote,
    BookOpen,
    ArrowRight,
} from 'lucide-react'
import { daysUntilLaunch, formattedLaunchDate } from '@/lib/launch-date'
import { getWishlistCount } from '@/lib/wishlist-helpers'
import WishlistForm from '@/components/wishlist/WishlistForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
    title: 'Invoicify — Bloquez votre tarif fondateur à vie · Lancement le 28 mai 2026',
    description:
        'Devis, BC, BL et factures conformes (ICE, IF, RC, CNSS) en un seul outil. Inscrivez-vous à la liste d\'attente et bloquez 50% de réduction sur le tarif Pro tant que votre compte reste actif.',
    openGraph: {
        title: 'Invoicify — Bloquez votre tarif fondateur. À vie.',
        description:
            'Devis, BC, BL et factures conformes ICE/IF/RC/CNSS. Bloquez 50% de réduction sur le tarif Pro à vie.',
        images: ['/api/og'],
        type: 'website',
        locale: 'fr_FR',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Invoicify — Bloquez votre tarif fondateur. À vie.',
        description:
            'Devis, BC, BL et factures conformes ICE/IF/RC/CNSS. Bloquez 50% de réduction sur le tarif Pro à vie.',
        images: ['/api/og'],
    },
}

export default async function WishlistLanding() {
    const [days, count] = await Promise.all([
        Promise.resolve(daysUntilLaunch()),
        getWishlistCount(),
    ])
    const launchDate = formattedLaunchDate()
    const progressPct = Math.min(100, (count / 100) * 100)
    const showCallVariant = count < 30

    return (
        <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden">
            {/* Nav */}
            <header className="fixed top-0 inset-x-0 z-50 h-14 flex items-center px-6 lg:px-12 border-b border-white/[0.06] bg-[#020617]/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
                    <Image
                        src="/invoicify-logo.png"
                        alt="Invoicify"
                        width={140}
                        height={28}
                        className="h-7 w-auto object-contain"
                        priority
                    />
                    <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/[0.12] px-3.5 py-1.5 text-xs font-bold text-accent">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                        </span>
                        Lancement dans {days} jours
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative pt-32 pb-24 px-6 lg:px-12 flex flex-col items-center text-center overflow-hidden">
                <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-primary/[0.10] rounded-full blur-[140px]" />
                <div aria-hidden className="pointer-events-none absolute top-32 left-1/4 w-[400px] h-[400px] bg-accent/[0.08] rounded-full blur-[100px]" />

                <div className="relative max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.10] px-4 py-1.5 mb-8 text-xs font-bold tracking-wide text-primary">
                        🇲🇦 Pour les entrepreneurs marocains — tarif fondateur à vie
                    </div>

                    <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.05] mb-6">
                        Bloquez votre tarif fondateur.{' '}
                        <span className="text-brand-gradient italic">À vie.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Devis, BC, BL et factures conformes (ICE, IF, RC, CNSS) en un seul outil. Inscrivez-vous
                        maintenant — payez le tarif du jour 1, tant que votre compte reste actif. Même dans 5 ans.
                    </p>

                    <div className="mx-auto max-w-xl">
                        <WishlistForm source="hero" />
                    </div>

                    <p className="mt-3 text-xs text-white/35 max-w-xl mx-auto leading-relaxed">
                        En vous inscrivant, vous acceptez de recevoir un email de confirmation et notre lien d&apos;accès le
                        jour du lancement. Aucun spam.{' '}
                        <Link href="/mentions-legales" className="underline underline-offset-2 hover:text-white/60">
                            Mentions légales
                        </Link>
                        .
                    </p>

                    <div className="flex items-center justify-center gap-6 mt-6 text-xs text-white/40 font-medium">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-status-paid" />30 secondes</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-status-paid" />Sans carte</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-status-paid" />Sans engagement</span>
                    </div>

                    {/* Counter */}
                    <div className="mt-10 mx-auto max-w-md">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                                className="h-full rounded-full bg-brand-gradient transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        <p className="mt-3 text-sm text-white/55">
                            <span className="font-bold text-white">{count}</span> entrepreneurs déjà inscrits — places limitées au lancement
                        </p>
                    </div>
                </div>
            </section>

            {/* Problem */}
            <section className="relative py-24 px-6 lg:px-12">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-3">Le problème</p>
                        <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                            Word, Excel, papier. Et chaque devis prend 20 minutes.
                        </h2>
                        <p className="text-white/55 leading-relaxed mb-4">
                            Les relances passent à la trappe. Vous ne savez jamais qui vous doit combien — ni quand. La
                            conformité ICE, IF, RC, CNSS se gère à la main, à chaque fois.
                        </p>
                        <p className="text-white/80 font-semibold leading-relaxed mb-8">
                            Invoicify remplace tout ça. Une chaîne, un tableau de bord, zéro double-saisie.
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
                            {['Devis', 'BC', 'BL', 'Facture', 'Paiement'].map((step, i) => (
                                <span key={step} className="flex items-center gap-2">
                                    <span className="rounded-full border border-primary/30 bg-primary/[0.10] px-3 py-1.5 text-primary">
                                        {step}
                                    </span>
                                    {i < 4 ? <span className="text-white/30">→</span> : null}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div aria-hidden className="absolute inset-0 bg-primary/[0.05] blur-3xl rounded-3xl" />
                        <div className="relative bg-white/[0.025] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
                            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                                <div className="flex-1 mx-4 bg-white/[0.04] rounded-md h-5" />
                            </div>
                            <div className="p-6 sm:p-10 bg-white text-zinc-900 text-left">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="h-8 w-32 bg-zinc-100 rounded mb-2" />
                                        <div className="h-3 w-24 bg-zinc-100 rounded" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-extrabold text-zinc-900 tracking-tight">FACTURE</p>
                                        <p className="text-sm font-bold text-primary mt-1">N° INV-2026-0042</p>
                                    </div>
                                </div>
                                <div className="flex gap-10 mb-6 text-sm">
                                    <div>
                                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Émetteur</p>
                                        <p className="font-bold text-zinc-900">Atlas Trading SARL</p>
                                        <p className="text-zinc-500">123 Rue Hassan II, Casablanca</p>
                                        <p className="text-zinc-500">ICE: 002647389000058</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Facturé à</p>
                                        <p className="font-bold text-zinc-900">Rabat Logistics SAS</p>
                                        <p className="text-zinc-500">45 Avenue Mohammed V</p>
                                        <p className="text-zinc-500">Rabat, Maroc</p>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <div className="space-y-1 w-48 text-xs">
                                        <div className="flex justify-between text-zinc-500"><span>Total HT</span><span className="font-mono">26 100,00 DH</span></div>
                                        <div className="flex justify-between text-zinc-500 pb-1 border-b border-zinc-200"><span>TVA 20%</span><span className="font-mono">5 220,00 DH</span></div>
                                        <div className="flex justify-between font-extrabold text-zinc-900 text-sm pt-1"><span>Total TTC</span><span className="font-mono text-primary">31 320,00 DH</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -top-3 -right-3 sm:-right-8 bg-status-paid text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            PDF généré — 0.8s
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="relative py-24 px-6 lg:px-12">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-3">Ce que vous obtenez</p>
                        <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
                            Quatre raisons de vous inscrire aujourd&apos;hui.
                        </h2>
                        <p className="text-white/45 max-w-xl mx-auto">
                            Réservé aux inscrits avant le jour du lancement. Pas après.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Card 01 */}
                        <BenefitCard
                            number="01"
                            icon={Lock}
                            title="Tarif fondateur, gelé à vie."
                            body="Vous bénéficiez de 50% de réduction sur le tarif Pro, tant que votre abonnement reste actif. Pas d'augmentation. Pas de petites lignes."
                        />
                        {/* Card 02 */}
                        <BenefitCard
                            number="02"
                            icon={Clock}
                            title="48h d'avance sur tout le monde."
                            body="Vous recevez votre lien d'accès avant l'ouverture publique. Configurez votre workspace pendant que les autres attendent."
                        />
                        {/* Card 03 — tiered */}
                        {showCallVariant ? (
                            <BenefitCard
                                number="03"
                                icon={PhoneCall}
                                title="On configure votre compte avec vous."
                                body="Logo, ICE, SMTP, premier devis. Un appel de 20 minutes — réservé aux 30 premiers inscrits. Vous facturez le jour même."
                                highlight
                            />
                        ) : (
                            <BenefitCard
                                number="03"
                                icon={BookOpen}
                                title="Onboarding guidé en autonomie."
                                body="Guide pas-à-pas pour configurer logo, ICE, SMTP et premier devis en 20 minutes. Support prioritaire les 30 premiers jours."
                            />
                        )}
                        {/* Card 04 */}
                        <BenefitCard
                            number="04"
                            icon={Vote}
                            title="Vous votez sur les prochaines fonctionnalités."
                            body="Les inscrits choisissent les 3 prochaines features. Vous construisez l'outil avec nous."
                        />
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 px-6 lg:px-12">
                <div className="max-w-3xl mx-auto text-center relative">
                    <div aria-hidden className="pointer-events-none absolute inset-0 bg-primary/[0.08] blur-3xl rounded-full" />
                    <div className="relative bg-white/[0.025] border border-white/[0.08] rounded-3xl p-10 md:p-16 shadow-glow">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-3">Dernière étape</p>
                        <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-8">
                            Une seule action. Tarif gelé à vie.
                        </h2>

                        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-10">
                            <Stat value={String(days)} label="jours avant le lancement" />
                            <Stat value={String(count)} label="entrepreneurs déjà inscrits" />
                            <Stat value="∞" label="votre tarif, à vie" />
                        </div>

                        <WishlistForm source="final-cta" variant="final" />

                        <p className="mt-4 text-xs text-white/40 flex items-center justify-center gap-4">
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-status-paid" />Lien d&apos;accès envoyé le jour J</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-status-paid" />Aucun spam</span>
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/[0.06] py-10 px-6 lg:px-12">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/35">
                    <p>© 2026 Invoicify · Facturation marocaine moderne</p>
                    <div className="flex items-center gap-6">
                        <Link href="/mentions-legales" className="hover:text-white/70 transition-colors">Mentions légales</Link>
                        <a href="mailto:hello@invoicify.ma" className="hover:text-white/70 transition-colors">Contact</a>
                    </div>
                </div>
                <p className="sr-only">Lancement prévu le {launchDate}.</p>
            </footer>
        </div>
    )
}

type BenefitCardProps = {
    number: string
    icon: React.ComponentType<{ className?: string }>
    title: string
    body: string
    highlight?: boolean
}

function BenefitCard({ number, icon: Icon, title, body, highlight = false }: BenefitCardProps) {
    return (
        <div
            className={`group relative rounded-2xl border p-7 transition-all duration-200 ${
                highlight
                    ? 'border-primary/40 bg-primary/[0.06] hover:bg-primary/[0.10] shadow-glow-sm'
                    : 'border-white/[0.06] bg-white/[0.025] hover:border-white/[0.14] hover:bg-white/[0.04]'
            }`}
        >
            <div className="flex items-center justify-between mb-5">
                <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                        highlight
                            ? 'border-primary/40 bg-primary/[0.15] text-primary'
                            : 'border-white/[0.08] bg-white/[0.04] text-white/70'
                    }`}
                >
                    <Icon className="h-5 w-5" />
                </div>
                <span className="font-mono text-xs font-bold tracking-wider text-white/25">{number}</span>
            </div>
            <h3 className="font-heading text-lg font-bold text-white mb-2 leading-snug">{title}</h3>
            <p className="text-sm text-white/55 leading-relaxed">{body}</p>
        </div>
    )
}

function Stat({ value, label }: { value: string; label: string }) {
    return (
        <div>
            <div className="font-heading text-4xl md:text-5xl font-extrabold text-brand-gradient leading-none mb-2">
                {value}
            </div>
            <div className="text-[11px] text-white/40 uppercase tracking-wide leading-tight">{label}</div>
        </div>
    )
}
