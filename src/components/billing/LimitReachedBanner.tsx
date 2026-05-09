'use client'

import Link from 'next/link'

interface LimitReachedBannerProps {
    used: number
    limit: number
}

export default function LimitReachedBanner({ used, limit }: LimitReachedBannerProps) {
    const remaining = Math.max(0, limit - used)
    const isAtLimit = used >= limit
    const isWarning = !isAtLimit && remaining <= 2

    if (!isAtLimit && !isWarning) return null

    return (
        <div
            role="status"
            aria-live="polite"
            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                isAtLimit
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
        >
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">
                    {isAtLimit ? 'block' : 'warning'}
                </span>
                <p>
                    {isAtLimit ? (
                        <>Limite mensuelle atteinte ({limit}/{limit}). Passer à Pro pour des factures illimitées.</>
                    ) : (
                        <>Plus que {remaining} facture{remaining > 1 ? 's' : ''} avant la limite mensuelle ({used}/{limit}).</>
                    )}
                </p>
            </div>
            <Link
                href="/pricing?from=invoice_limit"
                className="inline-flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition"
            >
                Voir Pro
            </Link>
        </div>
    )
}
