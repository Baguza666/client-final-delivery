'use client'

import Link from 'next/link'

const STEPS = [
    {
        icon: 'groups',
        title: '1. Ajoutez vos clients',
        description: 'Construisez votre carnet d’adresses pour gagner du temps sur chaque document.',
        href: '/clients',
        cta: 'Ajouter un client',
    },
    {
        icon: 'description',
        title: '2. Créez un devis',
        description: 'Préparez vos propositions commerciales et envoyez-les en un clic.',
        href: '/quotes/new',
        cta: 'Nouveau devis',
    },
    {
        icon: 'receipt_long',
        title: '3. Émettez vos factures',
        description: 'Convertissez un devis accepté ou créez une facture directement.',
        href: '/invoices/new',
        cta: 'Nouvelle facture',
    },
]

export default function OnboardingPanel() {
    return (
        <section className="relative bg-white/[0.018] border border-white/[0.05] rounded-[2rem] p-8 md:p-10 overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -mr-20 -mt-20" />

            <div className="relative">
                <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-2">Bienvenue sur Invoicify</p>
                <h2 className="text-2xl md:text-3xl font-[800] text-white mb-2">Démarrez en trois étapes</h2>
                <p className="text-zinc-400 max-w-xl text-sm">
                    Votre tableau de bord se remplira automatiquement dès que vous aurez créé votre premier client et facturé.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    {STEPS.map((step) => (
                        <Link
                            key={step.title}
                            href={step.href}
                            className="group flex flex-col bg-zinc-950/50 border border-zinc-800 hover:border-primary/40 hover:bg-zinc-900 rounded-2xl p-6 transition-all"
                        >
                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                                <span className="material-symbols-outlined">{step.icon}</span>
                            </div>
                            <h3 className="font-bold text-white text-sm mb-1">{step.title}</h3>
                            <p className="text-zinc-500 text-xs leading-relaxed mb-4">{step.description}</p>
                            <span className="mt-auto text-[11px] uppercase tracking-wider font-bold text-primary group-hover:text-accent transition-colors flex items-center gap-1">
                                {step.cta}
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}
