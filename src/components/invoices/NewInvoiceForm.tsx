'use client'

import { useState } from 'react'
import { createInvoice } from '@/app/actions/invoices'

export default function NewInvoiceForm({ clients, nextNumber }: { clients: any[], nextNumber: string }) {
    const [loading, setLoading] = useState(false)

    // Form State
    const [number, setNumber] = useState(nextNumber)
    const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0 }])

    // Calculate Totals Live
    const totalHT = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)

    const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: 0 }])
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items]
        // @ts-ignore
        newItems[index][field] = value
        setItems(newItems)
    }

    // ✅ THE FIX: Wrapper function to handle the Server Action response
    async function handleSubmit(formData: FormData) {
        setLoading(true)

        // Call the server action
        const result = await createInvoice(formData)

        // If there is an error returned, show it and stop loading
        if (result?.error) {
            alert(result.error)
            setLoading(false)
        }
        // If success, the server action will redirect automatically
    }

    return (
        // ✅ Use handleSubmit instead of createInvoice directly
        <form action={handleSubmit} className="max-w-5xl mx-auto">

            {/* HEADER: NUMBER & DATES */}
            <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8 mb-8">
                <div className="grid grid-cols-3 gap-8">

                    {/* 1. EDITABLE NUMBER */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Numéro de Facture</label>
                        <input
                            type="text"
                            name="number"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-lg focus:border-yellow-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Date d'émission</label>
                        <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500 outline-none" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Échéance</label>
                        <input type="date" name="due_date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500 outline-none" />
                    </div>
                </div>

                {/* CLIENT SELECTOR */}
                <div className="mt-8">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Client</label>
                    <select name="client_id" className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500 outline-none appearance-none" required>
                        <option value="">Sélectionner un client...</option>
                        {clients?.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ITEMS TABLE */}
            <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8 mb-8">
                <h3 className="text-lg font-bold text-white mb-6">Services & Produits</h3>

                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div key={index} className="flex gap-4 items-start group">
                            <div className="flex-1">
                                <input
                                    name={`item_desc_${index}`} // ignored, used for UI state
                                    placeholder="Description..."
                                    value={item.description}
                                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500 outline-none"
                                    required
                                />
                            </div>
                            <div className="w-24">
                                <input
                                    type="number"
                                    placeholder="Qté"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white text-center focus:border-yellow-500 outline-none"
                                />
                            </div>
                            <div className="w-40">
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="Prix"
                                        value={item.unit_price}
                                        onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white text-right focus:border-yellow-500 outline-none pr-12"
                                    />
                                    <span className="absolute right-4 top-3 text-zinc-500 text-sm">DH</span>
                                </div>
                            </div>
                            <div className="w-10 pt-3 flex justify-center">
                                {items.length > 1 && (
                                    <button type="button" onClick={() => removeItem(index)} className="text-zinc-600 hover:text-red-500 transition-colors">
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <button type="button" onClick={addItem} className="mt-6 text-sm font-bold text-yellow-500 hover:text-yellow-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">add_circle</span>
                    AJOUTER UNE LIGNE
                </button>

                {/* HIDDEN INPUT TO SEND ITEMS TO SERVER */}
                <input type="hidden" name="items" value={JSON.stringify(items)} />
            </div>

            {/* FOOTER ACTIONS */}
            <div className="flex justify-between items-center">
                <div className="text-right flex-1 mr-8">
                    <p className="text-zinc-500 text-sm">Total HT</p>
                    <p className="text-3xl font-bold text-white">{new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(totalHT)}</p>
                    <p className="text-zinc-500 text-xs mt-1">+ TVA (20%): {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(totalHT * 0.2)}</p>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-yellow-500 text-black text-lg font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform flex items-center gap-2"
                >
                    {loading ? 'Création...' : 'CRÉER LA FACTURE'}
                    {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
                </button>
            </div>

        </form>
    )
}