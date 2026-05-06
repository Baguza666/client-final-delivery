'use client'

import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatMAD } from '@/utils/format'

interface Props {
    revenueByMonth: number[]
    expensesByMonth: number[]
    monthLabels: string[]
}

type Range = '3M' | '6M' | '12M'

function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex items-center gap-2 text-xs mb-0.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-zinc-400">{p.name}</span>
                    <span className="font-mono font-bold text-white ml-2">{formatMAD(p.value)}</span>
                </div>
            ))}
        </div>
    )
}

export default function TrendChartCard({ revenueByMonth, expensesByMonth, monthLabels }: Props) {
    const [range, setRange] = useState<Range>('12M')

    const count = range === '3M' ? 3 : range === '6M' ? 6 : 12
    const offset = monthLabels.length - count
    const data = monthLabels.slice(-count).map((label, i) => ({
        label,
        revenue: revenueByMonth[offset + i] || 0,
        expenses: expensesByMonth[offset + i] || 0,
    }))

    const hasData = data.some(d => d.revenue > 0 || d.expenses > 0)

    return (
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tendance financière</p>
                    <div className="flex items-center gap-4 mt-1.5">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-0.5 rounded-full bg-blue-500" />
                            <span className="text-[11px] text-zinc-400">Revenus</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-0.5 rounded-full bg-rose-500" />
                            <span className="text-[11px] text-zinc-400">Dépenses</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-0.5 bg-zinc-800/80 rounded-lg p-0.5">
                    {(['3M', '6M', '12M'] as Range[]).map(r => (
                        <button key={r} onClick={() => setRange(r)}
                            className={"px-2.5 py-1 rounded-md text-xs font-bold transition-all " +
                                (range === r
                                    ? "bg-primary text-white shadow-[0_0_8px_rgba(59,130,246,0.35)]"
                                    : "text-zinc-500 hover:text-zinc-300")}>
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0">
                {!hasData ? (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-xs uppercase tracking-widest text-zinc-700 font-bold">Aucune donnée sur cette période</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                            <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.22} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.14} />
                                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="#27272a" />
                            <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#71717a', fontSize: 9 }} axisLine={false} tickLine={false}
                                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={32} />
                            <Tooltip content={<ChartTooltip />} />
                            <Area type="monotone" dataKey="revenue" name="Revenus" stroke="#3B82F6" strokeWidth={2}
                                fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }} />
                            <Area type="monotone" dataKey="expenses" name="Dépenses" stroke="#F43F5E" strokeWidth={2}
                                fill="url(#expGrad)" dot={false} activeDot={{ r: 4, fill: '#F43F5E', strokeWidth: 0 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
}
