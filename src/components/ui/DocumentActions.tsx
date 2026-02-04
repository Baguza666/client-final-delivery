'use client'

import React, { useState, useTransition } from 'react'
// 👇 Import the server actions we just fixed in Step 1
import { updateStatus, deleteDocument } from '@/app/actions/documentActions'

interface DocumentActionsProps {
    table: string;
    id: string;
    currentStatus: string;
    redirectAfterDelete: string;
}

const STATUS_OPTIONS: Record<string, string[]> = {
    quotes: ['draft', 'sent', 'accepted', 'rejected'],
    invoices: ['draft', 'sent', 'paid', 'overdue'],
    delivery_notes: ['pending', 'livré', 'returned'],
    purchase_orders: ['pending', 'validé', 'reçu'],
}

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-zinc-500',
    pending: 'bg-orange-500',
    sent: 'bg-blue-500',
    accepted: 'bg-green-600',
    validé: 'bg-emerald-600',
    paid: 'bg-emerald-600',
    livré: 'bg-purple-600',
    reçu: 'bg-purple-600',
    rejected: 'bg-red-600',
    overdue: 'bg-red-600',
}

export default function DocumentActions({ table, id, currentStatus, redirectAfterDelete }: DocumentActionsProps) {
    const [status, setStatus] = useState(currentStatus)
    const [isPending, startTransition] = useTransition()
    const [isDeleting, setIsDeleting] = useState(false)

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
                    className={`appearance-none pl-8 pr-8 py-1.5 rounded-md text-xs font-bold uppercase text-white outline-none cursor-pointer hover:opacity-90 transition-all ${STATUS_COLORS[status] || 'bg-zinc-600'}`}
                >
                    {STATUS_OPTIONS[table]?.map(s => (
                        <option key={s} value={s} className="bg-zinc-900 text-gray-300 capitalize">
                            {s}
                        </option>
                    ))}
                </select>
                {/* Status Indicator Dot */}
                <div className="absolute left-2.5 top-1.5 pointer-events-none">
                    {isPending ? (
                        <div className="w-2 h-2 rounded-full border-2 border-white/50 border-t-white animate-spin"></div>
                    ) : (
                        <div className="w-2 h-2 rounded-full bg-white/50"></div>
                    )}
                </div>
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