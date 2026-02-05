'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { createQuote } from './QuoteActions'

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
            const { data } = await supabase.from('clients').select('*')
            if (data) setClients(data)
        }
        fetchClients()
    }, [supabase])

    // Math Calculations
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const discountAmount = subtotal * (discountRate / 100)
    const netHT = subtotal - discountAmount
    const tva = netHT * 0.20 // 20% TVA
    const totalTTC = netHT + tva

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items]
            ; (newItems[index] as any)[field] = value

        if (field === 'quantity' || field === 'unit_price') {
            newItems[index].total = newItems[index].quantity * newItems[index].unit_price
        }
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
        formData.append('subtotal', subtotal.toString())
        formData.append('total_ttc', totalTTC.toString())
        formData.append('items', JSON.stringify(items))

        const result = await createQuote(formData)

        if (result.success === true) {
            router.push(`/quotes/${result.id}`)
        } else {
            alert("Erreur: " + (result.error || "Une erreur est survenue."))
        }
        setLoading(false)
    }

    return (
        <div className="max-w-5xl mx-auto bg-zinc-900 p-8 rounded-xl border border-zinc-800">
            <h1 className="text-2xl font-bold text-white mb-8">Nouveau Devis</h1>

            {/* 1. Top Section: Client and Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-2 tracking-widest">Client</label>
                    <select
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:ring-1 focus:ring-yellow-500 transition-all"
                    >
                        <option value="">Sélectionner un client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-2 tracking-widest">Date d'émission</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none" />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-2 tracking-widest">Date de validité</label>
                    <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none" />
                </div>
            </div>

            {/* 2. Items Table */}
            <div className="mb-10 overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-zinc-500 text-[10px] uppercase border-b border-zinc-800 tracking-widest">
                            <th className="pb-4 w-[40%]">Description</th>
                            <th className="pb-4 w-[10%]">Unité</th>
                            <th className="pb-4 w-[10%]">Qté</th>
                            <th className="pb-4 w-[15%]">Prix Unit</th>
                            <th className="pb-4 w-[20%] text-right">Total HT</th>
                            <th className="pb-4 w-[5%]"></th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {items.map((item, i) => (
                            <tr key={i} className="border-b border-zinc-800/50 group">
                                <td className="py-4"><input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} className="w-full bg-transparent outline-none text-white placeholder-zinc-700" placeholder="Ex: Modification des portes..." /></td>
                                <td className="py-4"><input value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} className="w-full bg-transparent outline-none text-zinc-400" placeholder="F / Unité" /></td>
                                <td className="py-4"><input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} className="w-full bg-transparent outline-none text-white" /></td>
                                <td className="py-4"><input type="number" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))} className="w-full bg-transparent outline-none text-white" /></td>
                                <td className="py-4 text-right font-mono text-white">{item.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                                <td className="py-4 text-right">
                                    <button onClick={() => removeItem(i)} className="text-zinc-700 hover:text-red-500 transition-colors">
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button onClick={addItem} className="mt-4 text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 uppercase tracking-widest transition-all">
                    <span className="material-symbols-outlined text-sm">add</span> Ajouter une ligne
                </button>
            </div>

            {/* 3. Summary Footer with Discount and Taxes */}
            <div className="flex flex-col items-end gap-3 pt-8 border-t border-zinc-800">
                <div className="flex justify-between w-72 text-sm text-zinc-500">
                    <span>Total HT Brut</span>
                    <span className="text-white">{subtotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                </div>

                <div className="flex justify-between w-72 text-sm items-center">
                    <span className="text-blue-400 font-bold uppercase text-[10px] tracking-widest">Remise (%)</span>
                    <input
                        type="number"
                        value={discountRate}
                        onChange={(e) => setDiscountRate(Number(e.target.value))}
                        className="w-16 bg-zinc-800 border border-zinc-700 rounded p-1 text-center text-white outline-none focus:border-blue-500"
                    />
                </div>

                <div className="flex justify-between w-72 text-sm text-zinc-500">
                    <span>Remise ({discountRate}%)</span>
                    <span className="text-red-400">-{discountAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                </div>

                <div className="flex justify-between w-72 text-sm text-white font-bold border-t border-zinc-800 pt-4">
                    <span>Net HT</span>
                    <span>{netHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                </div>

                <div className="flex justify-between w-72 text-sm text-zinc-500">
                    <span>TVA (20%)</span>
                    <span className="text-white">{tva.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                </div>

                <div className="flex justify-between w-72 text-2xl text-[#EAB308] font-black mt-4 border-b-2 border-[#EAB308]/20 pb-2">
                    <span>TOTAL TTC</span>
                    <span>{totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                </div>
            </div>

            {/* 4. Action Button */}
            <div className="flex justify-end pt-10">
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full md:w-auto bg-[#EAB308] hover:bg-[#EAB308]/90 text-black font-black py-4 px-12 rounded-xl transition-all shadow-lg shadow-yellow-900/20 disabled:opacity-50 uppercase tracking-widest text-sm"
                >
                    {loading ? 'Traitement en cours...' : 'Générer le Devis'}
                </button>
            </div>
        </div>
    )
}