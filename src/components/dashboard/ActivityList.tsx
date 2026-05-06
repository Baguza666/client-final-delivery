'use client'

import Link from 'next/link'
import { formatMAD, formatDateShort } from '@/utils/format'

interface BaseRow {
    id?: string
    href?: string
    title: string
    subtitle?: string
    avatar: string
    amount: number
    date?: string
}

interface ActivityListProps {
    title: string
    icon: string
    tone: 'in' | 'out'
    viewAllHref: string
    rows: BaseRow[]
    emptyText: string
}

export default function ActivityList({ title, icon, tone, viewAllHref, rows, emptyText }: ActivityListProps) {
    const isIn = tone === 'in'

    return (
        <div className="bg-white/[0.018] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6 pl-1">
                <h3 className="font-bold text-zinc-300 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <span
                        className={`w-6 h-6 rounded flex items-center justify-center ${
                            isIn ? 'bg-status-paid/10 text-status-paid' : 'bg-rose-500/10 text-rose-400'
                        }`}
                    >
                        <span className="material-symbols-outlined text-sm">{icon}</span>
                    </span>
                    {title}
                </h3>
                <Link
                    href={viewAllHref}
                    className="text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-3 py-1.5 rounded-full transition-colors uppercase tracking-wider"
                >
                    Tout voir
                </Link>
            </div>

            {rows.length === 0 ? (
                <div className="p-8 text-center text-zinc-600 text-xs italic">{emptyText}</div>
            ) : (
                <ul className="space-y-2">
                    {rows.map((row, idx) => {
                        const content = (
                            <div className="group flex justify-between items-center p-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                            isIn
                                                ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-white'
                                                : 'bg-zinc-900 border border-zinc-800 text-zinc-500 group-hover:border-rose-500/30 group-hover:text-rose-400'
                                        }`}
                                    >
                                        {row.avatar}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-zinc-200 group-hover:text-white truncate max-w-[180px]">
                                            {row.title}
                                        </p>
                                        <p className="text-[10px] text-zinc-500 font-mono tracking-wide truncate">
                                            {row.subtitle}
                                            {row.subtitle && row.date && ' · '}
                                            {row.date && formatDateShort(row.date)}
                                        </p>
                                    </div>
                                </div>
                                <p
                                    className={`font-mono font-bold text-sm px-2 py-1 rounded-md whitespace-nowrap ${
                                        isIn ? 'text-status-paid bg-status-paid/10' : 'text-rose-400 bg-rose-500/10'
                                    }`}
                                >
                                    {isIn ? '+' : '−'}{formatMAD(row.amount)}
                                </p>
                            </div>
                        )
                        return (
                            <li key={row.id ?? idx}>
                                {row.href ? <Link href={row.href}>{content}</Link> : content}
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
