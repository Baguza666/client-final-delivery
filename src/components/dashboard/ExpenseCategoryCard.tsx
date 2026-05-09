'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatMAD } from '@/utils/format'

interface ExpenseCategoryCardProps {
    expensesByCategory: Record<string, number>
    totalExpenses: number
}

const CAT_COLORS: Record<string, string> = {
    'Materiel':       'bg-indigo-500',
    "Main d'oeuvre":  'bg-violet-500',
    'Transport':      'bg-amber-500',
    'Bureau':         'bg-cyan-500',
    'Marketing':      'bg-pink-500',
    'Dette':          'bg-rose-600',
    'Autre':          'bg-zinc-500',
}

function catColor(cat: string) {
    return CAT_COLORS[cat] || 'bg-primary'
}

export default function ExpenseCategoryCard({ expensesByCategory, totalExpenses }: ExpenseCategoryCardProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => { const t = setTimeout(() => setMounted(true), 160); return () => clearTimeout(t) }, [])

    const entries = Object.entries(expensesByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)

    return (
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Dépenses / catégorie</p>
                <Link href="/expenses" className="text-[10px] text-zinc-600 hover:text-primary transition-colors flex items-center gap-0.5">
                    Voir tout
                    <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                </Link>
            </div>

            {entries.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-zinc-600 text-xs text-center">Aucune dépense.</p>
                </div>
            ) : (
                <div className="flex-1 space-y-2 overflow-y-auto thin-scrollbar">
                    {entries.map(([cat, amount], i) => {
                        const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                        return (
                            <div key={cat}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${catColor(cat)}`} />
                                        <span className="text-[11px] text-zinc-400 truncate">{cat}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="text-[9px] text-zinc-600 font-mono tabular-nums w-6 text-right">{pct.toFixed(0)}%</span>
                                        <span className="text-[11px] font-bold font-mono text-white tabular-nums">{formatMAD(amount)}</span>
                                    </div>
                                </div>
                                <div className="w-full bg-white/[0.05] rounded-full h-0.5">
                                    <div
                                        className={`h-0.5 rounded-full ${catColor(cat)}`}
                                        style={{
                                            width: mounted ? pct.toFixed(1) + '%' : '0%',
                                            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                                            transitionDelay: `${i * 80}ms`,
                                        }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
