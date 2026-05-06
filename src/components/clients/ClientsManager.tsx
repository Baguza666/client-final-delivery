'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useModal } from '@/components/ui/ModalProvider'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import EmptyState from '@/components/ui/EmptyState'
import ClientsList from './ClientsList'
import ClientFormModal, { ClientFormValues } from './ClientFormModal'
import ClientDetailDrawer from './ClientDetailDrawer'
import { ClientStats } from './ClientCard'
import { createNewClient, updateClient, deleteClient, deleteClientsBulk } from '@/app/actions/clients'

interface ClientsManagerProps {
    clients: any[]
    statsById: Record<string, ClientStats>
    isLoading: boolean
    onChanged: () => Promise<void>
}

const SkeletonCard = () => (
    <div className="rounded-xl p-5 border border-zinc-800 bg-zinc-900/40 animate-pulse">
        <div className="flex items-start justify-between mb-4 pl-7">
            <div className="w-12 h-12 rounded-full bg-zinc-800" />
        </div>
        <div className="h-4 bg-zinc-800 rounded w-2/3 mb-2" />
        <div className="h-3 bg-zinc-800 rounded w-1/3 mb-5" />
        <div className="h-3 bg-zinc-800 rounded w-3/4 mb-2" />
        <div className="h-3 bg-zinc-800 rounded w-1/2 mb-4" />
        <div className="pt-3 border-t border-zinc-800/80 flex justify-between">
            <div className="h-3 bg-zinc-800 rounded w-1/4" />
            <div className="h-3 bg-zinc-800 rounded w-1/3" />
        </div>
    </div>
)

