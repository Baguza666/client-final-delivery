'use client'

import { useState } from 'react'
import { addPayment, deletePayment } from '@/app/actions/payments'

interface Payment {
    id: string
    amount: number
    payment_date: string
    method: string
    notes?: string | null
    created_at: string
}

interface PaymentLedgerProps {
    invoiceId: string
    totalTTC: number
    payments: Payment[]
}

const METHOD_LABELS: Record<string, string> = {
    virement: 'Virement',
    especes: 'Espèces',
    cheque: 'Chèque',
    carte: 'Carte',
    autre: 'Autre',
}

function fmt(n: number) {
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function PaymentLedger({ invoiceId, totalTTC, payments: initialPayments }: PaymentLedgerProps) {
    const [payments, setPayments] = useState<Payment[]>(initialPayments)
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
    const remaining = Math.max(0, totalTTC - totalPaid)
    const pct = totalTTC > 0 ? Math.min(100, (totalPaid / totalTTC) * 100) : 0
    const isPaid = totalPaid >= totalTTC && totalTTC > 0

    const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const fd = new FormData(e.currentTarget)
        const result = await addPayment(invoiceId, fd)
        setLoading(false)
        if (result?.error) {
            setError(result.error)
        } else if (result?.payment) {
            // Use the real database row (with its persisted id) so deletes work
            setPayments(prev => [result.payment, ...prev])
            setShowForm(false);
            (e.target as HTMLFormElement).reset()
        }
    }

    const handleDelete = async (paymentId: string) => {
        if (!confirm('Supprimer ce paiement ?')) return
        setDeleting(paymentId)
        const result = await deletePayment(paymentId, invoiceId)
        setDeleting(null)
        if (result?.error) {
            setError(result.error)
        } else {
            setPayments(prev => prev.filter(p => p.id !== paymentId))
        }
    }

    return (
        <div className="w-full max-w-[210mm] mx-auto mt-8 mb-12 print:hidden">
            <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-bold text-white">Suivi des paiements</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            {isPaid
                                ? 'Facture entièrement réglée'
                                : `Reste à régler : ${fmt(remaining)} DH`}
                        </p>
                    </div>
                    <button
                        onClick={() => { setShowForm(!showForm); setError(null) }}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Ajouter un paiement
                    </button>
                </div>

                {/* Progress bar */}
                <div className="mb-5">
                    <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                        <span>Payé : <span className="text-white font-bold">{fmt(totalPaid)} DH</span></span>
                        <span>Total TTC : <span className="text-white font-bold">{fmt(totalTTC)} DH</span></span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${isPaid ? 'bg-green-500' : 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <p className="text-right text-xs text-zinc-600 mt-1">{pct.toFixed(0)}% réglé</p>
                </div>

                {/* Add payment form */}
                {showForm && (
                    <form onSubmit={handleAdd} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-5 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Montant (DH)</label>
                                <input
                                    name="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder={fmt(remaining)}
                                    required
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Date</label>
                                <input
                                    name="payment_date"
                                    type="date"
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                    required
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Mode de paiement</label>
                                <select
                                    name="method"
                                    defaultValue="virement"
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none"
                                >
                                    <option value="virement">Virement</option>
                                    <option value="especes">Espèces</option>
                                    <option value="cheque">Chèque</option>
                                    <option value="carte">Carte</option>
                                    <option value="autre">Autre</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Référence / Notes</label>
                                <input
                                    name="notes"
                                    type="text"
                                    placeholder="Optionnel"
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none"
                                />
                            </div>
                        </div>
                        {error && (
                            <div className="text-rose-400 text-xs flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">error</span>
                                {error}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setError(null) }}
                                className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 text-xs font-semibold py-2 rounded-xl transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1"
                            >
                                {loading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[14px]">check</span>}
                                Enregistrer
                            </button>
                        </div>
                    </form>
                )}

                {/* Payments list */}
                {payments.length === 0 ? (
                    <div className="text-center py-8 text-zinc-600 text-sm">Aucun paiement enregistré.</div>
                ) : (
                    <div className="space-y-2">
                        {payments.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary text-[16px]">payments</span>
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm">{fmt(Number(p.amount))} DH</p>
                                        <p className="text-zinc-500 text-xs">
                                            {new Date(p.payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            {' · '}{METHOD_LABELS[p.method] || p.method}
                                            {p.notes ? ` · ${p.notes}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(p.id)}
                                    disabled={deleting === p.id}
                                    className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                                >
                                    {deleting === p.id
                                        ? <span className="w-3 h-3 border-2 border-zinc-600 border-t-white rounded-full animate-spin inline-block" />
                                        : <span className="material-symbols-outlined text-[16px]">delete</span>}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
