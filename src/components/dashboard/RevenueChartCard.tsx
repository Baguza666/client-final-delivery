'use client'

import { formatMAD } from '@/utils/format'
import RevenueBarChart from './RevenueBarChart'
import type { MonthBar } from '@/app/actions/dashboard'

interface RevenueChartCardProps {
    revenueByMonth: number[]
    monthLabels: string[]
    revenueByYear: MonthBar[]
}

export default function RevenueChartCard({ revenueByYear }: RevenueChartCardProps) {
    const total = revenueByYear.reduce((s, m) => s + m.revenue, 0)
    const currentYear = new Date().getFullYear()

    return (
        <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Revenus encaissés
                    </p>
                    <h3 className="text-lg font-bold text-white mt-1">
                        Chiffre d&apos;affaires {currentYear}
                    </h3>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total payé</p>
                    <p className="text-xl font-[800] font-mono text-white mt-1">{formatMAD(total)}</p>
                </div>
            </div>

            <div className="h-40">
                <RevenueBarChart data={revenueByYear} />
            </div>
        </div>
    )
}
