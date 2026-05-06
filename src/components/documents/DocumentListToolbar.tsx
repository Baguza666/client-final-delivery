'use client'

import { DocumentType, getStatusOptions } from '@/utils/status'

interface ToolbarProps {
    docType: DocumentType
    search: string
    onSearchChange: (v: string) => void
    statusFilter: string | null
    onStatusFilterChange: (v: string | null) => void
    sortDesc: boolean
    onSortToggle: () => void
}

export default function DocumentListToolbar({
    docType,
    search,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    sortDesc,
    onSortToggle,
}: ToolbarProps) {
    const options = getStatusOptions(docType)

    const chip = (active: boolean) =>
        `px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition ${
            active
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
        }`

    return (
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-0 max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-base pointer-events-none">
                    search
                </span>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Rechercher un client ou numéro…"
                    aria-label="Rechercher"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-primary transition-colors"
                />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => onStatusFilterChange(null)} className={chip(statusFilter === null)}>
                    Tous
                </button>
                {options.map((opt) => (
                    <button key={opt.value} onClick={() => onStatusFilterChange(opt.value)} className={chip(statusFilter === opt.value)}>
                        {opt.label}
                    </button>
                ))}
            </div>

            <button
                onClick={onSortToggle}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 hover:text-white hover:border-zinc-700 text-xs transition self-start md:self-auto"
                title={sortDesc ? 'Plus récents en premier' : 'Plus anciens en premier'}
            >
                <span className="material-symbols-outlined text-base">{sortDesc ? 'arrow_downward' : 'arrow_upward'}</span>
                Date
            </button>
        </div>
    )
}
