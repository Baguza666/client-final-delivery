import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import Image from 'next/image'
import {
    FileText,
    Mail,
    LayoutDashboard,
    Link2,
    CheckCircle2,
    ArrowRight,
    Zap,
    Shield,
    Globe,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')

    return (
        <div className="min-h-screen bg-[#07070B] text-white overflow-x-hidden">

            {/* ── Nav ── */}
            <header className="fixed top-0 inset-x-0 z-50 h-14 flex items-center px-6 lg:px-12 border-b border-white/[0.06] bg-[#07070B]/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
                    <Image
                        src="/invoicify-logo.png"
                        alt="Invoicify"
                        width={140}
                        height={28}
                        className="h-7 w-auto object-contain"
                        priority
                    />
                    <nav className="hidden md:flex items-center gap-8 text-sm text-white/50">
                        <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Tarifs</a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="text-sm font-semibold text-white/60 hover:text-white transition-colors"
                        >
                            Se connecter
                        </Link>
                        <Link
                            href="/login"
                            className="text-sm font-bold bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl transition-all duration-200 shadow-glow-sm hover:shadow-glow"
                        >
                            Commencer
                        </Link>
                    </div>
                </div>
            </header>

            {/* ── Hero ── */}
            <section className="relative pt-32 pb-24 px-6 lg:px-12 flex flex-col items-center text-center overflow-hidden">
                {/* Glow orbs */}
                <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/[0.07] rounded-full blur-[120px]" />
                <div aria-hidden className="pointer-events-none absolute top-20 left-1/4 w-[300px] h-[300px] bg-accent/[0.05] rounded-full blur-[80px]" />

                <div className="relative max-w-4xl mx-auto">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-4 py-1.5 rounded-full mb-8 tracking-wide">
                        <Zap className="w-3.5 h-3.5" />
                        Facturation Marocaine Moderne · Version 1.0
                    </div>

                    {/* Headline */}
                    <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.05] mb-6">
                        Créez des factures{' '}
                        <span className="text-brand-gradient">professionnelles</span>
                        <br />en quelques secondes
                    </h1>

                    <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Devis, factures, bons de commande et livraison — tout en un.
                        Générez des PDF A4 impeccables et envoyez-les directement par email à vos clients.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/login"
                            className="group inline-flex items-center gap-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-base px-7 py-3.5 rounded-2xl transition-all duration-200 shadow-glow hover:shadow-glow w-full sm:w-auto justify-center"
                        >
                            Commencer gratuitement
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                        <Link
                            href="/view/demo"
                            className="inline-flex items-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.10] hover:border-white/[0.20] text-white/80 hover:text-white font-semibold text-base px-7 py-3.5 rounded-2xl transition-all duration-200 w-full sm:w-auto justify-center"
                        >
                            <FileText className="w-4 h-4" />
                            Voir un exemple
                        </Link>
                    </div>

                    {/* Trust signals */}
                    <div className="flex items-center justify-center gap-6 mt-10 text-xs text-white/30 font-medium">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-status-paid" />Gratuit pour démarrer</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-status-paid" />Aucune carte requise</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-status-paid" />PDF A4 professionnel</span>
                    </div>
                </div>

                {/* Hero mockup */}
                <div className="relative mt-20 max-w-3xl w-full mx-auto">
                    <div aria-hidden className="absolute inset-0 bg-primary/[0.04] blur-3xl rounded-3xl" />
                    <div className="relative bg-white/[0.025] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
                        {/* Mock topbar */}
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                            <div className="flex-1 mx-4 bg-white/[0.04] rounded-md h-5" />
                            <div className="w-16 h-5 bg-primary/20 rounded-md" />
                        </div>
                        {/* Mock invoice card */}
                        <div className="p-6 sm:p-10 bg-white text-zinc-900 text-left">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="h-8 w-32 bg-zinc-100 rounded mb-2" />
                                    <div className="h-3 w-24 bg-zinc-100 rounded" />
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-extrabold text-zinc-900 tracking-tight">FACTURE</p>
                                    <p className="text-sm font-bold text-primary mt-1">N° INV-2024-0042</p>
                                </div>
                            </div>
                            <div className="flex gap-10 mb-8 text-sm">
                                <div>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Émetteur</p>
                                    <p className="font-bold text-zinc-900">Ma Société SARL</p>
                                    <p className="text-zinc-500">123 Rue Hassan II, Casablanca</p>
                                    <p className="text-zinc-500">ICE: 000123456789012</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Facturé à</p>
                                    <p className="font-bold text-zinc-900">Client Premium SAS</p>
                                    <p className="text-zinc-500">45 Avenue Mohammed V</p>
                                    <p className="text-zinc-500">Rabat, Maroc</p>
                                </div>
                            </div>
                            <table className="w-full text-xs mb-6">
                                <thead><tr className="border-b-2 border-zinc-800">
                                    <th className="text-left pb-2 font-bold text-zinc-600 text-[9px] uppercase tracking-wider">Description</th>
                                    <th className="text-right pb-2 font-bold text-zinc-600 text-[9px] uppercase tracking-wider">Qté</th>
                                    <th className="text-right pb-2 font-bold text-zinc-600 text-[9px] uppercase tracking-wider">Prix Unit.</th>
                                    <th className="text-right pb-2 font-bold text-zinc-600 text-[9px] uppercase tracking-wider">Total HT</th>
                                </tr></thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {[
                                        ['Développement application web', '1', '15 000,00', '15 000,00'],
                                        ['Maintenance mensuelle (3 mois)', '3', '2 500,00', '7 500,00'],
                                        ['Formation & accompagnement', '2', '1 800,00', '3 600,00'],
                                    ].map(([desc, qty, unit, total]) => (
                                        <tr key={desc}>
                                            <td className="py-2 font-medium text-zinc-800">{desc}</td>
                                            <td className="py-2 text-right text-zinc-500 font-mono">{qty}</td>
                                            <td className="py-2 text-right text-zinc-500 font-mono">{unit} DH</td>
                                            <td className="py-2 text-right font-bold text-zinc-900 font-mono">{total} DH</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="flex justify-end">
                                <div className="space-y-1 w-48 text-xs">
                                    <div className="flex justify-between text-zinc-500"><span>Total HT</span><span className="font-mono">26 100,00 DH</span></div>
                                    <div className="flex justify-between text-zinc-500 pb-1 border-b border-zinc-200"><span>TVA 20%</span><span className="font-mono">5 220,00 DH</span></div>
                                    <div className="flex justify-between font-extrabold text-zinc-900 text-sm pt-1"><span>Total TTC</span><span className="font-mono text-primary">31 320,00 DH</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Floating status badge */}
                    <div className="absolute -top-3 -right-3 sm:-right-8 bg-status-paid text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        PDF généré — 0.8s
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section id="features" className="relative py-24 px-6 lg:px-12">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-3">Fonctionnalités</p>
                        <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            Tout ce dont vous avez besoin
                        </h2>
                        <p className="text-white/40 mt-3 max-w-xl mx-auto text-base">
                            Une suite complète pour gérer votre activité commerciale, de l&apos;offre à la livraison.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[
                            {
                                icon: FileText,
                                color: 'text-primary bg-primary/10 border-primary/20',
                                title: 'Génération PDF A4',
                                desc: 'Factures, devis, BL et BC — exportés en PDF A4 impeccable en moins d\'une seconde.',
                            },
                            {
                                icon: Mail,
                                color: 'text-accent bg-accent/10 border-accent/20',
                                title: 'Envoi direct par email',
                                desc: 'Envoyez la facture avec PDF en pièce jointe directement depuis l\'application.',
                            },
                            {
                                icon: LayoutDashboard,
                                color: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
                                title: 'Tableau de bord',
                                desc: 'Visualisez votre chiffre d\'affaires, dépenses et trésorerie en temps réel.',
                            },
                            {
                                icon: Link2,
                                color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                                title: 'Liens de partage sécurisés',
                                desc: 'Partagez vos factures via un lien unique. Vos clients peuvent consulter et télécharger le PDF.',
                            },
                        ].map(({ icon: Icon, color, title, desc }) => (
                            <div
                                key={title}
                                className="group bg-white/[0.025] hover:bg-white/[0.045] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 transition-all duration-200"
                            >
                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-110 ${color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <h3 className="font-heading font-bold text-white text-base mb-2">{title}</h3>
                                <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Secondary features row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                        {[
                            { icon: Shield, title: 'Données sécurisées', desc: 'Hébergement cloud sécurisé avec chiffrement des données. Vos factures sont protégées.' },
                            { icon: Globe, title: 'Multi-devises', desc: 'Facturation en MAD, EUR, USD et autres devises avec taux de change configurables.' },
                            { icon: Zap, title: 'Rapide & Réactif', desc: 'Interface fluide et rapide. Créez une facture complète en moins de 2 minutes.' },
                        ].map(({ icon: Icon, title, desc }) => (
                            <div
                                key={title}
                                className="group bg-white/[0.015] hover:bg-white/[0.035] border border-white/[0.04] hover:border-white/[0.10] rounded-2xl p-6 transition-all duration-200 flex gap-4"
                            >
                                <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                                    <Icon className="w-4 h-4 text-white/60" />
                                </div>
                                <div>
                                    <h3 className="font-heading font-bold text-white text-sm mb-1">{title}</h3>
                                    <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Band ── */}
            <section id="pricing" className="py-24 px-6 lg:px-12">
                <div className="max-w-3xl mx-auto text-center relative">
                    <div aria-hidden className="pointer-events-none absolute inset-0 bg-primary/[0.06] blur-3xl rounded-full" />
                    <div className="relative bg-white/[0.025] border border-white/[0.08] rounded-3xl p-12 md:p-16">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">Commencez dès aujourd&apos;hui</p>
                        <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
                            Prêt à facturer comme un pro ?
                        </h2>
                        <p className="text-white/40 mb-8 text-base">
                            Créez votre compte gratuitement et émettez votre première facture en quelques minutes.
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-base px-8 py-4 rounded-2xl transition-all duration-200 shadow-glow hover:shadow-glow group"
                        >
                            Créer un compte gratuit
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="border-t border-white/[0.06] py-10 px-6 lg:px-12">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <Image
                        src="/invoicify-logo.png"
                        alt="Invoicify"
                        width={120}
                        height={24}
                        className="h-6 w-auto object-contain opacity-70"
                    />
                    <p className="text-xs text-white/25">
                        © {new Date().getFullYear()} Invoicify. Tous droits réservés.
                    </p>
                    <div className="flex items-center gap-6 text-xs text-white/30">
                        <Link href="/login" className="hover:text-white/60 transition-colors">Connexion</Link>
                        <Link href="/unauthorized" className="hover:text-white/60 transition-colors">Mentions légales</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
