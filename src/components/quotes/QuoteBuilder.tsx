'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Trash2 } from 'lucide-react'
import { createQuote } from './QuoteActions'

interface Client {
    id: string
    name: string
}

interface QuoteItem {
    description: string
    unit: string
    quantity: number
    unit_price: number
    total: number
}

const emptyItem = (): QuoteItem => ({
    description: '',
    unit: 'u',
    quantity: 1,
    unit_price: 0,
    total: 0,
})

export default function QuoteBuilder() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<Client[]>([])
    const [clientId, setClientId] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [discountRate, setDiscountRate] = useState(0)
    const [items, setItems] = useState<QuoteItem[]>([emptyItem()])

    const supabase = useMemo(
        () => createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        ),
        []
    )

    useEffect(() => {
        const fetchClients = async () => {
            const { data } = await supabase.from('clients').select('id, name').order('name')
            if (data) setClients(data)
        }
        fetchClients()
    }, [supabase])

    // Financial calculations: Subtotal -> Discount -> Net HT -> TVA -> Total TTC
    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + item.total, 0)
        const discountAmount = subtotal * (discountRate / 100)
        const netHT = subtotal - discountAmount
        const tva = netHT * 0.2
        const totalTTC = netHT + tva
        return { subtotal, discountAmount, netHT, tva, totalTTC }
    }, [items, discountRate])

    const updateItem = useCallback((index: number, field: keyof QuoteItem, value: string | number) => {
        setItems((prev) => {
            const updated = [...prev]
            const item = { ...updated[index] }

            if (field === 'description') {
                item.description = value as string
            } else if (field === 'unit') {
                item.unit = value as string
            } else {
                const num = typeof value === 'string' ? parseFloat(value) || 0 : value
                if (field === 'quantity') item.quantity = num
                if (field === 'unit_price') item.unit_price = num
            }

            item.total = item.quantity * item.unit_price
            updated[index] = item
            return updated
        })
    }, [])

    const addItem = useCallback(() => setItems(prev => [...prev, emptyItem()]), [])

    const removeItem = useCallback((index: number) => {
        setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index))
    }, [])

    const handleSubmit = async () => {
        if (!clientId) return alert('Sélectionnez un client.')
        if (items.every(i => !i.description.trim())) return alert('Ajoutez au moins un article.')

        setLoading(true)

        const formData = new FormData()
        formData.append('client_id', clientId)
        formData.append('date', date)
        formData.append('discount_rate', discountRate.toString())
        formData.append('subtotal', totals.subtotal.toFixed(2))
        formData.append('net_ht', totals.netHT.toFixed(2))
        formData.append('total_ttc', totals.totalTTC.toFixed(2))
        formData.append('items', JSON.stringify(items))

        const result = await createQuote(formData)

        if (result.success && result.id) {
            router.push(`/quotes/${result.id}`)
        } else {
            alert(`Erreur: ${result.error}`)
        }

        setLoading(false)
    }

    const formatCurrency = (value: number) =>
        value.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DH'

    return (
        <div className="max-w-5xl mx-auto bg-zinc-900/60 backdrop-blur-sm p-8 rounded-2xl border border-zinc-800 shadow-xl">
            <h1 className="text-2xl font-bold text-white mb-8">Nouveau Devis</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Client</label>
                    <select
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500/50"
                    >
                        <option value="">Sélectionner un client</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500/50"
                    />
                </div>
            </div>

            {/* Items Table - WITH UNIT COLUMN */}
            <div className="overflow-x-auto mb-6">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-zinc-500 text-[10px] uppercase border-b border-zinc-700 tracking-widest">
                            <th className="pb-4 w-[40%]">Description</th>
                            <th className="pb-4 text-center w-[10%]">Unité</th>
                            <th className="pb-4 text-center w-[10%]">Qté</th>
                            <th className="pb-4 text-center w-[18%]">Prix Unitaire</th>
                            <th className="pb-4 text-right w-[17%]">Total HT</th>
                            <th className="pb-4 w-[5%]"></th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {items.map((item, i) => (
                            <tr key={i} className="border-b border-zinc-800/50 group">
                                <td className="py-4">
                                    <input
                                        value={item.description}
                                        onChange={(e) => updateItem(i, 'description', e.target.value)}
                                        className="w-full bg-transparent outline-none text-white placeholder:text-zinc-600"
                                        placeholder="Description..."
                                    />
                                </td>
                                <td className="py-4">
                                    <input
                                        value={item.unit}
                                        onChange={(e) => updateItem(i, 'unit', e.target.value)}
                                        className="w-20 bg-transparent outline-none text-white text-center font-mono uppercase"
                                        placeholder="u"
                                        maxLength={10}
                                    />
                                </td>
                                <td className="py-4">
                                    <input
                                        type="number"
                                        min="0"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                                        className="w-full bg-transparent outline-none text-white text-center font-mono"
                                    />
                                </td>
                                <td className="py-4">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unit_price}
                                        onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                                        className="w-full bg-transparent outline-none text-white text-center font-mono"
                                    />
                                </td>
                                <td className="py-4 text-right font-mono text-white">{formatCurrency(item.total)}</td>
                                <td className="py-4 text-center">
                                    <button
                                        type="button"
                                        onClick={() => removeItem(i)}
                                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 text-zinc-400 hover:text-yellow-500 text-sm mb-8 transition-colors"
            >
                <Plus size={16} />
                <span>Ajouter une ligne</span>
            </button>

            {/* Totals: Subtotal -> Discount -> Net HT -> TVA -> Total TTC */}
            <div className="flex flex-col items-end pt-6 border-t border-zinc-700">
                <div className="w-72 space-y-3">
                    <div className="flex justify-between text-sm text-zinc-400">
                        <span>Total HT</span>
                        <span className="text-white font-mono">{formatCurrency(totals.subtotal)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-400">Remise (%)</span>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={discountRate}
                            onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                            className="w-16 bg-zinc-800 border border-zinc-700 text-center text-white text-sm rounded px-2 py-1 font-mono"
                        />
                    </div>

                    {discountRate > 0 && (
                        <div className="flex justify-between text-sm text-zinc-500">
                            <span>Montant Remise</span>
                            <span className="text-red-400 font-mono">-{formatCurrency(totals.discountAmount)}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-sm text-zinc-400">
                        <span>Net HT</span>
                        <span className="text-white font-mono">{formatCurrency(totals.netHT)}</span>
                    </div>

                    <div className="flex justify-between text-sm text-zinc-400">
                        <span>TVA (20%)</span>
                        <span className="text-white font-mono">{formatCurrency(totals.tva)}</span>
                    </div>

                    <div className="flex justify-between text-xl text-[#EAB308] font-bold pt-3 border-t border-zinc-700">
                        <span>Total TTC</span>
                        <span className="font-mono">{formatCurrency(totals.totalTTC)}</span>
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full mt-10 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black py-4 rounded-xl hover:from-yellow-400 hover:to-amber-400 uppercase text-sm tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-yellow-500/20"
            >
                {loading ? 'Création...' : 'CRÉER LE DEVIS'}
            </button>
        </div>
    )
}