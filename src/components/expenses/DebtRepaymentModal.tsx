'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { payDebtInstallment } from '@/app/actions/financeActions'
import { formatMAD } from '@/utils/format'

interface Debt {
    id: string
    name?: string
    description?: string
    remaining_amount: number
}

interface Props {
    debt: Debt
    isOpen: boolean
    onClose: () => void
}

export default function DebtRepaymentModal({ debt, isOpen, onClose }: Props) {
    const router = useRouter()
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    if (!isOpen) return null

    const debtName = debt.name || debt.description || 'Dette'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        const val = parseFloat(amount)
        if (!val || val <= 0) {
            setError('Veuillez entrer un montant valide.')
            return
        }
        if (val > debt.remaining_amount) {
            setError('Le montant ne peut pas dépasser le solde restant.')
            return
        }
        setLoading(true)
        const res = await payDebtInstallment(debt.id, val, debtName)
        setLoading(false)
        if (res?.error) {
            setError(res.error)
            return
        }
        setAmount('')
        onClose()
        router.refresh()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onKeyDown={handleKeyDown}
        >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-bold text-white">Rembourser</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-zinc-500 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                <p className="text-zinc-500 text-sm mb-6">
                    pour <span className="text-white font-semibold">{debtName}</span>
                </p>

                <div className="bg-zinc-800/50 rounded-xl p-4 mb-6 border border-zinc-800 flex justify-between items-center">
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Solde restant</span>
                    <span className="text-xl font-mono font-bold text-primary">{formatMAD(debt.remaining_amount)}</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">
                            Montant du versement
                        </label>
                        <input
                            type="number"
                            autoFocus
                            placeholder="0.00"
                            step="0.01"
                            value={amount}
                            onChange={(e) => { setAmount(e.target.value); setError('') }}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-lg font-mono focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none transition-all"
                        />
                        {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl font-bold text-zinc-400 hover:bg-zinc-800 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !amount}
                            className="flex-1 bg-primary text-white px-4 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading
                                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : 'Confirmer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
