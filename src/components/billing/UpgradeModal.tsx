'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PricingTable from './PricingTable'
import type { Tier } from '@/lib/tiers'

interface UpgradeModalProps {
    open: boolean
    onClose: () => void
    /** Context that triggered the modal — used to tailor headline copy. */
    from?: 'invoice_limit' | 'quotes' | 'purchase_orders' | 'delivery_notes' | 'expenses' | 'reconciliation' | 'reports' | 'ai_features' | 'ai_limit' | 'tva_report' | 'export' | string
}

const HEADLINES: Record<string, string> = {
    invoice_limit: 'Vous avez atteint votre limite mensuelle gratuite',
    quotes: 'Les devis sont disponibles avec Pro',
    purchase_orders: 'Les bons de commande sont disponibles avec Pro',
    delivery_notes: 'Les bons de livraison sont disponibles avec Pro',
    expenses: 'Suivez vos dépenses avec Pro',
    reconciliation: 'Le rapprochement est disponible avec Pro',
    reports: 'Les rapports financiers sont disponibles avec Pro',
    ai_features: 'L\'assistant IA est disponible avec Pro',
    ai_limit: 'Quota IA mensuel atteint',
    tva_report: 'Préparation TVA — réservée à Business',
    export: 'Export comptable — réservé à Business',
    default: 'Débloquez tout Invoicify',
}

export default function UpgradeModal({ open, onClose, from }: UpgradeModalProps) {
    const router = useRouter()
    const headline = HEADLINES[from ?? 'default'] ?? HEADLINES.default

    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = ''
        }
    }, [open, onClose])

    if (!open) return null

    const handleUpgrade = (tier: Tier, cadence: 'monthly' | 'annual') => {
        // Phase 5 wiring will redirect to Lemon Squeezy checkout. For now,
        // route to /pricing so the user can complete the flow there.
        router.push(`/pricing?plan=${tier}&cadence=${cadence}&from=${from ?? 'modal'}`)
        onClose()
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-modal-title"
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:p-8"
        >
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />
            <div className="relative z-10 w-full max-w-5xl rounded-3xl border border-white/10 bg-[#0a0a0a] p-6 sm:p-8 shadow-2xl my-8">
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h2 id="upgrade-modal-title" className="text-2xl font-bold">{headline}</h2>
                        <p className="text-sm text-white/60 mt-1">
                            Annulez à tout moment · 30 jours satisfait ou remboursé
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 transition"
                        aria-label="Fermer"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <PricingTable
                    defaultCadence="monthly"
                    ctaTarget="upgrade"
                    onUpgradeClick={handleUpgrade}
                />
            </div>
        </div>
    )
}
