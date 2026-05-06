'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useModal } from '@/components/ui/ModalProvider'

interface QuickItem {
    description: string
    quantity: number
    unit_price: number
}

interface QuickInvoiceModalProps {
    isOpen: boolean
    onClose: () => void
    clients: { id: string; name: string }[]
}

const EMPTY_ITEM: QuickItem = { description: '', quantity: 1, unit_price: 0 }

export default function QuickInvoiceModal({ isOpen, onClose, clients }: QuickInvoiceModalProps) {
    const router = useRouter()
    const { showModal } = useModal()

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [clientId, setClientId] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [items, setItems] = useState<QuickItem[]>([{ ...EMPTY_ITEM }])

    useEffect(() => {
        if (!isOpen) {
            setStep(1)
            setClientId('')
            setDate(new Date().toISOString().split('T')[0])
            setItems([{ ...EMPTY_ITEM }])
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const totalHT = items.reduce((s, it) => s + it.quantity * it.unit_price, 0)
    const totalTVA = totalHT * 0.2
    const totalTTC = totalHT + totalTVA
    const selectedClient = clients.find(c => c.id === clientId)

    const setItem = (i: number, field: keyof QuickItem, val: string | number) => {
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
    }

    const handleSubmit = async () => {
        if (!clientId) return
        setLoading(true)
        const fullItems = items.map(it => ({ ...it, unit: 'u', tva_rate: 20 }))
        const formData = new FormData()
        formData.append('client_id', clientId)
        formData.append('date', date)
        formData.append('due_date', '')
        formData.append('discount', '0')
        formData.append('notes', '')
        formData.append('items', JSON.stringify(fullItems))
        formData.append('is_recurring', 'false')
        formData.append('currency', 'MAD')
        formData.append('exchange_rate', '1')

        const { createInvoice } = await import('@/app/actions/invoices')
        const result = await createInvoice(formData)
        setLoading(false)

        if (result?.error) {
            showModal({ title: 'Erreur', message: result.error, type: 'error' })
        } else {
            onClose()
            showModal({
                title: 'Facture creee',
                message: 'Votre facture a ete creee avec succes.',
                type: 'success',
                onConfirm: () => { router.push('/invoices'); router.refresh() },
            })
        }
    }

    const inputCls = "w-full bg-white/[0.05] border border-white/[0.1] rounded-2xl px-4 py-4 text-white text-base focus:ring-2 focus:ring-primary/40 focus:border-primary/60 outline-none transition-all placeholder:text-zinc-600"
    const canStep1 = !!clientId
    const canStep2 = items.every(it => it.description.trim() && it.unit_price > 0)

    return (
        <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="bg-[#111] border border-white/[0.08] w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in">

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
                            Facture rapide
                        </h2>
                        <div className="flex gap-1.5 mt-2">
                            {[1, 2, 3].map(s => (
                                <div
                                    key={s}
                                    className={"h-1 rounded-full transition-all " + (s <= step ? "bg-primary w-6" : "bg-zinc-700 w-4")}
                                />
                            ))}
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

                    {/* Step 1: Client */}
                    {step === 1 && (
                        <>
                            <p className="text-sm text-zinc-400">Etape 1 — Choisissez le client</p>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Client</label>
                                <select
                                    value={clientId}
                                    onChange={e => setClientId(e.target.value)}
                                    className={inputCls + " appearance-none"}
                                >
                                    <option value="">Selectionner…</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                        </>
                    )}

                    {/* Step 2: Items */}
                    {step === 2 && (
                        <>
                            <p className="text-sm text-zinc-400">Etape 2 — Articles et prestations</p>
                            {items.map((it, i) => (
                                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Article {i + 1}</span>
                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                                                className="text-zinc-600 hover:text-rose-400 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Description"
                                        value={it.description}
                                        onChange={e => setItem(i, 'description', e.target.value)}
                                        className={inputCls}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-zinc-600 mb-1">Quantite</label>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={it.quantity}
                                                onChange={e => setItem(i, 'quantity', parseFloat(e.target.value) || 1)}
                                                className={inputCls + " font-mono"}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-zinc-600 mb-1">Prix unitaire</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={it.unit_price || ''}
                                                onChange={e => setItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                                                className={inputCls + " font-mono"}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-right text-sm font-bold text-primary font-mono">
                                        {(it.quantity * it.unit_price).toFixed(2)} MAD HT
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setItems(prev => [...prev, { ...EMPTY_ITEM }])}
                                className="w-full py-3.5 border border-dashed border-white/[0.1] rounded-2xl text-sm text-zinc-500 hover:text-white hover:border-primary/40 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Ajouter un article
                            </button>
                        </>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                        <>
                            <p className="text-sm text-zinc-400">Etape 3 — Verification</p>
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Client</span>
                                    <span className="text-white font-bold">{selectedClient?.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Date</span>
                                    <span className="text-white">{date}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Articles</span>
                                    <span className="text-white">{items.length}</span>
                                </div>
                            </div>
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Total HT</span>
                                    <span className="text-white font-mono">{totalHT.toFixed(2)} MAD</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">TVA 20%</span>
                                    <span className="text-white font-mono">{totalTVA.toFixed(2)} MAD</span>
                                </div>
                                <div className="flex justify-between text-base font-bold border-t border-white/[0.06] pt-2 mt-2">
                                    <span className="text-white">Total TTC</span>
                                    <span className="text-primary font-mono">{totalTTC.toFixed(2)} MAD</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer nav */}
                <div className="px-6 py-5 border-t border-white/[0.06] flex gap-3 shrink-0">
                    {step > 1 && (
                        <button
                            type="button"
                            onClick={() => setStep(s => s - 1)}
                            className="flex-1 py-4 rounded-2xl border border-white/[0.1] text-zinc-400 hover:text-white font-bold text-sm transition-all"
                        >
                            Retour
                        </button>
                    )}
                    {step < 3 ? (
                        <button
                            type="button"
                            onClick={() => setStep(s => s + 1)}
                            disabled={step === 1 ? !canStep1 : !canStep2}
                            className="flex-1 py-4 rounded-2xl bg-primary text-white font-bold text-sm disabled:opacity-40 transition-all"
                        >
                            Suivant
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 py-4 rounded-2xl bg-brand-gradient text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-glow-sm"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creation…
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">check</span>
                                    Creer la facture
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
