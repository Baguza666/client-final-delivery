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
    ChevronDown,
    ArrowLeft,
    Receipt
} from 'lucide-react'
import Link from 'next/link'
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

    const formatCurrency = (value: number) => value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH'

    return (
        <div className="min-h-screen bg-black pl-72 text-white font-sans selection:bg-[#EAB308] selection:text-black">

            {/* WRAPPER: Max width removed, now using 95% width for "Ultrawide" feel */}
            <div className="w-[95%] max-w-[1920px] mx-auto p-8 space-y-8">

                {/* --- 1. HEADER --- */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800/50">
                    <div className="flex items-center gap-4">
                        <Link href="/quotes" className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                                <Receipt size={24} className="text-[#EAB308]" />
                                Nouveau Devis
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded border border-zinc-800/50">
                            Brouillon
                        </span>
                    </div>
                </div>

                {/* --- 2. CONFIGURATION BAR --- */}
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Client Select */}
                        <div className="md:col-span-8 space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 ml-1">Client</label>
                            <div className="relative group">
                                <select
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    className="w-full h-12 bg-zinc-900 border border-zinc-800 rounded-lg px-4 text-white outline-none focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] appearance-none transition-all text-sm font-medium cursor-pointer hover:bg-zinc-800 hover:border-zinc-700"
                                >
                                    <option value="">-- Sélectionner un client --</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-white" size={16} />
                            </div>
                        </div>

                        {/* Date Picker */}
                        <div className="md:col-span-4 space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 ml-1">Date d'émission</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full h-12 bg-zinc-900 border border-zinc-800 rounded-lg px-4 pl-12 text-white outline-none focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] transition-all text-sm font-medium hover:bg-zinc-800 hover:border-zinc-700"
                                />
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={18} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- 3. WORKSPACE GRID --- */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                    {/* LEFT: ITEMS TABLE (8 Columns) */}
                    <div className="xl:col-span-8 bg-[#0A0A0A] border border-zinc-800 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[500px]">

                        {/* Header Row */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-zinc-900/50 border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                            <div className="col-span-6">Description / Service</div>
                            <div className="col-span-1 text-center">Unité</div>
                            <div className="col-span-1 text-center">Qté</div>
                            <div className="col-span-2 text-right">Prix Uni.</div>
                            <div className="col-span-2 text-right">Total HT</div>
                        </div>

                        {/* Rows Container */}
                        <div className="p-4 space-y-2">
                            {items.map((item, i) => (
                                <div key={i} className="group grid grid-cols-12 gap-4 items-start bg-zinc-900/10 p-2 rounded-lg hover:bg-zinc-900/50 transition-all border border-transparent hover:border-zinc-800">

                                    {/* Description */}
                                    <div className="col-span-6">
                                        <textarea
                                            rows={1}
                                            value={item.description}
                                            onChange={(e) => updateItem(i, 'description', e.target.value)}
                                            className="w-full min-h-[44px] bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-500 outline-none focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] transition-all text-sm resize-none font-medium"
                                            placeholder="Désignation..."
                                        />
                                    </div>

                                    {/* Unit */}
                                    <div className="col-span-1">
                                        <input
                                            value={item.unit}
                                            onChange={(e) => updateItem(i, 'unit', e.target.value)}
                                            className="w-full h-11 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-white text-sm font-bold uppercase focus:border-[#EAB308] outline-none transition-all"
                                        />
                                    </div>

                                    {/* Quantity */}
                                    <div className="col-span-1">
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                                            className="w-full h-11 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-white font-mono text-sm focus:border-[#EAB308] outline-none transition-all"
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
                                            className="w-full h-11 bg-zinc-800 border border-zinc-700 rounded-lg text-right pr-3 text-white font-mono text-sm focus:border-[#EAB308] outline-none transition-all"
                                        />
                                    </div>

                                    {/* Row Total & Delete */}
                                    <div className="col-span-2 flex items-center justify-end gap-3 h-11">
                                        <span className="font-mono text-white font-bold text-sm whitespace-nowrap">
                                            {formatCurrency(item.total).replace(' DH', '')}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(i)}
                                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all p-2 hover:bg-zinc-800 rounded"
                                            title="Supprimer la ligne"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 border-t border-zinc-800 bg-zinc-900/20">
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-sm font-bold uppercase tracking-wide text-zinc-500 hover:text-[#EAB308] flex items-center gap-2 hover:bg-[#EAB308]/10 px-4 py-3 rounded-lg transition-all w-full md:w-auto border border-dashed border-zinc-800 hover:border-[#EAB308]/30"
                            >
                                <Plus size={16} />
                                Ajouter une ligne
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: TOTALS PANEL (4 Columns) - Sticky */}
                    <div className="xl:col-span-4 space-y-6 sticky top-6">
                        <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-8 shadow-sm">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                <Calculator size={18} className="text-[#EAB308]" />
                                Récapitulatif
                            </h2>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400">Total HT</span>
                                    <span className="text-white font-mono font-medium">{formatCurrency(totals.subtotal)}</span>
                                </div>

                                {/* Remise Row */}
                                <div className="flex justify-between items-center text-sm group">
                                    <span className="text-zinc-400 group-focus-within:text-[#EAB308] transition-colors">Remise (%)</span>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            placeholder="0"
                                            value={discountRate}
                                            onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                                            className="w-16 h-8 bg-zinc-900 border border-zinc-800 rounded text-center text-white text-sm font-mono focus:border-[#EAB308] outline-none transition-colors"
                                        />
                                        {discountRate > 0 && (
                                            <span className="text-zinc-500 font-mono text-xs">
                                                -{formatCurrency(totals.discountAmount)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-zinc-800 my-2"></div>

                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400">Net HT</span>
                                    <span className="text-white font-mono font-medium">{formatCurrency(totals.netHT)}</span>
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400">TVA (20%)</span>
                                    <span className="text-white font-mono font-medium">{formatCurrency(totals.tva)}</span>
                                </div>

                                {/* Grand Total - NOW FIXED WITH WHITESPACE-NOWRAP */}
                                <div className="pt-6 mt-4 border-t border-zinc-800">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Net à payer</span>
                                        <span className="text-3xl font-black text-[#EAB308] font-mono tracking-tight whitespace-nowrap">
                                            {formatCurrency(totals.totalTTC)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full bg-[#EAB308] text-black font-black h-14 rounded-xl hover:bg-[#FACC15] hover:shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none text-sm uppercase tracking-wider transform active:scale-[0.98]"
                                >
                                    {loading ? (
                                        <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save size={20} />
                                            Enregistrer le devis
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}