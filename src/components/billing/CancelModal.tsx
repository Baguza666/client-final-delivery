'use client'

import { useState } from 'react'
import { cancelSubscription } from '@/app/actions/billing'

interface CancelModalProps {
    open: boolean
    inMoneyBack: boolean
    periodEnd: string | null
    onClose: () => void
    onCancelled: () => void
}

const REASONS = [
    { value: 'too_expensive', label: 'Trop cher' },
    { value: 'not_using',     label: 'Pas assez utilisé' },
    { value: 'missing_feature', label: 'Une fonctionnalité me manque' },
    { value: 'switching',     label: 'Je passe à un concurrent' },
    { value: 'other',         label: 'Autre' },
] as const

export default function CancelModal({ open, inMoneyBack, periodEnd, onClose, onCancelled }: CancelModalProps) {
    const [reason, setReason] = useState<string>(REASONS[0].value)
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!open) return null

    const periodEndStr = periodEnd
        ? new Date(periodEnd).toLocaleDateString('fr-MA')
        : null

    const handleConfirm = async () => {
        setError(null)
        setPending(true)
        const res = await cancelSubscription({ reason })
        setPending(false)
        if (res && 'error' in res && res.error) {
            setError(res.error)
            return
        }
        onCancelled()
        onClose()
    }

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[95] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl">
                <h2 className="text-xl font-bold mb-2">Annuler votre abonnement</h2>

                {inMoneyBack ? (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 mb-4">
                        <p className="font-semibold mb-1">Garantie 30 jours</p>
                        <p>
                            Vous êtes dans la fenêtre de remboursement. Annuler maintenant déclenche un{' '}
                            <strong>remboursement complet immédiat</strong> et un downgrade vers Gratuit.
                        </p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 mb-4">
                        <p>
                            Votre accès Pro continue jusqu&apos;au{' '}
                            <strong>{periodEndStr ?? 'fin de la période en cours'}</strong>.
                            Aucun remboursement après 30 jours.
                        </p>
                    </div>
                )}

                <label className="block text-xs text-white/60 mb-2">
                    Raison de l&apos;annulation (facultatif, mais utile pour nous améliorer)
                </label>
                <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-primary mb-4"
                >
                    {REASONS.map((r) => (
                        <option key={r.value} value={r.value} className="bg-black">
                            {r.label}
                        </option>
                    ))}
                </select>

                {error && (
                    <p className="text-sm text-rose-400 mb-3">{error}</p>
                )}

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 font-medium text-sm transition"
                    >
                        Garder l&apos;abonnement
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={pending}
                        className="rounded-xl bg-rose-500 hover:bg-rose-400 text-white px-4 py-2.5 font-semibold text-sm transition disabled:opacity-50"
                    >
                        {pending ? 'Annulation…' : inMoneyBack ? 'Confirmer + remboursement' : 'Annuler à la fin de la période'}
                    </button>
                </div>
            </div>
        </div>
    )
}
