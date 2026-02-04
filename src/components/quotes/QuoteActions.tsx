'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptQuote } from '@/app/actions/acceptQuote'
import StatusModal from '@/components/ui/StatusModal'

export default function QuoteActions({ quoteId, status }: { quoteId: string, status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Modal States
  const [showConfirm, setShowConfirm] = useState(false)
  const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'success' as 'success' | 'error', message: '' })

  const handleAccept = async () => {
    setShowConfirm(false) // Close confirm dialog
    setLoading(true)

    try {
      const result = await acceptQuote(quoteId)
      if (result.success) {
        setStatusModal({ isOpen: true, type: 'success', message: "Devis validé ! Documents (BC, BL, Facture) générés." })
        router.refresh()
      } else {
        setStatusModal({ isOpen: true, type: 'error', message: result.message || "Erreur inconnue" })
      }
    } catch (e) {
      setStatusModal({ isOpen: true, type: 'error', message: "Une erreur système est survenue." })
    }
    setLoading(false)
  }

  if (status === 'accepted') {
    return (
      <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-3 rounded-xl flex items-center gap-2 font-bold">
        <span className="material-symbols-outlined">check_circle</span>
        Devis Accepté & Converti
      </div>
    )
  }

  return (
    <>
      {/* 1. Status Modal (Success/Error) */}
      <StatusModal
        isOpen={statusModal.isOpen}
        type={statusModal.type}
        message={statusModal.message}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
      />

      {/* 2. Custom Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-white/10 p-8 rounded-2xl max-w-md w-full text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">rocket_launch</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 uppercase">Valider le Devis ?</h3>
            <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
              Cette action est irréversible. Elle générera automatiquement :<br />
              • Bon de Commande<br />
              • Bon de Livraison<br />
              • Facture Brouillon
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-white/10 text-white font-bold rounded-xl hover:bg-white/5"
              >
                ANNULER
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 py-3 bg-gold-gradient text-black font-bold rounded-xl hover:scale-105 transition-transform"
              >
                CONFIRMER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. The Action Buttons */}
      <div className="flex gap-4">
        <button
          className="px-6 py-3 border border-white/10 text-zinc-400 font-bold rounded-xl hover:bg-white/5 cursor-not-allowed"
        >
          Éditer
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className="px-6 py-3 bg-gold-gradient text-black font-bold rounded-xl shadow-glow hover:scale-105 transition-transform flex items-center gap-2"
        >
          {loading ? 'Traitement...' : 'VALIDER LE DEVIS'}
          <span className="material-symbols-outlined">rocket_launch</span>
        </button>
      </div>
    </>
  )
}