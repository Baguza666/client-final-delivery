'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { createQuote } from './QuoteActions'
import Link from 'next/link'

export default function QuoteBuilder() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<any[]>([])

    // Form States
    const [clientId, setClientId] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [validUntil, setValidUntil] = useState('')
    const [discountRate, setDiscountRate] = useState(0)
    const [items, setItems] = useState([
        { description: '', quantity: 1, unit_price: 0, total: 0, unit: 'U' }
    ])

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch existing clients for the dropdown
    useEffect(() => {
        const fetchClients = async () => {
            const { data } = await supabase.from('clients').select('*').order('name')
            if (data) setClients(data)
        }
        fetchClients()
    }, [supabase])

    // Math Calculations - Optimized with useMemo
    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + item.total, 0)
        const discountAmount = subtotal * (discountRate / 100)
        const netHT = subtotal - discountAmount
        const tva = netHT * 0.20 // 20% TVA per standard
        const totalTTC = netHT + tva

        return {
            subtotal,
            discountAmount,
            netHT,
            tva,
            totalTTC
        }
    }, [items, discountRate])

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items]
        const updatedItem = { ...newItems[index], [field]: value }

        if (field === 'quantity' || field === 'unit_price') {
            updatedItem.total = Number(updatedItem.quantity) * Number(updatedItem.unit_price)
        }

        newItems[index] = updatedItem
        setItems(newItems)
    }

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0, unit: 'U' }])
    }

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index))
        }
    }

    const handleSubmit = async () => {
        if (!clientId) return alert("Veuillez sélectionner un client.")
        setLoading(true)

        const formData = new FormData()
        formData.append('client_id', clientId)
        formData.append('date', date)
        formData.append('valid_until', validUntil || date)
        formData.append('discount_rate', discountRate.toString())
        formData.append('subtotal', totals.subtotal.toFixed(2))
        formData.append('total_ttc', totals.totalTTC.toFixed(2))
        formData.append('items', JSON.stringify(items))

        const result = await createQuote(formData)

        if (result.success === true) {
            router.push(`/quotes/${result.id}`)
        } else {
            alert("Erreur: " + (result.error || "Une erreur est survenue."))
        }
        setLoading(false)
    }

    // Shared styles for a cleaner look
    const inputBase = "w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all text-sm"
    const labelBase = "block text-[10px] font-bold uppercase text-zinc-500 mb-2 tracking-widest"

    return (
        <div className="max-w-5xl mx-auto bg-zinc-900/50 backdrop-blur-sm p-8 rounded-2xl border border-zinc-800/50 shadow-2xl">

            {/* Header Area */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <Link href="/quotes" className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Nouveau Devis</h1>
                        <p className="text-zinc-500 text-xs">Éditeur de document professionnel</p>
                    </div>
                </div>
            </div>

            {/* 1. Configuration: Client and Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div>
                    <label className={labelBase}>Client</label>
                    <select
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className={inputBase}
                    >
                        <option value="">Sélectionner un client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelBase}>Date d'émission</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputBase} />
                </div>
                <div>
                    <label className={labelBase}>Date de validité</label>
                    <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputBase} />
                </div>
            </div>

            {/* 2. Items Table: Main Entry */}
            <div className="mb-10">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-zinc-500 text-[10px] uppercase border-b border-zinc-800 tracking-widest">
                                <th className="pb-4 w-[40%]">Description des travaux</th>
                                <th className="pb-4 w-[10%] text-center">Unité</th>
                                <th className="pb-4 w-[10%] text-center">Qté</th>
                                <th className="pb-4 w-[15%] text-center">Prix Unit (HT)</th>
                                <th className="pb-4 w-[20%] text-right">Total HT</th>
                                <th className="pb-4 w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {items.map((item, i) => (
                                <tr key={i} className="border-b border-zinc-800/30 group hover:bg-white/[0.02] transition-colors">
                                    <td className="py-4">
                                        <input
                                            value={item.description}
                                            onChange={(e) => updateItem(i, 'description', e.target.value)}
                                            className="w-full bg-transparent outline-none text-white placeholder:text-zinc-700"
                                            placeholder="Description du service..."
                                        />
                                    </td>
                                    <td className="py-4 px-2">
                                        <input
                                            value={item.unit}
                                            onChange={(e) => updateItem(i, 'unit', e.target.value)}
                                            className="w-full bg-transparent outline-none text-zinc-400 text-center"
                                            placeholder="U / F"
                                        />
                                    </td>
                                    <td className="py-4 px-2">
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                                            className="w-full bg-transparent outline-none text-white text-center font-medium"
                                        />
                                    </td>
                                    <td className="py-4 px-2">
                                        <input
                                            type="number"
                                            value={item.unit_price}
                                            onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                                            className="w-full bg-transparent outline-none text-white text-center font-medium"
                                        />
                                    </td>
                                    <td className="py-4 text-right font-mono text-white">
                                        {item.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-4 text-right">
                                        <button
                                            onClick={() => removeItem(i)}
                                            className="text-zinc-700 hover:text-red-500 transition-colors flex items-center justify-end w-full"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button
                    onClick={addItem}
                    className="mt-6 text-[10px] font-black text-blue-500 hover:text-blue-400 flex items-center gap-2 uppercase tracking-widest transition-all bg-blue-500/5 px-4 py-2 rounded-lg border border-blue-500/10"
                >
                    <span className="material-symbols-outlined text-sm">add</span> Ajouter un poste
                </button>
            </div>

            {/* 3. Financial Summary */}
            <div className="flex flex-col items-end pt-10 border-t border-zinc-800">
                <div className="w-full max-w-xs space-y-4">
                    <div className="flex justify-between text-xs text-zinc-500 uppercase tracking-wider">
                        <span>Total HT Brut</span>
                        <span className="text-white font-mono">{totals.subtotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                    </div>

                    <div className="flex justify-between items-center py-2 bg-blue-500/5 px-3 rounded-lg border border-blue-500/10">
                        <span className="text-blue-400 font-bold uppercase text-[10px] tracking-widest">Remise commerciale (%)</span>
                        <input
                            type="number"
                            value={discountRate}
                            onChange={(e) => setDiscountRate(Number(e.target.value))}
                            className="w-14 bg-zinc-800 border border-zinc-700 rounded-md py-1 text-center text-white outline-none focus:border-blue-500 text-xs font-bold"
                        />
                    </div>

                    <div className="flex justify-between text-xs text-zinc-500 uppercase tracking-wider italic">
                        <span>Montant Remise ({discountRate}%)</span>
                        <span className="text-red-400 font-mono">-{totals.discountAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                    </div>

                    <div className="flex justify-between text-xs text-white font-bold border-t border-zinc-800 pt-4 uppercase tracking-widest">
                        <span>Net HT</span>
                        <span className="font-mono">{totals.netHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                    </div>

                    <div className="flex justify-between text-xs text-zinc-500 uppercase tracking-wider">
                        <span>TVA (20%)</span>
                        <span className="text-white font-mono">{totals.tva.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                    </div>

                    <div className="flex flex-col items-end pt-6">
                        <div className="text-[10px] text-yellow-500/50 uppercase font-black tracking-[0.2em] mb-1">Total à payer</div>
                        <div className="text-4xl text-[#EAB308] font-black tracking-tight">
                            {totals.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}<span className="text-lg ml-2 opacity-50">DH</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Submission */}
            <div className="mt-12">
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-[#EAB308] hover:bg-yellow-500 text-black font-black py-5 rounded-2xl transition-all shadow-[0_10px_40px_-10px_rgba(234,179,8,0.3)] disabled:opacity-50 uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3"
                >
                    {loading ? (
                        <>
                            <div className="h-5 w-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            Génération en cours...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">description</span>
                            Finaliser le Devis
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}