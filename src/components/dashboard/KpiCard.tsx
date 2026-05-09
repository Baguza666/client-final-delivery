'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

interface KpiCardProps {
    label: string
    icon: string
    accent?: 'primary' | 'emerald' | 'rose' | 'amber'
    value: ReactNode
    sub?: ReactNode
    href?: string
    trend?: 'up' | 'down' | 'flat'
    trendLabel?: string
}

const ACCENT: Record<NonNullable<KpiCardProps['accent']>, { text: string; bg: string; border: string }> = {
    primary: { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    rose:    { text: 'text-rose-400',   bg: 'bg-rose-500/10',    border: 'border-rose-500/20' },
    amber:   { text: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
}

export default function KpiCard({ label, icon, accent = 'primary', value, sub, href, trend, trendLabel }: KpiCardProps) {
    const cfg = ACCENT[accent]

    const inner = (
        <div className="group relative bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl p-5 transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.05] h-full min-w-0 overflow-hidden cursor-pointer">
            {/* Top shimmer on hover */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.18] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="flex items-center justify-between mb-4">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                </div>
                {href && (
                    <span className="material-symbols-outlined text-zinc-700 text-[16px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200">
                        arrow_forward
                    </span>
                )}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-2">{label}</p>

            <div
                className="min-w-0 text-[1.3rem] font-[800] text-white tabular-nums tracking-tight leading-none truncate"
                title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
            >
                {value}
            </div>

            {(sub !== undefined || (trend && trendLabel)) && (
                <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                    {sub !== undefined && <span className="text-zinc-500 truncate">{sub}</span>}
                    {trend && trendLabel && (
                        <span className={`inline-flex items-center gap-0.5 font-bold whitespace-nowrap ${
                            trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-zinc-600'
                        }`}>
                            <span className="material-symbols-outlined text-[13px]">
                                {trend === 'up' ? 'trending_up' : trend === 'down' ? 'trending_down' : 'remove'}
                            </span>
                            {trendLabel}
                        </span>
                    )}
                </div>
            )}
        </div>
    )

    if (href) return <Link href={href} className="block h-full">{inner}</Link>
    return inner
}
