'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CancelModal from './CancelModal'
import type { Tier } from '@/lib/tiers'

interface BillingActionsProps {
    tier: Tier
    inMoneyBack: boolean
    periodEnd: string | null
    cancelAtPeriodEnd: boolean
}

export default function BillingActions({ tier, inMoneyBack, periodEnd, cancelAtPeriodEnd }: BillingActionsProps) {
    const router = useRouter()
    const [cancelOpen, setCancelOpen] = useState(false)

    return (
        <>
            <a
                href={process.env.NEXT_PUBLIC_LEMONSQUEEZY_PORTAL_URL ?? 'https://billing.lemonsqueezy.com'}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-white/10 hover:bg-white/15 text-white px-4 py-2.5 font-medium text-sm text-center transition"
            >
                Gérer le paiement
            </a>
            {tier === 'pro' && (
                <button
                    onClick={() => router.push('/pricing?plan=business')}
                    className="rounded-xl border border-white/10 hover:bg-white/5 text-white px-4 py-2.5 font-medium text-sm text-center transition"
                >
                    Passer à Business
                </button>
            )}
            <button
                onClick={() => setCancelOpen(true)}
                disabled={cancelAtPeriodEnd}
                className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] text-rose-300 hover:bg-rose-500/15 px-4 py-2.5 font-medium text-sm text-center transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {cancelAtPeriodEnd ? 'Annulé · prend fin à la période' : 'Annuler l\'abonnement'}
            </button>
            <CancelModal
                open={cancelOpen}
                onClose={() => setCancelOpen(false)}
                inMoneyBack={inMoneyBack}
                periodEnd={periodEnd}
                onCancelled={() => router.refresh()}
            />
        </>
    )
}
