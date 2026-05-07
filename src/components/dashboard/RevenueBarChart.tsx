'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMAD } from '@/utils/format'
import type { MonthBar } from '@/lib/dashboard-helpers'

function DarkTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean
    payload?: Array<{ value?: number | string }>
    label?: string
}) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5">{label}</p>
            <p className="text-white font-mono font-bold text-sm">
                {formatMAD(Number(payload[0]?.value) || 0)}
            </p>
        </div>
    )
}

export default function RevenueBarChart({ data }: { data: MonthBar[] }) {
    const hasData = data.some((d) => d.revenue > 0)

    if (!hasData) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <p className="text-xs uppercase tracking-widest text-zinc-600 font-bold">
                    Aucun revenu encaissé cette année
                </p>
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" />
                <XAxis
                    dataKey="label"
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                    width={42}
                />
                <Tooltip
                    content={<DarkTooltip />}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
        </ResponsiveContainer>
    )
}
