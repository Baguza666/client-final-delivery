'use client'

import { useState } from 'react'
import { createInvoice } from '@/app/actions/invoices'
import { formatMAD } from '@/utils/format'

const fieldClass = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none transition-all placeholder:text-zinc-600'
const labelClass = 'block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 tracking-wider'

export default function NewInvoiceForm({ clients, nextNumber }: { clients: any[]; nextNumber: string }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [number, setNumber] = useState(nextNumber)
    const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0 }])

    const totalHT = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const totalTTC = totalHT * 1.2

    const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: 0 }])
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))
    const updateItem = (index: number, field: string, value: any) => {
        const next = [...items]
        // @ts-ignore
        next[index][field] = value
        setItems(next)
    }

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError('')
        const result = await createInvoice(formData)
        if (result?.error) {
            setError(result.error)
            setLoading(false)
        }
    }

    return (
        <form action={handleSubmit} className="max-w-5xl mx-auto space-y-6">

            {/* Header: Number, Dates, Client */}
            <div className="bg-white/[0.025] border border-white/[0.06] p-6 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                    <div>
                        <label className={labelClass}>Numéro de facture</label>
                        <input
                            type="text"
                            name="number"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            className={fieldClass + ' font-mono'}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Date d'émission</label>
                        <input
                            type="date"
                            name="date"
                            defaultValue={new Date().toISOString().split('T')[0]}
                            className={fieldClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Échéance</label>
                        <input
                            type="date"
                            name="due_date"
                            defaultValue={new Date().toISOString().split('T')[0]}
                            className={fieldClass}
                        />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Client</label>
                    <select name="client_id" required className={fieldClass + ' appearance-none cursor-pointer'}>
                        <option value="">Sélectionner un client…</option>
                        {clients?.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Items */}
            <div className="bg-white/[0.025] border border-white/[0.06] p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-zinc-500">list_alt</span>
                    Services & Produits
                </h3>

                <div className="space-y-3">
                    {/* Column headers */}
                    <div className="grid grid-cols-12 gap-4 px-1">
                        <div className="col-span-6 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Description</div>
                        <div className="col-span-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider text-center">Qté</div>
                        <div className="col-span-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider text-right">Prix unit.</div>
                        <div className="col-span-1" />
                    </div>

                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-4 items-center bg-white/[0.03] border border-white/[0.04] p-3 rounded-xl">
                            <div className="col-span-6">
                                <input
                                    name={`item_desc_${index}`}
                                    placeholder="Ex: Peinture façade…"
                                    value={item.description}
                                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                                    className="w-full bg-transparent border-b border-white/[0.10] py-1 text-white text-sm outline-none focus:border-primary/60 placeholder:text-zinc-700"
                                    required
                                />
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="number"
                                    placeholder="1"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                    className="w-full bg-transparent border-b border-white/[0.10] py-1 text-white text-sm text-center outline-none focus:border-primary/60"
                                />
                            </div>
                            <div className="col-span-3">
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={item.unit_price}
                                        onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                                        className="w-full bg-transparent border-b border-white/[0.10] py-1 text-white text-sm text-right outline-none focus:border-primary/60 pr-10"
                                    />
                                    <span className="absolute right-0 top-1 text-zinc-600 text-xs">MAD</span>
                                </div>
                            </div>
                            <div className="col-span-1 flex justify-center">
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="text-zinc-700 hover:text-rose-400 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={addItem}
                    className="mt-5 text-primary text-xs font-bold flex items-center gap-2 hover:opacity-80 uppercase tracking-wide"
                >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Ajouter une ligne
                </button>

                <input type="hidden" name="items" value={JSON.stringify(items)} />
            </div>

            {/* Totals + Submit */}
            <div className="bg-white/[0.025] border border-white/[0.06] p-6 rounded-2xl flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-16 text-sm">
                        <span className="text-zinc-500">Total HT</span>
                        <span className="font-mono text-white">{formatMAD(totalHT)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-16 text-sm">
                        <span className="text-zinc-500">TVA (20%)</span>
                        <span className="font-mono text-white">{formatMAD(totalHT * 0.2)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-16 border-t border-white/[0.06] pt-2 mt-1">
                        <span className="font-bold text-white">Total TTC</span>
                        <span className="font-mono font-bold text-primary text-xl">{formatMAD(totalTTC)}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    {error && (
                        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-right">
                            {error}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Création…
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                Créer la facture
                            </>
                        )}
                    </button>
                </div>
            </div>

        </form>
    )
}
