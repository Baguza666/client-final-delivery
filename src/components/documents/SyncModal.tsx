'use client'

import { useState, useEffect } from 'react'

// --- 1. INLINED ENGINE (Bypasses the "Module not found" error) ---

export type SyncItem = {
    line_uid?: string
    description: string
    quantity?: number
    quantity_delivered?: number
    unit_price?: number
    total?: number
    [key: string]: any
}

export type DiffChange = {
    current: SyncItem
    new: SyncItem
    changes: string[]
    conflicts: string[]
}

export type DiffResult = {
    added: SyncItem[]
    removed: SyncItem[]
    changed: DiffChange[]
}

function calculateDiff(upstreamItems: SyncItem[], downstreamItems: SyncItem[], docType: 'po' | 'dn' | 'invoice'): DiffResult {
    const added: SyncItem[] = []
    const removed: SyncItem[] = []
    const changed: DiffChange[] = []

    const downstreamMap = new Map<string, SyncItem>()
    downstreamItems.forEach(item => {
        if (item.line_uid) downstreamMap.set(item.line_uid, item)
    })

    upstreamItems.forEach(upItem => {
        if (!upItem.line_uid) return

        const downItem = downstreamMap.get(upItem.line_uid)

        if (!downItem) {
            added.push(upItem)
        } else {
            const changes: string[] = []

            if (upItem.description !== downItem.description) changes.push('description')

            const upQty = Number(upItem.quantity ?? upItem.quantity_delivered ?? 0)
            const downQty = Number(downItem.quantity ?? downItem.quantity_delivered ?? 0)
            if (upQty !== downQty) changes.push('quantity')

            if (downItem.unit_price !== undefined) {
                const upPrice = Number(upItem.unit_price ?? 0)
                const downPrice = Number(downItem.unit_price ?? 0)
                if (upPrice !== downPrice) changes.push('price')
            }

            if (changes.length > 0) {
                changed.push({ current: downItem, new: upItem, changes, conflicts: [] })
            }
            downstreamMap.delete(upItem.line_uid)
        }
    })

    downstreamMap.forEach(downItem => removed.push(downItem))

    return { added, removed, changed }
}

// --- 2. MAIN COMPONENT ---

interface SyncModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => Promise<void>
    upstreamItems: SyncItem[]
    downstreamItems: SyncItem[]
    docType: 'po' | 'dn' | 'invoice'
}

export function SyncModal({
    isOpen, onClose, onConfirm,
    upstreamItems, downstreamItems, docType
}: SyncModalProps) {

    const [diff, setDiff] = useState<DiffResult | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            const result = calculateDiff(upstreamItems, downstreamItems, docType)
            setDiff(result)
        }
    }, [isOpen, upstreamItems, downstreamItems, docType])

    const handleApply = async () => {
        setLoading(true)
        await onConfirm()
        setLoading(false)
        onClose()
    }

    if (!isOpen || !diff) return null

    const hasConflicts = diff.changed.some(c => c.conflicts.length > 0)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white text-black border border-zinc-200 p-0 rounded-2xl shadow-2xl max-w-2xl w-full relative overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-xl font-bold uppercase tracking-tight">Synchronisation</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-4">

                    {/* Added */}
                    {diff.added.map(item => (
                        <div key={item.line_uid} className="bg-green-50 border border-green-200 p-3 rounded-lg flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider border border-green-200 px-1.5 py-0.5 rounded bg-white">Ajouté</span>
                                <p className="font-medium mt-1 text-sm">{item.description}</p>
                            </div>
                            <div className="text-right"><p className="text-sm font-bold">Qty: {item.quantity ?? item.quantity_delivered}</p></div>
                        </div>
                    ))}

                    {/* Removed */}
                    {diff.removed.map(item => (
                        <div key={item.line_uid} className="bg-red-50 border border-red-200 p-3 rounded-lg flex justify-between items-center opacity-75">
                            <div>
                                <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider border border-red-200 px-1.5 py-0.5 rounded bg-white">Supprimé</span>
                                <p className="font-medium mt-1 text-sm line-through text-gray-500">{item.description}</p>
                            </div>
                        </div>
                    ))}

                    {/* Changed */}
                    {diff.changed.map((change, idx) => (
                        <div key={idx} className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider border border-orange-200 px-1.5 py-0.5 rounded bg-white">Modifié ({change.changes.join(', ')})</span>
                                    <p className="font-medium mt-1 text-sm">{change.new.description}</p>
                                </div>
                                <div className="text-sm text-right">
                                    <div className="text-gray-400 line-through text-xs">Qty: {change.current.quantity ?? change.current.quantity_delivered}</div>
                                    <div className="font-bold text-gray-900">Qty: {change.new.quantity ?? change.new.quantity_delivered}</div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">check_circle</span>
                            <p>Aucune différence détectée.</p>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-black border border-gray-300 rounded-lg hover:bg-white transition-all">Annuler</button>
                    <button
                        onClick={handleApply}
                        disabled={loading || hasConflicts || (diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0)}
                        className={`px-6 py-2 text-sm font-bold text-white rounded-lg shadow-lg flex items-center gap-2 transition-all ${(loading || hasConflicts || (diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0)) ? "bg-gray-400 cursor-not-allowed shadow-none" : "bg-black hover:scale-105"
                            }`}
                    >
                        {loading ? "..." : "Appliquer"}
                    </button>
                </div>
            </div>
        </div>
    )
}