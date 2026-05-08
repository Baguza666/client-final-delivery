'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TIERS, annualSavingsMad, type Tier } from '@/lib/tiers'

interface PricingTableProps {
    /** Default to 'monthly' — annual is the secondary CTA. */
    defaultCadence?: 'monthly' | 'annual'
    /** Optional founding-customer indicator (renders -30% strike-through and FOUNDER30 hint). */
    foundingDiscount?: boolean
    /** Whether all CTAs should link to /signup (anonymous) or to checkout (authenticated /upgrade). */
    ctaTarget?: 'signup' | 'upgrade'
    /** Highlights one tier as the primary CTA. */
    recommendedTier?: Tier
    onUpgradeClick?: (tier: Tier, cadence: 'monthly' | 'annual') => void
}

const FEATURE_ROWS: { label: string; key: 'invoices' | 'quotes' | 'expenses' | 'reports' | 'ai' | 'tva' | 'export' | 'watermark' | 'support' | 'team' }[] = [
    { label: 'Factures par mois', key: 'invoices' },
    { label: 'Devis, bons de commande, livraison', key: 'quotes' },
    { label: 'Dépenses & rapprochement', key: 'expenses' },
    { label: 'Rapports financiers', key: 'reports' },
    { label: 'Assistant IA', key: 'ai' },
    { label: 'Filigrane retiré', key: 'watermark' },
    { label: 'Préparation TVA', key: 'tva' },
    { label: 'Export comptable (Sage 100)', key: 'export' },
    { label: 'Multi-utilisateurs (Q3 2026)', key: 'team' },
    { label: 'Support FR (WhatsApp + email)', key: 'support' },
]

function cellFor(tier: Tier, key: typeof FEATURE_ROWS[number]['key']): string | boolean {
    const cfg = TIERS[tier]
    switch (key) {
        case 'invoices':
            return cfg.monthlyInvoiceLimit === null ? 'Illimité' : `${cfg.monthlyInvoiceLimit} / mois`
        case 'quotes':       return cfg.features.quotes
        case 'expenses':     return cfg.features.expenses
        case 'reports':      return cfg.features.reports
        case 'ai':
            return cfg.monthlyAiMessageLimit === null
                ? 'Illimité'
                : cfg.monthlyAiMessageLimit === 0
                    ? false
                    : `${cfg.monthlyAiMessageLimit} / mois`
        case 'watermark':    return cfg.features.watermarkRemoved
        case 'tva':          return cfg.features.tvaReport
        case 'export':       return cfg.features.accountantExport
        case 'team':         return 'Q3 2026'
        case 'support':      return true
    }
}

function CellValue({ value }: { value: string | boolean }) {
    if (value === true) return <span className="text-emerald-400">✓</span>
    if (value === false) return <span className="text-white/30">—</span>
    return <span className="text-white/80 text-xs">{value}</span>
}

export default function PricingTable({
    defaultCadence = 'monthly',
    foundingDiscount = false,
    ctaTarget = 'signup',
    recommendedTier = 'pro',
    onUpgradeClick,
}: PricingTableProps) {
    const [cadence, setCadence] = useState<'monthly' | 'annual'>(defaultCadence)

    const renderPrice = (tier: Tier) => {
        const cfg = TIERS[tier]
        const base = cadence === 'monthly' ? cfg.monthlyPriceMad : cfg.annualPriceMad
        if (base === 0) {
            return <p className="text-3xl font-black">0 <span className="text-base font-normal text-white/50">MAD</span></p>
        }
        const discounted = foundingDiscount ? Math.round(base * 0.7) : base
        const suffix = cadence === 'monthly' ? '/ mois' : '/ an'
        return (
            <div>
                <p className="text-3xl font-black">
                    {discounted} <span className="text-base font-normal text-white/50">MAD {suffix}</span>
                </p>
                {foundingDiscount && (
                    <p className="text-xs text-white/40 line-through">{base} MAD {suffix}</p>
                )}
                {cadence === 'annual' && (
                    <p className="text-xs text-emerald-400 mt-1">
                        Économisez {annualSavingsMad(tier)} MAD ({Math.round((1 - cfg.annualPriceMad / (cfg.monthlyPriceMad * 12)) * 100)}%)
                    </p>
                )}
            </div>
        )
    }

    const ctaFor = (tier: Tier) => {
        if (ctaTarget === 'upgrade' && tier !== 'free') {
            return (
                <button
                    onClick={() => onUpgradeClick?.(tier, cadence)}
                    className={`mt-6 w-full rounded-xl px-4 py-3 font-semibold transition ${
                        tier === recommendedTier
                            ? 'bg-primary hover:bg-primary/90 text-black'
                            : 'bg-white/10 hover:bg-white/15 text-white'
                    }`}
                >
                    Passer à {TIERS[tier].name}
                </button>
            )
        }
        const href = tier === 'free' ? '/register' : `/register?plan=${tier}&cadence=${cadence}`
        return (
            <Link
                href={href}
                className={`mt-6 block w-full rounded-xl px-4 py-3 font-semibold transition text-center ${
                    tier === recommendedTier
                        ? 'bg-primary hover:bg-primary/90 text-black'
                        : 'bg-white/10 hover:bg-white/15 text-white'
                }`}
            >
                Commencer {tier === 'free' ? 'gratuitement' : TIERS[tier].name}
            </Link>
        )
    }

    return (
        <div className="w-full">
            {/* Cadence toggle */}
            <div className="flex justify-center mb-8">
                <div className="inline-flex rounded-xl bg-white/5 border border-white/10 p-1">
                    <button
                        onClick={() => setCadence('monthly')}
                        className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                            cadence === 'monthly' ? 'bg-white/10 text-white' : 'text-white/50'
                        }`}
                    >
                        Mensuel
                    </button>
                    <button
                        onClick={() => setCadence('annual')}
                        className={`rounded-lg px-4 py-1.5 text-sm font-medium transition flex items-center gap-2 ${
                            cadence === 'annual' ? 'bg-white/10 text-white' : 'text-white/50'
                        }`}
                    >
                        Annuel
                        <span className="text-[10px] uppercase tracking-wider text-emerald-400">3 mois offerts</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['free', 'pro', 'business'] as Tier[]).map((tier) => {
                    const cfg = TIERS[tier]
                    const isRecommended = tier === recommendedTier
                    return (
                        <div
                            key={tier}
                            className={`rounded-2xl border p-6 flex flex-col ${
                                isRecommended ? 'border-primary bg-primary/5' : 'border-white/10 bg-white/[0.02]'
                            }`}
                        >
                            {isRecommended && (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">
                                    Recommandé
                                </p>
                            )}
                            <h3 className="text-lg font-bold">{cfg.name}</h3>
                            <div className="mt-4">{renderPrice(tier)}</div>
                            {ctaFor(tier)}

                            <ul className="mt-6 space-y-2 text-sm">
                                {FEATURE_ROWS.map((row) => (
                                    <li key={row.key} className="flex items-start justify-between gap-3">
                                        <span className="text-white/60">{row.label}</span>
                                        <CellValue value={cellFor(tier, row.key)} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
