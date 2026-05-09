'use client'

import Link from 'next/link'

interface AiQuotaGaugeProps {
    used: number
    limit: number | null
    tier: 'free' | 'pro' | 'business'
}

export default function AiQuotaGauge({ used, limit, tier }: AiQuotaGaugeProps) {
    if (limit === null) {
        return (
            <p className="text-xs text-white/40">
                {used} messages ce mois · illimité
            </p>
        )
    }
    if (limit === 0) {
        return (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                <p className="text-xs text-white/60">
                    L&apos;assistant IA est disponible avec Pro et Business.
                </p>
                <Link
                    href="/pricing?from=ai_features"
                    className="text-xs font-semibold text-primary hover:underline"
                >
                    Découvrir
                </Link>
            </div>
        )
    }

    const pct = Math.min(1, used / limit)
    const status: 'ok' | 'warning' | 'limit' =
        used >= limit ? 'limit' : pct >= 0.8 ? 'warning' : 'ok'

    const barColor =
        status === 'limit' ? 'bg-rose-500'
        : status === 'warning' ? 'bg-amber-400'
        : 'bg-primary'

    const upgradeTier = tier === 'pro' ? 'Business' : null

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] text-white/60">
                <span>{used} / {limit} messages ce mois</span>
                {status !== 'ok' && upgradeTier && (
                    <Link
                        href="/pricing?from=ai_limit"
                        className="font-semibold text-primary hover:underline"
                    >
                        Passer à {upgradeTier}
                    </Link>
                )}
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                    className={`h-full ${barColor} transition-all`}
                    style={{ width: `${pct * 100}%` }}
                />
            </div>
            {status === 'warning' && (
                <p className="text-[11px] text-amber-300">
                    Vous approchez votre quota mensuel.
                </p>
            )}
            {status === 'limit' && (
                <p className="text-[11px] text-rose-300">
                    Quota mensuel atteint. {upgradeTier ? `Passez à ${upgradeTier} pour 1 000 messages/mois.` : 'Limite atteinte.'}
                </p>
            )}
        </div>
    )
}
