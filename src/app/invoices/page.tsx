'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { deleteDocument } from '@/app/actions/documentActions'
import { generateRecurringInvoices, sendOverdueReminders, bulkMarkInvoicesPaid, bulkDeleteInvoices } from '@/app/actions/invoices'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import StatusPill from '@/components/ui/StatusPill'
import EmptyState from '@/components/ui/EmptyState'
import DocumentListToolbar from '@/components/documents/DocumentListToolbar'
import QuickInvoiceModal from '@/components/invoices/QuickInvoiceModal'
import { formatMAD, formatDateShort } from '@/utils/format'

const COLS = 7

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDeleting, startTransition] = useTransition()
    const router = useRouter()

    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)
    const [generatingRecurring, setGeneratingRecurring] = useState(false)
    const [recurringMsg, setRecurringMsg] = useState<string | null>(null)
    const [quickOpen, setQuickOpen] = useState(false)
    const [quickClients, setQuickClients] = useState<{ id: string; name: string }[]>([])

    // Overdue reminders
    const [reminderModalOpen, setReminderModalOpen] = useState(false)
    const [sendingReminders, setSendingReminders] = useState(false)
    const [reminderMsg, setReminderMsg] = useState<string | null>(null)

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string | null>(null)
    const [sortDesc, setSortDesc] = useState(true)

    // Bulk selection
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [bulkActionMsg, setBulkActionMsg] = useState<string | null>(null)
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
    const [bulkWorking, setBulkWorking] = useState(false)

    const supabase = useMemo(
        () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
        [],
    )

    const fetchInvoices = async () => {
        const { data } = await supabase.from('invoices').select('*, client:clients(name)').order('created_at', { ascending: false })
        if (data) setInvoices(data)
        setIsLoading(false)
    }

    useEffect(() => {
        fetchInvoices()
        supabase.from('clients').select('id,name').order('name').then(({ data }) => {
            if (data) setQuickClients(data)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        const list = invoices.filter((inv) => {
            if (statusFilter && (inv.status || 'draft') !== statusFilter) return false
            if (!q) return true
            return (
                (inv.client?.name || '').toLowerCase().includes(q) ||
                (inv.invoice_number || '').toLowerCase().includes(q)
            )
        })
        return [...list].sort((a, b) => {
            const da = new Date(a.date || a.created_at).getTime()
            const db = new Date(b.date || b.created_at).getTime()
            return sortDesc ? db - da : da - db
        })
    }, [invoices, search, statusFilter, sortDesc])

    // Derived: overdue count for badge
    const overdueCount = useMemo(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return invoices.filter((inv) => {
            if (!['sent', 'partial', 'pending', 'en_attente'].includes(inv.status || '')) return false
            if (!inv.due_date) return false
            return new Date(inv.due_date) < today
        }).length
    }, [invoices])

    const confirmDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setInvoiceToDelete(id)
        setDeleteModalOpen(true)
    }

    const executeDelete = () => {
        if (!invoiceToDelete) return
        startTransition(async () => {
            await deleteDocument('invoices', invoiceToDelete, '/invoices')
            await fetchInvoices()
            setDeleteModalOpen(false)
            setInvoiceToDelete(null)
        })
    }

    const handleSendReminders = async () => {
        setSendingReminders(true)
        setReminderModalOpen(false)
        setReminderMsg(null)
        const res = await sendOverdueReminders()
        setSendingReminders(false)
        setReminderMsg(res.message)
        setTimeout(() => setReminderMsg(null), 6000)
    }

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }

    const allFilteredSelected = filtered.length > 0 && filtered.every((inv) => selected.has(inv.id))

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            setSelected(new Set())
        } else {
            setSelected(new Set(filtered.map((inv) => inv.id)))
        }
    }

    const handleBulkMarkPaid = async () => {
        setBulkWorking(true)
        const ids = [...selected]
        const res = await bulkMarkInvoicesPaid(ids)
        setBulkWorking(false)
        setSelected(new Set())
        setBulkActionMsg(res.error ? `Erreur: ${res.error}` : `${res.updated} facture(s) marquee(s) payee(s)`)
        setTimeout(() => setBulkActionMsg(null), 5000)
        await fetchInvoices()
    }

    const handleBulkDelete = async () => {
        setBulkDeleteModalOpen(false)
        setBulkWorking(true)
        const ids = [...selected]
        const res = await bulkDeleteInvoices(ids)
        setBulkWorking(false)
        setSelected(new Set())
        setBulkActionMsg(res.error ? `Erreur: ${res.error}` : `${res.deleted} facture(s) supprimee(s)`)
        setTimeout(() => setBulkActionMsg(null), 5000)
        await fetchInvoices()
    }

    const handleBulkExport = () => {
        const selectedInvoices = filtered.filter((inv) => selected.has(inv.id))
        const BOM = '﻿'
        const header = ['Numero', 'Client', 'Date', 'Total TTC', 'Statut'].join(';')
        const rows = selectedInvoices.map((inv) =>
            [
                inv.invoice_number || 'BROUILLON',
                (inv.client?.name || '-').replace(/;/g, ','),
                inv.date || inv.created_at || '',
                (inv.total_ttc || 0).toString().replace('.', ','),
                inv.status || 'draft',
            ].join(';')
        )
        const csv = BOM + [header, ...rows].join('\r\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'factures_selection.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="min-h-screen">
            <QuickInvoiceModal
                isOpen={quickOpen}
                onClose={() => { setQuickOpen(false); fetchInvoices() }}
                clients={quickClients}
            />
            <ConfirmationModal
                isOpen={deleteModalOpen}
                title="Supprimer la facture ?"
                message="Cette action est irréversible. Voulez-vous vraiment supprimer cette facture définitivement ?"
                onConfirm={executeDelete}
                onCancel={() => setDeleteModalOpen(false)}
                danger
                isLoading={isDeleting}
            />
            <ConfirmationModal
                isOpen={reminderModalOpen}
                title={overdueCount > 0 ? `Envoyer ${overdueCount} rappel(s) ?` : "Envoyer les rappels"}
                message={overdueCount > 0
                    ? `${overdueCount} facture(s) en retard avec une adresse email. Un rappel de paiement sera envoyé à chaque client concerné.`
                    : "Aucune facture en retard avec échéance passée et email client disponible."}
                onConfirm={overdueCount > 0 ? handleSendReminders : () => setReminderModalOpen(false)}
                onCancel={() => setReminderModalOpen(false)}
                danger={false}
                isLoading={sendingReminders}
            />
            <ConfirmationModal
                isOpen={bulkDeleteModalOpen}
                title={`Supprimer ${selected.size} facture(s) ?`}
                message="Cette action est irreversible. Les factures selectionnees seront supprimees definitivement."
                onConfirm={handleBulkDelete}
                onCancel={() => setBulkDeleteModalOpen(false)}
                danger
                isLoading={bulkWorking}
            />

            <div className="px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-3xl">receipt_long</span>
                                Factures
                            </h1>
                            <p className="text-zinc-500 mt-2 text-sm">
                                {overdueCount > 0 && (
                                    <span className="text-rose-400 font-semibold">{overdueCount} en retard · </span>
                                )}
                                Gérez vos factures clients et suivez leur règlement.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {(recurringMsg || reminderMsg) && (
                                <span className="text-xs text-zinc-400 bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-lg max-w-xs">
                                    {recurringMsg || reminderMsg}
                                </span>
                            )}
                            {/* Overdue reminders */}
                            <button
                                onClick={() => setReminderModalOpen(true)}
                                disabled={sendingReminders}
                                className="relative flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 font-semibold py-2.5 px-4 rounded-lg transition-all text-sm disabled:opacity-50"
                                title="Envoyer des rappels de paiement aux clients en retard"
                            >
                                <span className={`material-symbols-outlined text-base ${sendingReminders ? 'animate-spin' : ''}`}>
                                    {sendingReminders ? 'progress_activity' : 'notification_important'}
                                </span>
                                Rappels
                                {overdueCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                                        {overdueCount > 9 ? '9+' : overdueCount}
                                    </span>
                                )}
                            </button>
                            {/* Recurring */}
                            <button
                                onClick={async () => {
                                    setGeneratingRecurring(true)
                                    setRecurringMsg(null)
                                    const res = await generateRecurringInvoices()
                                    setGeneratingRecurring(false)
                                    setRecurringMsg(res.message || (res.error ? `Erreur: ${res.error}` : null))
                                    if (res.generated && res.generated > 0) fetchInvoices()
                                    setTimeout(() => setRecurringMsg(null), 5000)
                                }}
                                disabled={generatingRecurring}
                                className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 font-semibold py-2.5 px-4 rounded-lg transition-all text-sm disabled:opacity-50"
                                title="Générer les factures récurrentes dues"
                            >
                                <span className={`material-symbols-outlined text-base ${generatingRecurring ? 'animate-spin' : ''}`}>autorenew</span>
                                Récurrentes
                            </button>
                            <Link
                                href="/invoices/new"
                                className="bg-brand-gradient text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-glow-sm hover:shadow-glow flex items-center gap-2 text-sm"
                            >
                                <span className="material-symbols-outlined text-base">add</span>
                                Nouvelle Facture
                            </Link>
                        </div>
                    </div>

                    <DocumentListToolbar
                        docType="invoice"
                        search={search}
                        onSearchChange={setSearch}
                        statusFilter={statusFilter}
                        onStatusFilterChange={setStatusFilter}
                        sortDesc={sortDesc}
                        onSortToggle={() => setSortDesc((v) => !v)}
                    />

                    {/* Bulk action bar */}
                    {selected.size > 0 && (
                        <div className="mb-3 flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3">
                            <span className="text-sm font-bold text-primary">{selected.size} selectionnee(s)</span>
                            <div className="flex items-center gap-2 ml-auto">
                                {bulkActionMsg && (
                                    <span className="text-xs text-zinc-400 bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700">{bulkActionMsg}</span>
                                )}
                                <button
                                    onClick={handleBulkMarkPaid}
                                    disabled={bulkWorking}
                                    className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs px-3 py-2 rounded-lg transition-all disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                    Marquer payees
                                </button>
                                <button
                                    onClick={handleBulkExport}
                                    disabled={bulkWorking}
                                    className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-bold text-xs px-3 py-2 rounded-lg transition-all disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    Exporter CSV
                                </button>
                                <button
                                    onClick={() => setBulkDeleteModalOpen(true)}
                                    disabled={bulkWorking}
                                    className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs px-3 py-2 rounded-lg transition-all disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                    Supprimer
                                </button>
                                <button
                                    onClick={() => setSelected(new Set())}
                                    className="text-zinc-500 hover:text-zinc-300 text-xs px-2 py-2 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[640px]">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 uppercase tracking-wider text-[10px]">
                                    <th className="px-4 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={allFilteredSelected}
                                            onChange={toggleSelectAll}
                                            className="accent-primary w-4 h-4 cursor-pointer rounded"
                                            title="Tout selectionner"
                                        />
                                    </th>
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
                                                icon="receipt_long"
                                                title={invoices.length === 0 ? "Aucune facture pour l'instant" : 'Aucun resultat'}
                                                description={
                                                    invoices.length === 0
                                                        ? 'Creez votre premiere facture pour suivre vos paiements et vos clients.'
                                                        : 'Aucune facture ne correspond a votre recherche ou a votre filtre.'
                                                }
                                                ctaHref={invoices.length === 0 ? '/invoices/new' : undefined}
                                                ctaLabel={invoices.length === 0 ? 'Creer une facture' : undefined}
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((invoice) => {
                                        const today = new Date()
                                        today.setHours(0, 0, 0, 0)
                                        const isOverdue = invoice.due_date
                                            && new Date(invoice.due_date) < today
                                            && ['sent', 'partial', 'pending', 'en_attente'].includes(invoice.status || '')
                                        const isSelected = selected.has(invoice.id)
                                        return (
                                            <tr
                                                key={invoice.id}
                                                onClick={() => router.push(`/invoices/${invoice.id}`)}
                                                className={"group transition-colors duration-200 cursor-pointer " + (isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-zinc-800/60")}
                                            >
                                                <td className="px-4 py-4 w-10" onClick={(e) => { e.stopPropagation(); toggleSelect(invoice.id) }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelect(invoice.id)}
                                                        className="accent-primary w-4 h-4 cursor-pointer rounded"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 font-mono text-white group-hover:text-primary transition-colors">
                                                    <span>{invoice.invoice_number || 'BROUILLON'}</span>
                                                    {isOverdue && (
                                                        <span className="ml-2 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                                                            EN RETARD
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-300">{invoice.client?.name || '-'}</td>
                                                <td className="px-6 py-4 text-zinc-500 text-xs">{formatDateShort(invoice.date || invoice.created_at)}</td>
                                                <td className="px-6 py-4 text-right font-mono text-zinc-300">
                                                    {formatMAD(invoice.total_ttc)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <StatusPill type="invoice" status={invoice.status} />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); router.push(`/invoices/${invoice.id}`) }}
                                                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-md transition-colors"
                                                            title="Voir"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); router.push(`/invoices/${invoice.id}/edit`) }}
                                                            className="p-1.5 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                            title="Modifier"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => confirmDelete(e, invoice.id)}
                                                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                                                            title="Supprimer"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Mobile FAB */}
            <button
                type="button"
                onClick={() => setQuickOpen(true)}
                className="md:hidden fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full bg-brand-gradient shadow-glow flex items-center justify-center text-white"
                aria-label="Facture rapide"
            >
                <span className="material-symbols-outlined text-[26px]">bolt</span>
            </button>
        </div>
    )
}
