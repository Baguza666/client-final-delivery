'use client'

import Link from 'next/link'
import { formatMAD } from '@/utils/format'
import type { TopClient } from '@/app/actions/dashboard'

interface TopClientsCardProps {
    topClients: TopClient[]
    totalRevenue: number
}

const COLORS = ['bg-primary', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500']

export default function TopClientsCard({ topClients, totalRevenue }: TopClientsCardProps) {
    return (
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Top clients</p>
                </div>
                <Link href="/clients" className="text-xs text-zinc-500 hover:text-primary transition-colors flex items-center gap-1">
                    Voir tous
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
            </div>

            {topClients.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-zinc-600 text-xs text-center">Aucune facture payée.</p>
                </div>
            ) : (
                <div className="flex-1 space-y-3 overflow-y-auto">
                    {topClients.map((client, i) => {
                        const pct = totalRevenue > 0 ? (client.revenue / totalRevenue) * 100 : 0
                        return (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={"w-2 h-2 rounded-full shrink-0 " + COLORS[i]} />
                                        <span className="text-xs text-white font-medium truncate max-w-[120px]">{client.name}</span>
                                        <span className="text-[9px] text-zinc-600 font-mono shrink-0">{client.invoiceCount} fac.</span>
                                    </div>
                                    <span className="text-xs font-bold font-mono text-white shrink-0">{formatMAD(client.revenue)}</span>
                                </div>
                                <div className="w-full bg-zinc-800 rounded-full h-1">
                                    <div
                                        className={"h-1 rounded-full transition-all " + COLORS[i]}
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
