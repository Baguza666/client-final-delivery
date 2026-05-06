'use client'

import { formatMAD } from '@/utils/format'

export interface ClientStats {
    count: number
    total: number
    paid: number
}

interface ClientCardProps {
    client: any
    stats?: ClientStats
    selected: boolean
    selectionMode: boolean
    onOpen: () => void
    onEdit: () => void
    onDelete: () => void
    onToggleSelect: () => void
}

export default function ClientCard({
    client,
    stats,
    selected,
    selectionMode,
    onOpen,
    onEdit,
    onDelete,
    onToggleSelect,
}: ClientCardProps) {
    const initial = (client.name || '?').trim().charAt(0).toUpperCase()
    const subtitle = [client.city, client.country].filter(Boolean).join(', ')

    const handleClick = () => {
        if (selectionMode) onToggleSelect()
        else onOpen()
    }

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
        }
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKey}
            aria-pressed={selected}
            className={`group relative text-left rounded-xl p-5 border transition-all duration-200 bg-zinc-900/40 hover:bg-zinc-900/80 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                selected ? 'border-primary ring-2 ring-primary/30' : 'border-zinc-800 hover:border-zinc-700'
            }`}
        >
            {/* Selection checkbox */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    onToggleSelect()
                }}
                aria-label={selected ? 'Désélectionner' : 'Sélectionner'}
                aria-pressed={selected}
                className={`absolute top-3 left-3 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    selected
                        ? 'bg-primary border-primary opacity-100'
                        : 'bg-zinc-900 border-zinc-700 opacity-0 group-hover:opacity-100'
                } ${selectionMode ? 'opacity-100' : ''}`}
            >
                {selected && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
            </button>

            {/* Header: Avatar + actions */}
            <div className="flex items-start justify-between mb-4 pl-7">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/10 flex items-center justify-center text-primary font-bold text-xl border border-primary/20">
                    {initial}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onEdit()
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-md text-zinc-400 hover:text-primary transition-colors"
                        title="Modifier"
                    >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete()
                        }}
                        className="p-1.5 hover:bg-red-500/10 rounded-md text-zinc-400 hover:text-red-400 transition-colors"
                        title="Supprimer"
                    >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </div>

            <h3 className="font-bold text-base text-white mb-0.5 truncate">{client.name || 'Sans nom'}</h3>
            {subtitle && <p className="text-zinc-500 text-xs mb-3">{subtitle}</p>}

            <div className="text-sm text-zinc-400 space-y-1.5 mb-4">
                {client.email && (
                    <p className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-[15px] opacity-50">mail</span>
                        <span className="truncate">{client.email}</span>
                    </p>
                )}
                {client.phone && (
                    <p className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[15px] opacity-50">call</span>
                        <span className="font-mono text-xs text-zinc-300">{client.phone}</span>
                    </p>
                )}
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-800/80">
                <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-zinc-500">receipt_long</span>
                    <span className="text-zinc-300 text-xs font-medium">
                        {stats?.count ?? 0} <span className="text-zinc-500 font-normal">factures</span>
                    </span>
                </div>
                <span className="font-mono text-xs text-zinc-300">{formatMAD(stats?.total)}</span>
            </div>

            {client.ice && (
                <div className="mt-2 text-[10px] text-zinc-500 font-mono">
                    ICE: <span className="text-zinc-400">{client.ice}</span>
                </div>
            )}
        </div>
    )
}
