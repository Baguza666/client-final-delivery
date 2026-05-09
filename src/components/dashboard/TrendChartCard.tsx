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

// Brand indigo (#6366F1) for revenue, rose for expenses
const REV_COLOR = '#6366F1'
const EXP_COLOR = '#F43F5E'

function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-zinc-950/95 border border-white/[0.10] rounded-xl px-3 py-2.5 shadow-2xl backdrop-blur-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex items-center gap-2 text-xs mb-1 last:mb-0">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-zinc-400">{p.name}</span>
                    <span className="font-mono font-bold text-white ml-auto pl-3">{formatMAD(p.value)}</span>
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
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tendance financière</p>
                    <div className="flex items-center gap-4 mt-1.5">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: REV_COLOR }} />
                            <span className="text-[11px] text-zinc-400">Revenus</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: EXP_COLOR }} />
                            <span className="text-[11px] text-zinc-400">Dépenses</span>
                        </div>
                    </div>
                </div>

                {/* Range tabs */}
                <div className="flex items-center gap-0.5 bg-white/[0.04] border border-white/[0.06] rounded-lg p-0.5">
                    {(['3M', '6M', '12M'] as Range[]).map(r => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all duration-150 ${
                                range === r
                                    ? 'bg-primary/90 text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0">
                {!hasData ? (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Aucune donnée sur cette période</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                            <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={REV_COLOR} stopOpacity={0.25} />
                                    <stop offset="95%" stopColor={REV_COLOR} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={EXP_COLOR} stopOpacity={0.15} />
                                    <stop offset="95%" stopColor={EXP_COLOR} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="label"
                                tick={{ fill: '#A1A1AA', fontSize: 10, fontWeight: 700 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: '#A1A1AA', fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                                width={32}
                            />
                            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                name="Revenus"
                                stroke={REV_COLOR}
                                strokeWidth={2}
                                fill="url(#revGrad)"
                                dot={false}
                                activeDot={{ r: 4, fill: REV_COLOR, strokeWidth: 0 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="expenses"
                                name="Dépenses"
                                stroke={EXP_COLOR}
                                strokeWidth={2}
                                fill="url(#expGrad)"
                                dot={false}
                                activeDot={{ r: 4, fill: EXP_COLOR, strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
}
