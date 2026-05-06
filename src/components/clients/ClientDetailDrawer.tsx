'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import StatusPill from '@/components/ui/StatusPill'
import { formatMAD, formatDateShort } from '@/utils/format'

interface ClientDetailDrawerProps {
    client: any | null
    stats?: { count: number; total: number; paid: number }
    onClose: () => void
    onEdit: () => void
    onDelete: () => void
}

export default function ClientDetailDrawer({ client, stats, onClose, onEdit, onDelete }: ClientDetailDrawerProps) {
    const [invoices, setInvoices] = useState<any[]>([])
    const [quotes, setQuotes] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const supabase = useMemo(
        () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
        [],
    )

    useEffect(() => {
        if (!client) return
        let cancelled = false
        setLoading(true)
        ;(async () => {
            const [invRes, quoteRes] = await Promise.all([
                supabase
                    .from('invoices')
                    .select('id, invoice_number, status, date, created_at, total_ttc')
                    .eq('client_id', client.id)
                    .order('created_at', { ascending: false })
                    .limit(5),
                supabase
                    .from('quotes')
                    .select('id, number, status, date, created_at, total_ttc, total')
                    .eq('client_id', client.id)
                    .order('created_at', { ascending: false })
                    .limit(5),
            ])
            if (!cancelled) {
                setInvoices(invRes.data || [])
                setQuotes(quoteRes.data || [])
                setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [client, supabase])

    useEffect(() => {
        if (!client) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [client, onClose])

    if (!client) return null

    const initial = (client.name || '?').trim().charAt(0).toUpperCase()

    return (
        <div className="fixed inset-0 z-[180] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="client-detail-title">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <aside className="relative w-full max-w-md h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col animate-fade-in">
                <header className="px-6 py-5 border-b border-zinc-800 flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-accent/10 flex items-center justify-center text-primary font-bold text-2xl border border-primary/20 shrink-0">
                        {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 id="client-detail-title" className="text-lg font-bold text-white truncate">
                            {client.name || 'Sans nom'}
                        </h2>
                        {(client.city || client.country) && (
                            <p className="text-zinc-500 text-xs mt-0.5 truncate">
                                {[client.city, client.country].filter(Boolean).join(', ')}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fermer"
                        className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-white/5 transition"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {/* Quick stats */}
                    <div className="grid grid-cols-3 gap-px bg-zinc-800/60">
                        <div className="bg-zinc-950 px-4 py-4">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Factures</p>
                            <p className="text-white font-bold text-lg mt-1">{stats?.count ?? 0}</p>
                        </div>
                        <div className="bg-zinc-950 px-4 py-4">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Total</p>
                            <p className="text-white font-mono font-bold text-sm mt-1">{formatMAD(stats?.total)}</p>
                        </div>
                        <div className="bg-zinc-950 px-4 py-4">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Payé</p>
                            <p className="text-status-paid font-mono font-bold text-sm mt-1">{formatMAD(stats?.paid)}</p>
                        </div>
                    </div>

                    {/* Contact info */}
                    <section className="px-6 py-5 space-y-3 border-b border-zinc-800">
                        <h3 className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Coordonnées</h3>
                        <DetailRow icon="mail" label="Email" value={client.email} />
                        <DetailRow icon="call" label="Téléphone" value={client.phone} mono />
                        <DetailRow icon="location_on" label="Adresse" value={client.address} />
                        <DetailRow icon="badge" label="ICE" value={client.ice} mono />
                    </section>

                    {/* Recent invoices */}
                    <section className="px-6 py-5 border-b border-zinc-800">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Factures récentes</h3>
                            <Link href="/invoices" className="text-[10px] text-primary uppercase tracking-wider font-bold hover:underline">
                                Voir tout
                            </Link>
                        </div>
                        {loading ? (
                            <SkeletonList />
                        ) : invoices.length === 0 ? (
                            <p className="text-zinc-500 text-xs">Aucune facture pour ce client.</p>
                        ) : (
                            <ul className="space-y-2">
                                {invoices.map((inv) => (
                                    <DocRow
                                        key={inv.id}
                                        href={`/invoices/${inv.id}`}
                                        number={inv.invoice_number}
                                        date={inv.date || inv.created_at}
                                        amount={inv.total_ttc}
                                        statusType="invoice"
                                        status={inv.status}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Recent quotes */}
                    <section className="px-6 py-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Devis récents</h3>
                            <Link href="/quotes" className="text-[10px] text-primary uppercase tracking-wider font-bold hover:underline">
                                Voir tout
                            </Link>
                        </div>
                        {loading ? (
                            <SkeletonList />
                        ) : quotes.length === 0 ? (
                            <p className="text-zinc-500 text-xs">Aucun devis pour ce client.</p>
                        ) : (
                            <ul className="space-y-2">
                                {quotes.map((q) => (
                                    <DocRow
                                        key={q.id}
                                        href={`/quotes/${q.id}`}
                                        number={q.number}
                                        date={q.date || q.created_at}
                                        amount={q.total_ttc ?? q.total}
                                        statusType="quote"
                                        status={q.status}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                <footer className="px-6 py-4 border-t border-zinc-800 flex gap-3 bg-zinc-950">
                    <button
                        type="button"
                        onClick={onDelete}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition border border-red-500/20"
                    >
                        <span className="material-symbols-outlined text-base">delete</span>
                        Supprimer
                    </button>
                    <button
                        type="button"
                        onClick={onEdit}
                        className="flex-1 bg-brand-gradient text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-glow-sm hover:shadow-glow transition flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-base">edit</span>
                        Modifier
                    </button>
                </footer>
            </aside>
        </div>
    )
}

function DetailRow({ icon, label, value, mono = false }: { icon: string; label: string; value?: string | null; mono?: boolean }) {
    if (!value) return null
    return (
        <div className="flex items-start gap-3 text-sm">
            <span className="material-symbols-outlined text-zinc-500 text-[18px] mt-0.5">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{label}</p>
                <p className={`text-zinc-200 break-words ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
            </div>
        </div>
    )
}

function DocRow({
    href,
    number,
    date,
    amount,
    statusType,
    status,
}: {
    href: string
    number?: string
    date: string
    amount?: number | null
    statusType: 'invoice' | 'quote'
    status: string
}) {
    return (
        <li>
            <Link
                href={href}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/60 hover:border-zinc-700 transition"
            >
                <div className="flex flex-col min-w-0">
                    <span className="font-mono text-xs text-white truncate">{number || 'BROUILLON'}</span>
                    <span className="text-[10px] text-zinc-500">{formatDateShort(date)}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {amount !== undefined && amount !== null && (
                        <span className="font-mono text-xs text-zinc-300">{formatMAD(amount)}</span>
                    )}
                    <StatusPill type={statusType} status={status} />
                </div>
            </Link>
        </li>
    )
}

function SkeletonList() {
    return (
        <ul className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="h-10 rounded-lg bg-zinc-900/60 border border-zinc-800/40 animate-pulse" />
            ))}
        </ul>
    )
}
