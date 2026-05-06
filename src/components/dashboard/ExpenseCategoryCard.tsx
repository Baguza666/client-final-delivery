'use client'

import Link from 'next/link'
import { formatMAD } from '@/utils/format'

interface ExpenseCategoryCardProps {
    expensesByCategory: Record<string, number>
    totalExpenses: number
}

const CAT_COLORS: Record<string, string> = {
    'Materiel': 'bg-blue-500',
    "Main d'oeuvre": 'bg-violet-500',
    'Transport': 'bg-amber-500',
    'Bureau': 'bg-cyan-500',
    'Marketing': 'bg-pink-500',
    'Dette': 'bg-rose-600',
    'Autre': 'bg-zinc-500',
}

function catColor(cat: string) {
    return CAT_COLORS[cat] || 'bg-primary'
}

export default function ExpenseCategoryCard({ expensesByCategory, totalExpenses }: ExpenseCategoryCardProps) {
    const entries = Object.entries(expensesByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)

    return (
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-4 h-full flex flex-col">
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
                <div className="flex-1 space-y-2.5 overflow-y-auto">
                    {entries.map(([cat, amount]) => {
                        const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                        return (
                            <div key={cat}>
                                <div className="flex items-center justify-between mb-0.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <div className={"w-1.5 h-1.5 rounded-full shrink-0 " + catColor(cat)} />
                                        <span className="text-xs text-zinc-400 truncate">{cat}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[9px] text-zinc-600 font-mono">{pct.toFixed(0)}%</span>
                                        <span className="text-xs font-bold font-mono text-white">{formatMAD(amount)}</span>
                                    </div>
                                </div>
                                <div className="w-full bg-zinc-800 rounded-full h-1">
                                    <div
                                        className={"h-1 rounded-full transition-all " + catColor(cat)}
                                        style={{ width: pct.toFixed(1) + '%' }}
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
