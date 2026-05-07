'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatMAD } from '@/utils/format'
import type { TopClient } from '@/lib/dashboard-helpers'

interface TopClientsCardProps {
    topClients: TopClient[]
    totalRevenue: number
}

const BAR_COLORS = ['bg-primary', 'bg-emerald-500', 'bg-violet-500']
const AVATAR_COLORS = [
    'bg-indigo-500/20 text-indigo-300',
    'bg-emerald-500/20 text-emerald-300',
    'bg-violet-500/20 text-violet-300',
]

function clientInitials(name: string) {
    return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

export default function TopClientsCard({ topClients, totalRevenue }: TopClientsCardProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => { const t = setTimeout(() => setMounted(true), 120); return () => clearTimeout(t) }, [])

    return (
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Top clients</p>
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
                <div className="flex-1 space-y-3 overflow-y-auto thin-scrollbar">
                    {topClients.map((client, i) => {
                        const pct = totalRevenue > 0 ? (client.revenue / totalRevenue) * 100 : 0
                        return (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black shrink-0 ${AVATAR_COLORS[i] ?? AVATAR_COLORS[0]}`}>
                                            {clientInitials(client.name) || '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-xs text-white font-semibold truncate block max-w-[110px]">{client.name}</span>
                                            <span className="text-[9px] text-zinc-600 font-mono">{client.invoiceCount} fac.</span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold font-mono text-white shrink-0 ml-2">{formatMAD(client.revenue)}</span>
                                </div>
                                <div className="w-full bg-white/[0.05] rounded-full h-1">
                                    <div
                                        className={`h-1 rounded-full ${BAR_COLORS[i] ?? BAR_COLORS[0]}`}
                                        style={{
                                            width: mounted ? pct.toFixed(1) + '%' : '0%',
                                            transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
                                            transitionDelay: `${i * 100}ms`,
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
