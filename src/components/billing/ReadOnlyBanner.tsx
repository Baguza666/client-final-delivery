'use client'

import Link from 'next/link'

interface ReadOnlyBannerProps {
    feature: 'quotes' | 'purchase_orders' | 'delivery_notes' | 'expenses' | 'reconciliation' | 'ai'
}

const FEATURE_LABELS: Record<ReadOnlyBannerProps['feature'], string> = {
    quotes: 'devis',
    purchase_orders: 'bons de commande',
    delivery_notes: 'bons de livraison',
    expenses: 'dépenses',
    reconciliation: 'rapprochements',
    ai: 'conversations IA',
}

export default function ReadOnlyBanner({ feature }: ReadOnlyBannerProps) {
    const label = FEATURE_LABELS[feature]
    return (
        <div
            role="status"
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">history</span>
                <p>
                    Lecture seule — vous consultez d&apos;anciens {label}. Réactivez Pro pour créer ou modifier ces documents.
                </p>
            </div>
            <Link
                href={`/pricing?from=${feature}`}
                className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition"
            >
                Réactiver Pro
            </Link>
        </div>
    )
}
