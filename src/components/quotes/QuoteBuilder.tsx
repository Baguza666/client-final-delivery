'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { createQuote } from './QuoteActions'

export default function QuoteBuilder() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<any[]>([])

    const [clientId, setClientId] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [discountRate, setDiscountRate] = useState(0)

    // ✅ "unit" property removed from initial state
    const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0, total: 0 }])

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchClients = async () => {
            const { data } = await supabase.from('clients').select('*').order('name')
            if (data) setClients(data)
        }
        fetchClients()
    }, [supabase])

    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + item.total, 0)
        const discountAmount = subtotal * (discountRate / 100)
        const netHT = subtotal - discountAmount
        const tva = netHT * 0.20
        return { subtotal, discountAmount, netHT, tva, totalTTC: netHT + tva }
    }, [items, discountRate])

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items]
            ; (newItems[index] as any)[field] = value
        if (field === 'quantity' || field === 'unit_price') {
            newItems[index].total = Number(newItems[index].quantity) * Number(newItems[index].unit_price)
        }
        setItems(newItems)
    }

    const handleSubmit = async () => {
        if (!clientId) return alert("Veuillez sélectionner un client.")
        setLoading(true)

        const formData = new FormData()
        formData.append('client_id', clientId)
        formData.append('date', date)
        formData.append('discount_rate', discountRate.toString())
        formData.append('subtotal', totals.subtotal.toString())
        formData.append('total_ttc', totals.totalTTC.toString())
        formData.append('items', JSON.stringify(items))

        const result = await createQuote(formData)

        if (result.success === true) {
            router.push(`/quotes/${result.id}`)
        } else {
            alert(`Erreur: ${result.error}`)
        }
        setLoading(false)
    }

    return (
        <div className="max-w-5xl mx-auto bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800">
            <h1 className="text-2xl font-bold text-white mb-8">Nouveau Devis</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Client</label>
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none">
                        <option value="">Sélectionner un client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Date d'émission</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none" />
                </div>
            </div>

            {/* Items Table - "Unité" Column Removed */}
            <table className="w-full text-left mb-6">
                <thead>
                    <tr className="text-zinc-500 text-[10px] uppercase border-b border-zinc-800 tracking-widest">
                        <th className="pb-4 w-[50%]">Description des travaux</th>
                        <th className="pb-4 text-center w-[15%]">Qté</th>
                        <th className="pb-4 text-center w-[15%]">Prix Unit</th>
                        <th className="pb-4 text-right w-[20%]">Total HT</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {items.map((item, i) => (
                        <tr key={i} className="border-b border-zinc-800/30">
                            <td className="py-4"><input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} className="w-full bg-transparent outline-none text-white" placeholder="Description..." /></td>
                            <td className="py-4"><input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} className="w-full bg-transparent outline-none text-white text-center font-mono" /></td>
                            <td className="py-4"><input type="number" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)} className="w-full bg-transparent outline-none text-white text-center font-mono" /></td>
                            <td className="py-4 text-right font-mono text-white">{item.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex flex-col items-end pt-10 border-t border-zinc-800">
                <div className="w-full max-w-xs space-y-3">
                    <div className="flex justify-between text-xs text-zinc-500 uppercase">
                        <span>Total HT Brut</span>
                        <span className="text-white font-mono">{totals.subtotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-blue-500/5 px-2 rounded border border-blue-500/10">
                        <span className="text-blue-400 font-bold uppercase text-[10px]">Remise commerciale (%)</span>
                        <input type="number" value={discountRate} onChange={(e) => setDiscountRate(Number(e.target.value))} className="w-12 bg-zinc-800 border border-zinc-700 rounded py-1 text-center text-white outline-none text-xs" />
                    </div>
                    <div className="flex justify-between text-xs text-white font-bold border-t border-zinc-800 pt-3">
                        <span>Net HT</span>
                        <span className="font-mono">{totals.netHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500 uppercase">
                        <span>TVA (20%)</span>
                        <span className="text-white font-mono">{totals.tva.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                    </div>
                    <div className="flex flex-col items-end pt-4">
                        <div className="text-[10px] text-yellow-500/50 uppercase font-black mb-1 tracking-widest">Total à payer</div>
                        <div className="text-4xl text-[#EAB308] font-black">{totals.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-lg">DH</span></div>
                    </div>
                </div>
            </div>

            <button onClick={handleSubmit} disabled={loading} className="w-full mt-10 bg-[#EAB308] text-black font-black py-4 rounded-xl hover:bg-yellow-500 transition-all uppercase text-sm tracking-widest">
                {loading ? 'Génération...' : 'Créer le Devis'}
            </button>
        </div>
    )
}