export default function ClientsManager({ clients, statsById, isLoading, onChanged }: ClientsManagerProps) {
    const router = useRouter()
    const { showModal } = useModal()

    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState<'all' | 'client' | 'supplier'>('all')
    const [submitting, setSubmitting] = useState(false)

    const [createOpen, setCreateOpen] = useState(false)
    const [editing, setEditing] = useState<any | null>(null)
    const [openClient, setOpenClient] = useState<any | null>(null)

    const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const supabase = useMemo(
        () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
        [],
    )

    // Clear stale selections when client list changes
    useEffect(() => {
        const validIds = new Set(clients.map((c) => c.id))
        setSelectedIds((prev) => {
            const next = new Set<string>()
            prev.forEach((id) => {
                if (validIds.has(id)) next.add(id)
            })
            return next.size === prev.size ? prev : next
        })
    }, [clients])

    const filteredClients = useMemo(() => {
        const q = searchTerm.trim().toLowerCase()
        return clients.filter((client) => {
            if (typeFilter === 'client' && client.type === 'supplier') return false
            if (typeFilter === 'supplier' && client.type !== 'supplier' && client.type !== 'both') return false
            if (!q) return true
            return (
                (client.name?.toLowerCase() || '').includes(q) ||
                (client.email?.toLowerCase() || '').includes(q) ||
                (client.city?.toLowerCase() || '').includes(q) ||
                (client.phone || '').includes(q)
            )
        })
    }, [clients, searchTerm, typeFilter])

    const selectionMode = selectedIds.size > 0

    const typeTabs = useMemo(() => {
        const tabBase = 'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border'
        const tabActive = tabBase + ' bg-primary/10 border-primary/30 text-primary'
        const tabInactive = tabBase + ' bg-white/[0.025] border-white/[0.06] text-zinc-500 hover:text-zinc-300'
        return [
            { val: 'all' as const, label: 'Tous', icon: 'groups', count: clients.length, cls: typeFilter === 'all' ? tabActive : tabInactive },
            { val: 'client' as const, label: 'Clients', icon: 'person', count: clients.filter(c => c.type === 'client' || !c.type).length, cls: typeFilter === 'client' ? tabActive : tabInactive },
            { val: 'supplier' as const, label: 'Fournisseurs', icon: 'store', count: clients.filter(c => c.type === 'supplier' || c.type === 'both').length, cls: typeFilter === 'supplier' ? tabActive : tabInactive },
        ]
    }, [clients, typeFilter])

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const clearSelection = () => setSelectedIds(new Set())

    const handleCreate = async (values: ClientFormValues) => {
        setSubmitting(true)
        const fd = new FormData()
        Object.entries(values).forEach(([k, v]) => v !== undefined && fd.append(k, String(v)))
        const result = await createNewClient(fd)
        setSubmitting(false)

        if (result.success) {
            setCreateOpen(false)
            await onChanged()
            showModal({ title: 'Client créé', message: result.message || 'Client ajouté avec succès.', type: 'success' })
        } else {
            showModal({ title: 'Erreur', message: result.message || 'Création impossible.', type: 'error' })
        }
    }

    const handleEdit = async (values: ClientFormValues) => {
        if (!editing) return
        setSubmitting(true)
        const fd = new FormData()
        fd.append('id', editing.id)
        Object.entries(values).forEach(([k, v]) => k !== 'id' && v !== undefined && fd.append(k, String(v)))
        const result = await updateClient(fd)
        setSubmitting(false)

        if (result.success) {
            setEditing(null)
            // If the drawer is showing this client, close + reopen with refreshed data
            if (openClient && openClient.id === editing.id) setOpenClient(null)
            await onChanged()
            showModal({ title: 'Client mis à jour', message: 'Les modifications ont été enregistrées.', type: 'success' })
        } else {
            showModal({ title: 'Erreur', message: result.message || 'Mise à jour impossible.', type: 'error' })
        }
    }

    const performDelete = async (target: any) => {
        setDeleteLoading(true)
        const result = await deleteClient(target.id)
        setDeleteLoading(false)
        setDeleteTarget(null)

        if (result.success) {
            if (openClient && openClient.id === target.id) setOpenClient(null)
            await onChanged()
            showModal({ title: 'Client supprimé', message: `${target.name || 'Le client'} a bien été supprimé.`, type: 'success' })
        } else {
            showModal({ title: 'Erreur', message: result.message || 'Suppression impossible.', type: 'error' })
        }
    }

    const performBulkDelete = async () => {
        const ids = Array.from(selectedIds)
        if (!ids.length) return
        setDeleteLoading(true)
        const result = await deleteClientsBulk(ids)
        setDeleteLoading(false)
        setBulkDeleteOpen(false)

        if (result.success) {
            clearSelection()
            await onChanged()
            showModal({ title: 'Suppression effectuée', message: result.message || 'Suppression effectuée.', type: 'success' })
        } else {
            showModal({ title: 'Erreur', message: result.message || 'Suppression impossible.', type: 'error' })
        }
    }

    return (
        <div className="min-h-screen text-white">
            <main className="max-w-7xl mx-auto p-8 md:p-12">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-3xl">groups</span>
                            Contacts
                        </h1>
                        <p className="text-zinc-500 mt-2 text-sm">Clients et fournisseurs de votre carnet d'adresses.</p>
                    </div>
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="bg-brand-gradient text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-glow-sm hover:shadow-glow flex items-center gap-2 text-sm self-start md:self-auto"
                    >
                        <span className="material-symbols-outlined text-base">add</span>
                        Nouveau Contact
                    </button>
                </div>

                {/* TYPE TABS */}
                <div className="flex gap-2 mb-6">
                    {typeTabs.map((tab) => (
                        <button key={tab.val} onClick={() => setTypeFilter(tab.val)} className={tab.cls}>
                            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                            {tab.label}
                            <span className="text-xs opacity-60 font-mono">{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* SEARCH BAR */}
                <div className="mb-8 relative group max-w-2xl">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors pointer-events-none">
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Rechercher un client (nom, email, ville, téléphone)…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="Rechercher"
                        className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors placeholder:text-zinc-600"
                    />
                </div>

                {/* CONTENT */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : clients.length === 0 ? (
                    <EmptyState
                        icon="groups"
                        title="Aucun client"
                        description="Ajoutez vos premiers clients pour commencer à émettre devis et factures."
                        ctaLabel="Ajouter un client"
                    >
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="mt-2 bg-brand-gradient text-white font-bold py-2 px-5 rounded-lg text-sm shadow-glow-sm hover:shadow-glow transition inline-flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">add</span>
                            Ajouter un client
                        </button>
                    </EmptyState>
                ) : filteredClients.length === 0 ? (
                    <EmptyState
                        icon="search_off"
                        title="Aucun résultat"
                        description={`Aucun client ne correspond à « ${searchTerm} ».`}
                    />
                ) : (
                    <ClientsList
                        clients={filteredClients}
                        statsById={statsById}
                        selectedIds={selectedIds}
                        selectionMode={selectionMode}
                        onOpen={(c) => setOpenClient(c)}
                        onEdit={(c) => setEditing(c)}
                        onDelete={(c) => setDeleteTarget(c)}
                        onToggleSelect={toggleSelect}
                    />
                )}
            </main>

            {/* BULK SELECTION BAR */}
            {selectionMode && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4 animate-fade-in">
                    <span className="text-sm font-medium text-white">
                        <span className="text-primary font-bold">{selectedIds.size}</span> sélectionné(s)
                    </span>
                    <button
                        type="button"
                        onClick={clearSelection}
                        className="text-xs uppercase tracking-wider font-bold text-zinc-400 hover:text-white transition"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={() => setBulkDeleteOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition uppercase tracking-wider"
                    >
                        <span className="material-symbols-outlined text-base">delete</span>
                        Supprimer
                    </button>
                </div>
            )}

            {/* CREATE / EDIT MODALS */}
            <ClientFormModal
                isOpen={createOpen}
                mode="create"
                submitting={submitting}
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
            />
            <ClientFormModal
                isOpen={!!editing}
                mode="edit"
                initial={editing ? {
                    id: editing.id,
                    name: editing.name || '',
                    email: editing.email || '',
                    phone: editing.phone || '',
                    city: editing.city || '',
                    address: editing.address || '',
                    ice: editing.ice || '',
                    type: editing.type || 'client',
                } : undefined}
                submitting={submitting}
                onClose={() => setEditing(null)}
                onSubmit={handleEdit}
            />

            {/* DETAIL DRAWER */}
            <ClientDetailDrawer
                client={openClient}
                stats={openClient ? statsById[openClient.id] : undefined}
                onClose={() => setOpenClient(null)}
                onEdit={() => {
                    if (openClient) {
                        setEditing(openClient)
                        setOpenClient(null)
                    }
                }}
                onDelete={() => {
                    if (openClient) {
                        setDeleteTarget(openClient)
                        setOpenClient(null)
                    }
                }}
            />

            {/* DELETE CONFIRMATIONS */}
            <ConfirmationModal
                isOpen={!!deleteTarget}
                title="Supprimer ce client ?"
                message={`Cette action est irréversible. Toutes les données associées à « ${deleteTarget?.name || ''} » seront perdues.`}
                onConfirm={() => deleteTarget && performDelete(deleteTarget)}
                onCancel={() => setDeleteTarget(null)}
                danger
                isLoading={deleteLoading}
            />
            <ConfirmationModal
                isOpen={bulkDeleteOpen}
                title={`Supprimer ${selectedIds.size} client(s) ?`}
                message="Cette action est irréversible et concernera tous les clients sélectionnés."
                onConfirm={performBulkDelete}
                onCancel={() => setBulkDeleteOpen(false)}
                danger
                isLoading={deleteLoading}
            />
        </div>
    )
}
