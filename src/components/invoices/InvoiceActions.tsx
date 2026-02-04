'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function InvoiceActions({ invoiceId }: { invoiceId: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handlePrint = () => {
        window.print() // This opens the browser's PDF/Print dialog
    }

    const handleSend = async () => {
        if (!confirm("Voulez-vous envoyer cette facture par email au client ?")) return

        setLoading(true)
        try {
            // We will connect this to the real server action later
            await new Promise(resolve => setTimeout(resolve, 1000)) // Fake delay
            alert("✅ Email envoyé avec succès !")
        } catch (e) {
            alert("❌ Erreur lors de l'envoi.")
        }
        setLoading(false)
    }

    return (
        <div className="flex items-center gap-3 mb-8 print:hidden">
            {/* EDIT BUTTON */}
            <Link
                href={`/invoices/${invoiceId}/edit`}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium border border-white/10"
            >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Modifier
            </Link>

            {/* DOWNLOAD / PRINT BUTTON */}
            <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium border border-white/10"
            >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Télécharger PDF
            </button>

            {/* SEND EMAIL BUTTON */}
            <button
                onClick={handleSend}
                disabled={loading}
                className="flex items-center gap-2 bg-white hover:bg-gray-200 text-black px-4 py-2 rounded-lg transition-colors text-sm font-bold ml-auto"
            >
                {loading ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                ) : (
                    <span className="material-symbols-outlined text-[18px]">send</span>
                )}
                Envoyer au client
            </button>
        </div>
    )
}