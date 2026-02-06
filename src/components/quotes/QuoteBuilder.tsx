'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Trash2, Calendar, User } from 'lucide-react'
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

    // Calculations
    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + item.total, 0)
        const discountAmount = subtotal * (discountRate / 100)
        const netHT = subtotal - discountAmount
        const tva = netHT * 0.2
        const totalTTC = netHT + tva
        return { subtotal, discountAmount, netHT, tva, totalTTC }
    }, [items, discountRate])

    // Handlers
    const updateItem = useCallback((index: number, field: keyof QuoteItem, value: string | number) => {
        setItems((prev) => {
            const updated = [...prev]
            const item = { ...updated[index] }

            if (field === 'description' || field === 'unit') {
                (item as any)[field] = value
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
    const removeItem = useCallback((index: number) => setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index)), [])

    const handleSubmit = async () => {
        if (!clientId) return alert('Sélectionnez un client.')
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
        if (result.success && result.id) router.push(`/quotes/${result.id}`)
        else alert(`Erreur: ${result.error}`)

        setLoading(false)
    }

    const formatCurrency = (value: number) => value.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DH'

    return (
        // ✅ LAYOUT FIX: 'pl-72' matches the sidebar width perfectly
        <div className="min-h-screen bg-black pl-72 text-white">
            <div className="max-w-6xl mx-auto p-12">

                {/* Clean Header */}
                <div className="mb-10 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Nouveau Devis</h1>
                        <p className="text-zinc-500 mt-2 font-medium">Création d'un devis client</p>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-[#111] border border-zinc-800 rounded-2xl p-8 shadow-2xl">

                    {/* Client & Date Selector */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[11px] font-bold uppercase text-zinc-500 tracking-wider">
                                <User size={14} /> Client
                            </label>
                            <div className="relative">
                                <select
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-white outline-none focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] appearance-none transition-all cursor-pointer"
                                >
                                    <option value="">-- Sélectionner un client --</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                    <span className="material-symbols-outlined text-sm">expand_more</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[11px] font-bold uppercase text-zinc-500 tracking-wider">
                                <Calendar size={14} /> Date
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-white outline-none focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] transition-all"
                            />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 overflow-hidden mb-6">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-widest">
                                    <th className="p-4 w-[40%]">Description</th>
                                    <th className="p-4 text-center w-[10%]">Unité</th>
                                    <th className="p-4 text-center w-[10%]">Qté</th>
                                    <th className="p-4 text-center w-[15%]">Prix Uni.</th>
                                    <th className="p-4 text-right w-[15%]">Total</th>
                                    <th className="p-4 w-[5%]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {items.map((item, i) => (
                                    <tr key={i} className="group hover:bg-zinc-900/50 transition-colors">
                                        <td className="p-3">
                                            <input
                                                value={item.description}
                                                onChange={(e) => updateItem(i, 'description', e.target.value)}
                                                className="w-full bg-transparent outline-none text-white placeholder:text-zinc-600 font-medium"
                                                placeholder="Description de l'article..."
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                value={item.unit}
                                                onChange={(e) => updateItem(i, 'unit', e.target.value)}
                                                className="w-full bg-transparent outline-none text-zinc-400 text-center font-mono uppercase text-xs"
                                                placeholder="U"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-white text-center font-mono focus:border-[#EAB308] focus:outline-none transition-all"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unit_price}
                                                onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-white text-center font-mono focus:border-[#EAB308] focus:outline-none transition-all"
                                            />
                                        </td>
                                        <td className="p-3 text-right font-mono text-white font-bold">{formatCurrency(item.total)}</td>
                                        <td className="p-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(i)}
                                                className="p-2 rounded-lg text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-50 group-hover:opacity-100"
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
                        className="flex items-center gap-2 text-sm font-bold text-[#EAB308] hover:text-[#FACC15] transition-colors mb-10 px-2"
                    >
                        <Plus size={18} />
                        Ajouter une ligne
                    </button>

                    {/* Totals Section */}
                    <div className="border-t border-zinc-800 pt-8 flex justify-end">
                        <div className="w-full max-w-sm space-y-4">
                            <div className="flex justify-between text-sm text-zinc-400">
                                <span>Sous-total HT</span>
                                <span className="text-white font-mono">{formatCurrency(totals.subtotal)}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-400">Remise (%)</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={discountRate}
                                    onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                                    className="w-16 bg-zinc-900 border border-zinc-800 text-center text-white rounded-lg py-1 font-mono focus:border-[#EAB308] focus:outline-none"
                                />
                            </div>

                            {discountRate > 0 && (
                                <div className="flex justify-between text-sm text-zinc-500">
                                    <span>Montant Remise</span>
                                    <span className="text-red-400 font-mono">-{formatCurrency(totals.discountAmount)}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-sm text-zinc-400">
                                <span>TVA (20%)</span>
                                <span className="text-white font-mono">{formatCurrency(totals.tva)}</span>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
                                <span className="text-lg font-bold text-white">Total TTC</span>
                                <span className="text-2xl font-black text-[#EAB308] font-mono">{formatCurrency(totals.totalTTC)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="mt-10 pt-6 border-t border-zinc-800">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full bg-[#EAB308] text-black font-bold py-4 rounded-xl hover:bg-[#FACC15] uppercase text-sm tracking-widest transition-all shadow-lg shadow-[#EAB308]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Création du devis...' : 'Valider le Devis'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    )
}