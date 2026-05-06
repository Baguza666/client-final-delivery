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

const ACCENT_TEXT: Record<NonNullable<KpiCardProps['accent']>, string> = {
    primary: 'text-primary',
    emerald: 'text-status-paid',
    rose: 'text-rose-400',
    amber: 'text-status-pending',
}

const ACCENT_BG: Record<NonNullable<KpiCardProps['accent']>, string> = {
    primary: 'bg-primary/10 border-primary/20',
    emerald: 'bg-status-paid/10 border-status-paid/20',
    rose: 'bg-rose-500/10 border-rose-500/20',
    amber: 'bg-status-pending/10 border-status-pending/20',
}

export default function KpiCard({ label, icon, accent = 'primary', value, sub, href, trend, trendLabel }: KpiCardProps) {
    const inner = (
        <div className="group relative bg-zinc-900/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5 transition-all hover:border-white/[0.18] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_20px_rgba(0,0,0,0.4)] h-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <div
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center ${ACCENT_BG[accent]} ${ACCENT_TEXT[accent]}`}
                >
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                </div>
                {href && (
                    <span className="material-symbols-outlined text-slate-600 text-[18px] opacity-0 group-hover:opacity-100 transition-opacity">
                        arrow_forward
                    </span>
                )}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{label}</p>
            <div
                className="min-w-0 text-2xl font-[800] text-white font-mono tracking-tight leading-none truncate"
                title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
            >
                {value}
            </div>

            {(sub || trendLabel) && (
                <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                    {sub && <span className="text-slate-500 truncate">{sub}</span>}
                    {trend && trendLabel && (
                        <span
                            className={`inline-flex items-center gap-1 font-bold whitespace-nowrap ${
                                trend === 'up' ? 'text-status-paid' : trend === 'down' ? 'text-rose-400' : 'text-zinc-500'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[14px]">
                                {trend === 'up' ? 'arrow_upward' : trend === 'down' ? 'arrow_downward' : 'remove'}
                            </span>
                            {trendLabel}
                        </span>
                    )}
                </div>
            )}
        </div>
    )

    if (href) {
        return (
            <Link href={href} className="block h-full">
                {inner}
            </Link>
        )
    }
    return inner
}
