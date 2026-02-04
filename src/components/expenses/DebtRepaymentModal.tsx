'use client'

import { useState } from 'react'
import { payDebt } from '@/app/actions/expenses'

interface Props {
    debt: any
    isOpen: boolean
    onClose: () => void
}

export default function DebtRepaymentModal({ debt, isOpen, onClose }: Props) {
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen || !debt) return null

    // Safe fallback for the name to avoid "undefined"
    const debtName = debt.name || debt.description || "Dette Inconnue"

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const val = parseFloat(amount)
        if (!val || val <= 0) return

        if (val > debt.remaining_amount) {
            alert("Vous ne pouvez pas payer plus que le montant restant.")
            return
        }

        setLoading(true)
        await payDebt(debt.id, val, debtName)
        setLoading(false)
        onClose()
        setAmount('')
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6 shadow-2xl animate-fade-in">

                <h2 className="text-xl font-bold text-white mb-1">Rembourser une dette</h2>
                <p className="text-zinc-500 text-sm mb-6">pour <span className="text-white font-semibold">{debtName}</span></p>

                <div className="bg-zinc-900/50 rounded-xl p-4 mb-6 border border-zinc-800">
                    <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Reste à payer</p>
                    <p className="text-2xl font-mono font-bold text-red-500">
                        {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(debt.remaining_amount)}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">Montant du versement</label>
                        <input
                            type="number"
                            autoFocus
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-mono focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] outline-none transition-all"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl font-bold text-zinc-400 hover:bg-zinc-900 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !amount}
                            className="flex-1 bg-[#EAB308] text-black px-4 py-3 rounded-xl font-bold hover:bg-[#EAB308]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <span className="material-symbols-outlined animate-spin text-xl">refresh</span> : 'Confirmer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}