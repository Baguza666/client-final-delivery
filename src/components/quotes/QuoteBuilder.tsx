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
    ArrowLeft
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
        <div className="min-h-screen bg-black pl-72 text-white font-sans">
            {/* WRAPPER: Limits width but allows breathing room */}
            <div className="w-full max-w-[1800px] mx-auto p-8 space-y-8">

                {/* --- HEADER --- */}
                <div className="flex justify-between items-center pb-6 border-b border-zinc-800">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <Link href="/quotes" className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
                                <ArrowLeft size={20} />
                            </Link>
                            <h1 className="text-3xl font-black uppercase tracking-tight">Nouveau Devis</h1>
                        </div>
                        <p className="text-zinc-500 pl-14">Créez une proposition commerciale professionnelle.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800 text-sm text-zinc-400 font-mono">
                            DRAFT
                        </div>
                    </div>
                </div>

                {/* --- 1. CLIENT & SETTINGS BAR (Full Width) --- */}
                <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">

                        {/* Client Select */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-2">
                                <User size={14} className="text-[#EAB308]" />
                                Client
                            </label>
                            <div className="relative group">
                                <select
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    className="w-full h-12 bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-white outline-none focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] appearance-none transition-all font-medium text-sm cursor-pointer hover:bg-zinc-800"
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
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-2">
                                <Calendar size={14} className="text-[#EAB308]" />
                                Date d'émission
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full h-12 bg-zinc-900 border border-zinc-700 rounded-xl px-4 pl-12 text-white outline-none focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] transition-all font-medium text-sm hover:bg-zinc-800"
                                />
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={18} />
                            </div>
                        </div>

                        {/* Info Text */}
                        <div className="pb-3 text-right hidden md:block">
                            <span className="text-zinc-600 text-sm">Assurez-vous que les informations sont correctes.</span>
                        </div>
                    </div>
                </div>

                {/* --- 2. MAIN LAYOUT GRID (Items Left, Totals Right) --- */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">

                    {/* LEFT: ITEMS TABLE (Takes 3/4 space) */}
                    <div className="xl:col-span-3 bg-[#111] border border-zinc-800 rounded-2xl p-6 shadow-sm min-h-[500px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <FileText size={20} className="text-[#EAB308]" />
                                Lignes de la commande
                            </h2>
                        </div>

                        <div className="flex-1">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-t-xl text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
                                <div className="col-span-6">Description / Service</div>
                                <div className="col-span-1 text-center">Unité</div>
                                <div className="col-span-1 text-center">Qté</div>
                                <div className="col-span-2 text-center">Prix Unitaire</div>
                                <div className="col-span-2 text-right">Total HT</div>
                            </div>

                            {/* Table Rows Container */}
                            <div className="space-y-2 mt-2">
                                {items.map((item, i) => (
                                    <div key={i} className="group grid grid-cols-12 gap-4 items-center bg-zinc-900/20 p-2 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-700 transition-all duration-200">

                                        {/* Description Input */}
                                        <div className="col-span-6">
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => updateItem(i, 'description', e.target.value)}
                                                className="w-full bg-transparent p-3 text-white placeholder-zinc-600 outline-none border-b border-transparent focus:border-[#EAB308] transition-colors text-sm font-medium"
                                                placeholder="Saisissez la désignation..."
                                            />
                                        </div>

                                        {/* Unit Input */}
                                        <div className="col-span-1">
                                            <input
                                                value={item.unit}
                                                onChange={(e) => updateItem(i, 'unit', e.target.value)}
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-center text-white text-xs font-bold uppercase focus:border-[#EAB308] outline-none"
                                            />
                                        </div>

                                        {/* Qty Input */}
                                        <div className="col-span-1">
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-center text-white font-mono text-sm focus:border-[#EAB308] outline-none"
                                            />
                                        </div>

                                        {/* Price Input */}
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unit_price}
                                                onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-center text-white font-mono text-sm focus:border-[#EAB308] outline-none"
                                            />
                                        </div>

                                        {/* Row Total & Delete */}
                                        <div className="col-span-2 flex items-center justify-end gap-3 pr-2">
                                            <span className="font-mono text-white font-bold text-sm">
                                                {formatCurrency(item.total).replace(' DH', '')}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(i)}
                                                className="opacity-100 xl:opacity-0 xl:group-hover:opacity-100 text-zinc-500 hover:text-red-500 transition-all p-2 hover:bg-zinc-800 rounded"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add Button */}
                            <button
                                type="button"
                                onClick={addItem}
                                className="w-full py-4 mt-6 border border-dashed border-zinc-800 bg-zinc-900/30 rounded-xl text-zinc-500 hover:text-[#EAB308] hover:border-[#EAB308] hover:bg-[#EAB308]/5 transition-all text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2"
                            >
                                <Plus size={18} />
                                Ajouter une nouvelle ligne
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: TOTALS PANEL (Sticky) */}
                    <div className="xl:col-span-1 space-y-6 sticky top-6">
                        <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Calculator size={20} className="text-[#EAB308]" />
                                Total
                            </h2>

                            <div className="space-y-4">
                                <div className="flex justify-between text-sm text-zinc-400">
                                    <span>Total HT</span>
                                    <span className="text-white font-mono font-medium">{formatCurrency(totals.subtotal)}</span>
                                </div>

                                {/* Discount */}
                                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                                    <div className="flex justify-between items-center text-sm mb-1">
                                        <span className="text-zinc-400">Remise (%)</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={discountRate}
                                            onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                                            className="w-16 bg-black border border-zinc-700 text-center text-white rounded py-1 text-sm font-mono focus:border-[#EAB308] outline-none"
                                        />
                                    </div>
                                    {discountRate > 0 && (
                                        <div className="flex justify-between text-xs text-red-400 mt-2">
                                            <span>Déduction</span>
                                            <span className="font-mono">-{formatCurrency(totals.discountAmount)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between text-sm text-zinc-400 pt-2">
                                    <span>Net HT</span>
                                    <span className="text-white font-mono font-medium">{formatCurrency(totals.netHT)}</span>
                                </div>

                                <div className="flex justify-between text-sm text-zinc-400">
                                    <span>TVA (20%)</span>
                                    <span className="text-white font-mono font-medium">{formatCurrency(totals.tva)}</span>
                                </div>

                                <div className="pt-6 mt-2 border-t border-dashed border-zinc-800">
                                    <div className="flex flex-col gap-1 text-right">
                                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Net à payer</span>
                                        <span className="text-3xl font-black text-[#EAB308] font-mono tracking-tight">
                                            {formatCurrency(totals.totalTTC)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full mt-8 bg-[#EAB308] text-black font-black py-4 rounded-xl hover:bg-[#FACC15] hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none text-sm uppercase tracking-wide transform active:scale-[0.98]"
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Enregistrer
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