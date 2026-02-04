'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SyncBanner } from '@/components/documents/SyncBanner'
import { SyncModal } from '@/components/documents/SyncModal'
import { syncInvoiceWithDN } from '@/app/actions/syncActions'

// 🔴 REMOVED: import { SyncItem } from '@/utils/syncEngine'

// 🟢 INLINED: Define the type here to bypass the import error
type SyncItem = {
    line_uid?: string
    description: string
    quantity?: number
    quantity_delivered?: number
    unit_price?: number
    total?: number
    [key: string]: any
}

type Props = {
    invoice: any
    deliveryNote: any
}

export default function InvoiceSyncManager({ invoice, deliveryNote }: Props) {
    const [isModalOpen, setModalOpen] = useState(false)
    const router = useRouter()

    // 1. Safety Check
    if (!deliveryNote) return null

    // 2. Check Sync Status
    const isOutOfSync = invoice.upstream_hash_at_sync !== deliveryNote.content_hash

    const handleConfirmSync = async () => {
        const result = await syncInvoiceWithDN(invoice.id, deliveryNote.id)
        if (result.success) {
            router.refresh()
        } else {
            alert("Erreur lors de la synchronisation")
        }
    }

    return (
        <>
            <SyncBanner
                isOutOfSync={isOutOfSync}
                upstreamDocType="Delivery Note"
                onSyncClick={() => setModalOpen(true)}
            />

            <SyncModal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                onConfirm={handleConfirmSync}
                docType="invoice"
                // Map DB items to the SyncItem interface
                upstreamItems={deliveryNote.dn_items.map((i: any) => ({ ...i, quantity: i.quantity_delivered }))}
                downstreamItems={invoice.invoice_items}
            />
        </>
    )
}