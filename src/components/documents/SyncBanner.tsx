'use client'

import { AlertCircle } from "lucide-react"

interface SyncBannerProps {
    isOutOfSync: boolean
    upstreamDocType: 'Quote' | 'PO' | 'Delivery Note'
    onSyncClick: () => void
}

export function SyncBanner({ isOutOfSync, upstreamDocType, onSyncClick }: SyncBannerProps) {
    if (!isOutOfSync) return null

    return (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-md shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-amber-500 mr-3" />
                    <div>
                        <h3 className="text-sm font-medium text-amber-800">
                            Mise à jour disponible
                        </h3>
                        <p className="text-sm text-amber-700 mt-1">
                            Le document source ({upstreamDocType}) a été modifié.
                            Voulez-vous synchroniser les changements ?
                        </p>
                    </div>
                </div>
                <button
                    onClick={onSyncClick}
                    className="bg-amber-100 text-amber-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-200 transition-colors"
                >
                    Examiner & Synchroniser
                </button>
            </div>
        </div>
    )
}