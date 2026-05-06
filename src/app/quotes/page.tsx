'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { deleteDocument } from '@/app/actions/documentActions'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import StatusPill from '@/components/ui/StatusPill'
import EmptyState from '@/components/ui/EmptyState'
import DocumentListToolbar from '@/components/documents/DocumentListToolbar'
import { formatMAD, formatDateShort } from '@/utils/format'

const COLS = 6

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDeleting, startTransition] = useTransition()
    const router = useRouter()

    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null)

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string | null>(null)
    const [sortDesc, setSortDesc] = useState(true)

    const supabase = useMemo(
        () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
        [],
    )

    const fetchQuotes = async () => {
        const { data } = await supabase.from('quotes').select('*, client:clients(name)').order('created_at', { ascending: false })
        if (data) setQuotes(data)
        setIsLoading(false)
    }

    useEffect(() => {
        fetchQuotes()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        const list = quotes.filter((quote) => {
            if (statusFilter && (quote.status || 'draft') !== statusFilter) return false
            if (!q) return true
            return (
                (quote.client?.name || '').toLowerCase().includes(q) ||
                (quote.number || '').toLowerCase().includes(q)
            )
        })
        return [...list].sort((a, b) => {
            const da = new Date(a.date || a.created_at).getTime()
            const db = new Date(b.date || b.created_at).getTime()
            return sortDesc ? db - da : da - db
        })
    }, [quotes, search, statusFilter, sortDesc])

    const confirmDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setQuoteToDelete(id)
        setDeleteModalOpen(true)
    }

    const executeDelete = () => {
        if (!quoteToDelete) return
        startTransition(async () => {
            await deleteDocument('quotes', quoteToDelete, '/quotes')
            await fetchQuotes()
            setDeleteModalOpen(false)
            setQuoteToDelete(null)
        })
    }

    return (
        <div className="min-h-screen flex">
            <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                <ConfirmationModal
                    isOpen={deleteModalOpen}
                    title="Supprimer le devis ?"
                    message="Cette action est irréversible. Voulez-vous vraiment supprimer ce devis définitivement ?"
                    onConfirm={executeDelete}
                    onCancel={() => setDeleteModalOpen(false)}
                danger
                    isLoading={isDeleting}
                />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-3xl">description</span>
                            Devis
                        </h1>
                        <p className="text-zinc-500 mt-2 text-sm">Gérez vos propositions commerciales et suivez leur statut.</p>
                    </div>
                    <Link
                        href="/quotes/new"
                        className="bg-brand-gradient text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-glow-sm hover:shadow-glow flex items-center gap-2 text-sm"
                    >
                        <span className="material-symbols-outlined text-base">add</span>
                        Nouveau Devis
                    </Link>
                </div>

                <DocumentListToolbar
                    docType="quote"
                    search={search}
                    onSearchChange={setSearch}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    sortDesc={sortDesc}
                    onSortToggle={() => setSortDesc((v) => !v)}
                />

                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-500 uppercase tracking-wider text-[11px]">
                                    <th className="px-6 py-4 font-bold">Numéro</th>
                                    <th className="px-6 py-4 font-bold">Client</th>
                                    <th className="px-6 py-4 font-bold">Date</th>
                                    <th className="px-6 py-4 font-bold text-right">Total TTC</th>
                                    <th className="px-6 py-4 font-bold text-center">Statut</th>
                                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            {Array.from({ length: COLS }).map((__, j) => (
                                                <td key={j} className="px-6 py-4">
                                                    <div className="h-3 bg-zinc-800 rounded animate-pulse" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={COLS} className="p-0">
                                            <EmptyState
                                                icon="description"
                                                title={quotes.length === 0 ? 'Aucun devis pour l’instant' : 'Aucun résultat'}
                                                description={
                                                    quotes.length === 0
                                                        ? 'Créez votre premier devis pour proposer vos services à un client.'
                                                        : 'Aucun devis ne correspond à votre recherche ou à votre filtre.'
                                                }
                                                ctaHref={quotes.length === 0 ? '/quotes/new' : undefined}
                                                ctaLabel={quotes.length === 0 ? 'Créer un devis' : undefined}
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((quote) => (
                                        <tr
                                            key={quote.id}
                                            onClick={() => router.push(`/quotes/${quote.id}`)}
                                            className="group hover:bg-zinc-900/40 transition-colors duration-200 cursor-pointer"
                                        >
                                            <td className="px-6 py-4 font-mono text-white font-medium group-hover:text-primary transition-colors">
                                                {quote.number || 'BROUILLON'}
                                            </td>
                                            <td className="px-6 py-4 text-zinc-300 font-medium">{quote.client?.name || '-'}</td>
                                            <td className="px-6 py-4 text-zinc-500 text-xs">{formatDateShort(quote.date || quote.created_at)}</td>
                                            <td className="px-6 py-4 text-right font-mono text-zinc-300 font-medium">
                                                {formatMAD(quote.total_amount || 0)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <StatusPill type="quote" status={quote.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            router.push(`/quotes/${quote.id}`)
                                                        }}
                                                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                                        title="Voir"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            router.push(`/quotes/${quote.id}/edit`)
                                                        }}
                                                        className="p-2 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        title="Modifier"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => confirmDelete(e, quote.id)}
                                                        className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Supprimer"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
