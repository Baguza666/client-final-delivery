'use client'

import React, { useState, useTransition } from 'react'
import { updateStatus, deleteDocument } from '@/app/actions/documentActions'
import { DocumentType, getStatusOptions, getStatusEntry, TONE_DOT } from '@/utils/status'

interface DocumentActionsProps {
    table: string;
    id: string;
    currentStatus: string;
    redirectAfterDelete: string;
}

const TABLE_TO_TYPE: Record<string, DocumentType> = {
    invoices: 'invoice',
    quotes: 'quote',
    purchase_orders: 'purchase_order',
    delivery_notes: 'delivery_note',
}

export default function DocumentActions({ table, id, currentStatus, redirectAfterDelete }: DocumentActionsProps) {
    const [status, setStatus] = useState(currentStatus)
    const [isPending, startTransition] = useTransition()
    const [isDeleting, setIsDeleting] = useState(false)

    const docType = TABLE_TO_TYPE[table] ?? 'invoice'
    const options = getStatusOptions(docType)
    const activeEntry = getStatusEntry(docType, status)

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus)
        startTransition(async () => {
            await updateStatus(table, id, newStatus)
        })
    }

    const handleDelete = async () => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;
        setIsDeleting(true)
        await deleteDocument(table, id, redirectAfterDelete)
    }

    return (
        <div className="flex items-center gap-3 bg-zinc-900 p-2 rounded-lg border border-zinc-800 no-print">
            <div className="relative">
                <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={isPending}
                    aria-label="Changer le statut"
                    className="appearance-none pl-8 pr-8 py-1.5 rounded-md text-xs font-bold uppercase text-white outline-none cursor-pointer hover:opacity-90 transition-all bg-zinc-800 border border-zinc-700"
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-zinc-900 text-gray-300">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isPending ? (
                        <div className="w-2 h-2 rounded-full border-2 border-white/50 border-t-white animate-spin"></div>
                    ) : (
                        <div className={`w-2 h-2 rounded-full ${TONE_DOT[activeEntry.tone]}`}></div>
                    )}
                </div>
                <span className="material-symbols-outlined text-base text-zinc-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
            </div>

            <div className="w-px h-6 bg-zinc-700 mx-1"></div>

            <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-zinc-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-500/10"
                title="Supprimer"
            >
                {isDeleting ? '...' : <span className="material-symbols-outlined text-lg">delete</span>}
            </button>
        </div>
    )
}
