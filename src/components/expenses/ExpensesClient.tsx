'use client'

import React, { useState } from 'react'
import { payDebtInstallment } from '@/app/actions/financeActions'
import AddExpenseModal from '@/components/expenses/AddExpenseModal'
import { useRouter } from 'next/navigation'

interface Props {
    initialDebts: any[]
    initialExpenses: any[]
}

export default function ExpensesClient({ initialDebts, initialExpenses }: Props) {
    const router = useRouter()

    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [payModalOpen, setPayModalOpen] = useState(false)
    const [selectedDebt, setSelectedDebt] = useState<any>(null)
    const [payAmount, setPayAmount] = useState('')
    const [isPaying, setIsPaying] = useState(false)

    const money = (val: number) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(val)

    const openPayment = (debt: any) => {
        setSelectedDebt(debt)
        setPayModalOpen(true)
        setPayAmount('')
    }

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDebt) return

        const val = parseFloat(payAmount)
        if (!val || val <= 0) {
            alert("Veuillez entrer un montant valide.")
            return
        }

        setIsPaying(true)

        // 🛑 CALL SERVER ACTION
        const response = await payDebtInstallment(
            selectedDebt.id,
            val,
            selectedDebt.name || selectedDebt.description || "Dette"
        )

        setIsPaying(false)

        // 🚨 ERROR HANDLING (This fixes the silent fail)
        if (response?.error) {
            alert(`❌ Erreur: ${response.error}`)
            return // Stop here, don't close modal
        }

        // ✅ SUCCESS
        setPayModalOpen(false)
        router.refresh() // Refresh UI
    }

    return (
        <div className="space-y-12 animate-fade-in">
            {/* PAYMENT MODAL */}
            {payModalOpen && selectedDebt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPayModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6 shadow-2xl animate-fade-in">
                        <h2 className="text-xl font-bold text-white mb-1">Rembourser</h2>
                        <p className="text-zinc-500 text-sm mb-6">pour <span className="text-white font-semibold">{selectedDebt.name || "Dette sans nom"}</span></p>

                        <div className="bg-zinc-900/50 rounded-xl p-4 mb-6 border border-zinc-800 flex justify-between items-center">
                            <span className="text-xs text-zinc-500 font-bold uppercase">Restant</span>
                            <span className="text-xl font-mono font-bold text-[#EAB308]">{money(selectedDebt.remaining_amount)} DH</span>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">Montant (DH)</label>
                                <input
                                    type="number"
                                    autoFocus
                                    placeholder="0.00"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-mono focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setPayModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-zinc-400 hover:bg-zinc-900 transition-colors">Annuler</button>
                                <button type="submit" disabled={isPaying || !payAmount} className="flex-1 bg-[#EAB308] text-black px-4 py-3 rounded-xl font-bold hover:bg-[#EAB308]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isPaying ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'Confirmer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ADD EXPENSE MODAL */}
            <AddExpenseModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => router.refresh()}
            />

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 text-white">Gestion Financière</h1>
                    <p className="text-zinc-400 text-sm">Suivi de la trésorerie et des dettes</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] flex items-center gap-2 hover:scale-105"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Nouvelle Dépense
                </button>
            </div>

            {/* DEBTS LIST */}
            {initialDebts.some(d => d.remaining_amount > 0) && (
                <section>
                    <h2 className="text-sm font-bold text-[#EAB308] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">account_balance</span>
                        Dettes en cours
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {initialDebts.filter(d => d.remaining_amount > 0).map((debt) => (
                            <div key={debt.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group hover:border-zinc-600 transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{debt.name || "Dette sans nom"}</h3>
                                        <p className="text-xs text-zinc-500 mt-1">Échéance: {new Date(debt.due_date).toLocaleDateString('fr-FR')}</p>
                                    </div>
                                    <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">En Cours</span>
                                </div>
                                <div className="mb-6">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-zinc-500 text-xs uppercase font-bold">Reste à payer</span>
                                        <span className="text-xl font-mono font-bold text-white group-hover:text-[#EAB308] transition-colors">
                                            {money(debt.remaining_amount)} <span className="text-xs text-zinc-600">DH</span>
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-[#EAB308] to-orange-500" style={{ width: `${((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100}%` }}></div>
                                    </div>
                                </div>
                                <button onClick={() => openPayment(debt)} className="w-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white py-3 rounded-xl text-xs font-bold transition-all border border-white/5 flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-base">payments</span>
                                    Payer une échéance
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* EXPENSES HISTORY */}
            <section>
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                    Historique des Dépenses
                </h2>
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800/80 bg-black/40 text-zinc-500 uppercase tracking-wider text-[10px]">
                                <th className="px-6 py-4 font-bold">Date</th>
                                <th className="px-6 py-4 font-bold">Description</th>
                                <th className="px-6 py-4 font-bold">Catégorie</th>
                                <th className="px-6 py-4 font-bold">Preuve</th>
                                <th className="px-6 py-4 font-bold text-right">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {initialExpenses.map((expense) => (
                                <tr key={expense.id} className="group hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 text-zinc-500 text-xs font-mono">{new Date(expense.date).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-6 py-4 font-medium text-white">{expense.description}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase ${expense.category === 'Dette' ? 'bg-orange-500/10 text-orange-500' : 'bg-zinc-800 text-zinc-400'}`}>
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {expense.proof_url ? (
                                            <a href={expense.proof_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs underline decoration-blue-500/30">
                                                <span className="material-symbols-outlined text-[14px]">attach_file</span>
                                                Reçu
                                            </a>
                                        ) : <span className="text-zinc-700 text-xs italic">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-white font-bold">
                                        -{money(expense.amount)} <span className="text-zinc-600 text-xs font-normal">DH</span>
                                    </td>
                                </tr>
                            ))}
                            {initialExpenses.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-600 italic">Aucune dépense récente.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}