'use client'

import Link from 'next/link'
import { formatMAD, formatDateShort } from '@/utils/format'

interface InvoiceRow {
    id: string
    invoice_number: string | null
    client: { name: string } | null
    date: string | null
    total_ttc: number | null
    status: string | null
    created_at: string
}

const STATUS_LABEL: Record<string, string> = {
    draft:   'Brouillon',
    pending: 'En attente',
    sent:    'Envoyée',
    paid:    'Payée',
    overdue: 'En retard',
    partial: 'Partiel',
}

const STATUS_CLASS: Record<string, string> = {
    paid:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    overdue: 'text-rose-400   bg-rose-400/10    border-rose-400/20',
    sent:    'text-indigo-400 bg-indigo-400/10  border-indigo-400/20',
    pending: 'text-amber-400  bg-amber-400/10   border-amber-400/20',
    draft:   'text-zinc-500   bg-zinc-800       border-zinc-700',
    partial: 'text-yellow-400 bg-yellow-400/10  border-yellow-400/20',
}

function ClientAvatar({ name }: { name: string }) {
    const initials = name
        .split(' ')
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('')

    const colors = [
        'bg-indigo-500/20 text-indigo-300',
        'bg-violet-500/20 text-violet-300',
        'bg-emerald-500/20 text-emerald-300',
        'bg-amber-500/20 text-amber-300',
        'bg-rose-500/20 text-rose-300',
        'bg-cyan-500/20 text-cyan-300',
    ]
    const color = colors[name.charCodeAt(0) % colors.length]

    return (
        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black shrink-0 ${color}`}>
            {initials || '?'}
        </div>
    )
}

export default function RecentInvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
    return (
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Dernières factures</p>
                <Link
                    href="/invoices"
                    className="text-xs text-zinc-500 hover:text-primary transition-colors flex items-center gap-1"
                >
                    Voir tout
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
            </div>

            {invoices.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-3xl text-zinc-700 mb-2">receipt_long</span>
                    <p className="text-zinc-600 text-xs">Aucune facture pour l&apos;instant.</p>
                    <Link href="/invoices/new"
                        className="mt-2 text-xs font-bold text-primary hover:text-accent transition-colors">
                        Créer une facture →
                    </Link>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto thin-scrollbar">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-zinc-950/90 backdrop-blur-sm">
                            <tr className="border-b border-white/[0.04]">
                                <th className="text-left text-[9px] font-bold uppercase tracking-widest text-zinc-600 pb-2 pr-3">N°</th>
                                <th className="text-left text-[9px] font-bold uppercase tracking-widest text-zinc-600 pb-2 pr-3">Client</th>
                                <th className="text-left text-[9px] font-bold uppercase tracking-widest text-zinc-600 pb-2 pr-3 hidden sm:table-cell">Date</th>
                                <th className="text-right text-[9px] font-bold uppercase tracking-widest text-zinc-600 pb-2 pr-3">Montant</th>
                                <th className="text-right text-[9px] font-bold uppercase tracking-widest text-zinc-600 pb-2">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {invoices.map((inv) => {
                                const status = (inv.status || 'draft').toLowerCase()
                                const badgeClass = STATUS_CLASS[status] ?? STATUS_CLASS.draft
                                const badgeLabel = STATUS_LABEL[status] ?? (inv.status || 'Brouillon')
                                return (
                                    <tr
                                        key={inv.id}
                                        className="group hover:bg-white/[0.025] transition-colors"
                                    >
                                        <td className="py-2 pr-3">
                                            <Link
                                                href={`/invoices/${inv.id}`}
                                                className="font-mono text-[11px] text-zinc-500 group-hover:text-primary transition-colors"
                                            >
                                                {inv.invoice_number || 'BROUILLON'}
                                            </Link>
                                        </td>
                                        <td className="py-2 pr-3 max-w-[130px]">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <ClientAvatar name={inv.client?.name || '?'} />
                                                <span className="font-medium text-zinc-300 text-xs truncate">
                                                    {inv.client?.name || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-2 pr-3 hidden sm:table-cell">
                                            <span className="text-zinc-600 text-[11px] font-mono">
                                                {formatDateShort(inv.date || inv.created_at)}
                                            </span>
                                        </td>
                                        <td className="py-2 pr-3 text-right">
                                            <span className="font-mono font-bold text-white text-xs whitespace-nowrap">
                                                {formatMAD(Number(inv.total_ttc) || 0)}
                                            </span>
                                        </td>
                                        <td className="py-2 text-right">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeClass}`}>
                                                {badgeLabel}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
