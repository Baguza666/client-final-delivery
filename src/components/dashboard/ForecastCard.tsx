'use client'

import { useMemo } from 'react'
import { formatMAD } from '@/utils/format'

interface ForecastCardProps {
    revenueByMonth: number[]
    expensesByMonth: number[]
    monthLabels: string[]
    currentTreasury: number
}

function avg(arr: number[]) {
    const nonZero = arr.filter(v => v > 0)
    if (!nonZero.length) return 0
    return nonZero.reduce((s, v) => s + v, 0) / nonZero.length
}

export default function ForecastCard({ revenueByMonth, expensesByMonth, monthLabels, currentTreasury }: ForecastCardProps) {
    const forecast = useMemo(() => {
        // Use last 3 months as baseline (exclude current month — index 11)
        const recentRevenue = revenueByMonth.slice(8, 11)
        const recentExpenses = expensesByMonth.slice(8, 11)
        const avgRevenue = avg(recentRevenue)
        const avgExpenses = avg(recentExpenses)
        const avgNet = avgRevenue - avgExpenses

        // Generate next 3 month labels
        const now = new Date()
        const futureMonths: string[] = []
        for (let i = 1; i <= 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
            futureMonths.push(d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }))
        }

        let runningBalance = currentTreasury
        const projections = futureMonths.map((label, i) => {
            runningBalance += avgNet
            return {
                label,
                revenue: avgRevenue,
                expenses: avgExpenses,
                balance: runningBalance,
                month: i + 1,
            }
        })

        return { projections, avgRevenue, avgExpenses, avgNet }
    }, [revenueByMonth, expensesByMonth, currentTreasury])

    const maxBalance = Math.max(...forecast.projections.map(p => Math.abs(p.balance)), 1)

    const trendIcon = forecast.avgNet >= 0 ? 'trending_up' : 'trending_down'
    const trendColor = forecast.avgNet >= 0 ? 'text-green-400' : 'text-rose-400'

    return (
        <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-start justify-between mb-5">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                        Previsions 3 mois
                    </p>
                    <h3 className="text-lg font-bold text-white">Tresorerie projetee</h3>
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[18px]">insights</span>
                </div>
            </div>

            {/* Baseline averages */}
            <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-green-500/[0.08] border border-green-500/20 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Moy. Revenus</p>
                    <p className="text-sm font-bold text-green-400 font-mono">{formatMAD(forecast.avgRevenue)}</p>
                </div>
                <div className="bg-rose-500/[0.08] border border-rose-500/20 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Moy. Depenses</p>
                    <p className="text-sm font-bold text-rose-400 font-mono">{formatMAD(forecast.avgExpenses)}</p>
                </div>
                <div className={"rounded-xl p-3 text-center border " + (forecast.avgNet >= 0 ? "bg-primary/[0.08] border-primary/20" : "bg-rose-500/[0.08] border-rose-500/20")}>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Net mois</p>
                    <p className={"text-sm font-bold font-mono flex items-center justify-center gap-0.5 " + trendColor}>
                        <span className={"material-symbols-outlined text-[13px] " + trendColor}>{trendIcon}</span>
                        {formatMAD(Math.abs(forecast.avgNet))}
                    </p>
                </div>
            </div>

            {/* Month projections */}
            <div className="space-y-3">
                {forecast.projections.map((p) => {
                    const barPct = Math.abs(p.balance) / maxBalance * 100
                    const isPositive = p.balance >= 0
                    return (
                        <div key={p.label} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-zinc-500 w-12 shrink-0 text-right">{p.label}</span>
                            <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                                <div
                                    className={"h-full rounded-full transition-all " + (isPositive ? "bg-gradient-to-r from-primary to-emerald-400" : "bg-gradient-to-r from-rose-600 to-red-400")}
                                    style={{ width: barPct + "%" }}
                                />
                            </div>
                            <span className={"text-xs font-bold font-mono w-24 text-right shrink-0 " + (isPositive ? "text-white" : "text-rose-400")}>
                                {isPositive ? "" : "-"}{formatMAD(Math.abs(p.balance))}
                            </span>
                        </div>
                    )
                })}
            </div>

            <p className="text-[10px] text-zinc-600 mt-4">
                Prevision basee sur la moyenne des 3 derniers mois. Non contractuelle.
            </p>
        </div>
    )
}
