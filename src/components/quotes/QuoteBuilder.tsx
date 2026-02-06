'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
    Plus,
    Trash2,
    Calendar,
    User,
    FileText,
    Calculator,
    Save,
    ChevronDown
} from 'lucide-react'
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
    unit: 'U',
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
        if (!clientId) return alert('Veuillez sélectionner un client.')
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
        <div className="min-h-screen bg-black pl-72 text-white">
            <div className="max-w-7xl mx-auto p-10">

                {/* --- HEADER --- */}
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Éditeur de Devis</h1>
                        <p className="text-zinc-500 mt-2 font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#EAB308]"></span>
                            Création d'une nouvelle proposition commerciale
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* --- LEFT COLUMN (Form) --- */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* 1. Client & Date Card */}
                        <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#EAB308]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <User size={18} className="text-[#EAB308]" />
                                Informations Client
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider ml-1">Client</label>
                                    <div className="relative">
                                        <select
                                            value={clientId}
                                            onChange={(e) => setClientId(e.target.value)}
                                            className="w-full bg-black border border-zinc-800 rounded-xl p-4 pl-4 pr-10 text-white outline-none focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] appearance-none transition-all font-medium"
                                        >
                                            <option value="">-- Sélectionner --</option>
                                            {clients.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider ml-1">Date d'émission</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full bg-black border border-zinc-800 rounded-xl p-4 pl-12 text-white outline-none focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] transition-all font-medium"
                                        />
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Items Table Card */}
                        <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 shadow-xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <FileText size={18} className="text-[#EAB308]" />
                                    Articles & Services
                                </h2>
                                <span className="text-xs text-zinc-500 font-mono bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                                    {items.length} Ligne{items.length > 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                    <div className="col-span-6">Description</div>
                                    <div className="col-span-1 text-center">Unité</div>
                                    <div className="col-span-1 text-center">Qté</div>
                                    <div className="col-span-2 text-center">Prix Uni.</div>
                                    <div className="col-span-2 text-right">Total HT</div>
                                </div>

                                {/* Table Rows */}
                                {items.map((item, i) => (
                                    <div key={i} className="group relative grid grid-cols-12 gap-4 items-start p-2 rounded-xl hover:bg-zinc-900/30 border border-transparent hover:border-zinc-800 transition-all duration-200">

                                        {/* Description */}
                                        <div className="col-span-6">
                                            <textarea
                                                rows={1}
                                                value={item.description}
                                                onChange={(e) => updateItem(i, 'description', e.target.value)}
                                                className="w-full bg-transparent border-b border-zinc-800 focus:border-[#EAB308] text-white p-2 outline-none resize-none transition-colors placeholder-zinc-700 leading-relaxed"
                                                placeholder="Description de la prestation..."
                                            />
                                        </div>

                                        {/* Unit */}
                                        <div className="col-span-1">
                                            <input
                                                value={item.unit}
                                                onChange={(e) => updateItem(i, 'unit', e.target.value)}
                                                className="w-full bg-black/30 border border-zinc-800 rounded-lg py-2 text-center text-zinc-400 text-xs uppercase focus:border-[#EAB308] outline-none"
                                                placeholder="U"
                                            />
                                        </div>

                                        {/* Qty */}
                                        <div className="col-span-1">
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                                                className="w-full bg-black/30 border border-zinc-800 rounded-lg py-2 text-center text-white font-mono text-sm focus:border-[#EAB308] outline-none"
                                            />
                                        </div>

                                        {/* Price */}
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unit_price}
                                                onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                                                className="w-full bg-black/30 border border-zinc-800 rounded-lg py-2 text-center text-white font-mono text-sm focus:border-[#EAB308] outline-none"
                                            />
                                        </div>

                                        {/* Total */}
                                        <div className="col-span-2 flex items-center justify-end h-full gap-3">
                                            <span className="font-mono text-white font-medium text-sm">
                                                {formatCurrency(item.total).replace(' DH', '')}
                                            </span>

                                            {/* Delete Button (Hover Only) */}
                                            <button
                                                type="button"
                                                onClick={() => removeItem(i)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="w-full py-3 mt-4 border border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:text-[#EAB308] hover:border-[#EAB308]/30 hover:bg-[#EAB308]/5 transition-all text-sm font-bold flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} />
                                    Ajouter une ligne
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT COLUMN (Totals & Actions) --- */}
                    <div className="space-y-6">

                        {/* Summary Card */}
                        <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 shadow-xl sticky top-6">
                            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Calculator size={18} className="text-[#EAB308]" />
                                Total
                            </h2>

                            <div className="space-y-4">
                                <div className="flex justify-between text-sm text-zinc-400">
                                    <span>Total HT</span>
                                    <span className="text-white font-mono">{formatCurrency(totals.subtotal)}</span>
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400">Remise</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={discountRate}
                                            onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                                            className="w-12 bg-black border border-zinc-800 text-center text-white rounded py-1 text-xs font-mono focus:border-[#EAB308] outline-none"
                                        />
                                        <span className="text-zinc-600">%</span>
                                    </div>
                                </div>

                                {discountRate > 0 && (
                                    <div className="flex justify-between text-sm text-red-400/80 bg-red-500/5 p-2 rounded">
                                        <span>Montant Remise</span>
                                        <span className="font-mono">-{formatCurrency(totals.discountAmount)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-sm text-zinc-400 pt-2 border-t border-zinc-800/50">
                                    <span>Net HT</span>
                                    <span className="text-white font-mono">{formatCurrency(totals.netHT)}</span>
                                </div>

                                <div className="flex justify-between text-sm text-zinc-400">
                                    <span>TVA (20%)</span>
                                    <span className="text-white font-mono">{formatCurrency(totals.tva)}</span>
                                </div>

                                <div className="pt-6 mt-4 border-t border-dashed border-zinc-800">
                                    <div className="flex justify-between items-end">
                                        <span className="text-lg font-bold text-white">Total TTC</span>
                                        <span className="text-2xl font-black text-[#EAB308] font-mono tracking-tight">
                                            {formatCurrency(totals.totalTTC)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full mt-8 bg-gradient-to-r from-[#EAB308] to-[#FACC15] text-black font-black py-4 rounded-xl hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save size={20} />
                                        ENREGISTRER LE DEVIS
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}