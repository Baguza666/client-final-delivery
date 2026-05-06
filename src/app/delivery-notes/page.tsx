'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { deleteDocument } from '@/app/actions/documentActions'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import StatusPill from '@/components/ui/StatusPill'
import EmptyState from '@/components/ui/EmptyState'
import DocumentListToolbar from '@/components/documents/DocumentListToolbar'
import { formatDateShort } from '@/utils/format'

const COLS = 5

export default function DeliveryNotesPage() {
    const [notes, setNotes] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDeleting, startTransition] = useTransition()
    const router = useRouter()

    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [dnToDelete, setDnToDelete] = useState<string | null>(null)

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string | null>(null)
    const [sortDesc, setSortDesc] = useState(true)

    const supabase = useMemo(
        () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
        [],
    )

    const fetchNotes = async () => {
        const { data } = await supabase.from('delivery_notes').select('*, client:clients(name)').order('created_at', { ascending: false })
        if (data) setNotes(data)
        setIsLoading(false)
    }

    useEffect(() => {
        fetchNotes()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        const list = notes.filter((dn) => {
            if (statusFilter && (dn.status || 'draft') !== statusFilter) return false
            if (!q) return true
            return (
                (dn.client?.name || '').toLowerCase().includes(q) ||
                (dn.number || '').toLowerCase().includes(q)
            )
        })
        return [...list].sort((a, b) => {
            const da = new Date(a.date || a.created_at).getTime()
            const db = new Date(b.date || b.created_at).getTime()
            return sortDesc ? db - da : da - db
        })
    }, [notes, search, statusFilter, sortDesc])

    const confirmDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setDnToDelete(id)
        setDeleteModalOpen(true)
    }

    const executeDelete = () => {
        if (!dnToDelete) return
        startTransition(async () => {
            await deleteDocument('delivery_notes', dnToDelete, '/delivery-notes')
            await fetchNotes()
            setDeleteModalOpen(false)
            setDnToDelete(null)
        })
    }

    return (
        <div className="min-h-screen">
            <ConfirmationModal
                isOpen={deleteModalOpen}
                title="Supprimer le bon de livraison ?"
                message="Cette action est irréversible. Voulez-vous vraiment supprimer ce bon de livraison définitivement ?"
                onConfirm={executeDelete}
                onCancel={() => setDeleteModalOpen(false)}
                danger
                isLoading={isDeleting}
            />

            <div className="px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-3xl">local_shipping</span>
                                Bons de Livraison
                            </h1>
                            <p className="text-zinc-500 mt-2 text-sm">Suivez vos livraisons clients et leur statut.</p>
                        </div>
                    </div>

                    <DocumentListToolbar
                        docType="delivery_note"
                        search={search}
                        onSearchChange={setSearch}
                        statusFilter={statusFilter}
                        onStatusFilterChange={setStatusFilter}
                        sortDesc={sortDesc}
                        onSortToggle={() => setSortDesc((v) => !v)}
                    />

                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 uppercase tracking-wider text-xs">
                                    <th className="px-6 py-4 font-bold">Numéro</th>
                                    <th className="px-6 py-4 font-bold">Client</th>
                                    <th className="px-6 py-4 font-bold">Date de Livraison</th>
                                    <th className="px-6 py-4 font-bold text-center">Statut</th>
                                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
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
                                                icon="local_shipping"
                                                title={notes.length === 0 ? 'Aucun bon de livraison' : 'Aucun résultat'}
                                                description={
                                                    notes.length === 0
                                                        ? 'Vos bons de livraison apparaîtront ici. Créez-en un depuis un devis accepté.'
                                                        : 'Aucun bon ne correspond à votre recherche ou à votre filtre.'
                                                }
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((dn) => (
                                        <tr
                                            key={dn.id}
                                            onClick={() => router.push(`/delivery-notes/${dn.id}`)}
                                            className="group hover:bg-zinc-800/50 transition-colors duration-200 cursor-pointer"
                                        >
                                            <td className="px-6 py-4 text-white font-mono group-hover:text-primary transition-colors">
                                                {dn.number || 'BROUILLON'}
                                            </td>
                                            <td className="px-6 py-4 text-zinc-300">{dn.client?.name || '-'}</td>
                                            <td className="px-6 py-4 text-zinc-400 text-xs">{formatDateShort(dn.date || dn.created_at)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <StatusPill type="delivery_note" status={dn.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            router.push(`/delivery-notes/${dn.id}`)
                                                        }}
                                                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-md transition-colors"
                                                        title="Voir"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            router.push(`/delivery-notes/${dn.id}/edit`)
                                                        }}
                                                        className="p-1.5 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                        title="Modifier"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => confirmDelete(e, dn.id)}
                                                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
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
