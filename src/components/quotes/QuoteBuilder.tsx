'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { createQuote } from './quoteActions' // Import the action we just fixed

export default function QuoteBuilder() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<any[]>([])

    // Form State
    const [clientId, setClientId] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [dueDate, setDueDate] = useState('')
    const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0, total: 0, unit: 'U' }])

    // Fetch Clients for Dropdown
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchClients = async () => {
            const { data } = await supabase.from('clients').select('*')
            if (data) setClients(data)
        }
        fetchClients()
    }, [])

    // Calculate Item Total
    const updateItem = (index: number, field: string, value: any) => {
        const newItems: any = [...items]
        newItems[index][field] = value

        // Auto-calc total
        if (field === 'quantity' || field === 'unit_price') {
            newItems[index].total = newItems[index].quantity * newItems[index].unit_price
        }
        setItems(newItems)
    }

    // Submit Handler
    const handleSubmit = async () => {
        if (!clientId) return alert("Veuillez sélectionner un client.")
        setLoading(true)

        const formData = new FormData()
        formData.append('client_id', clientId)
        formData.append('date', date)
        formData.append('items', JSON.stringify(items))

        // Type the result to match the Server Action
        const result = await createQuote(formData)

        if (result.success === true) {
            // TypeScript now knows 'id' exists because success is true
            router.push(`/quotes/${result.id}`)
        } else {
            // TypeScript now knows 'error' exists because success is false
            alert("Erreur: " + result.error)
        }
        setLoading(false)
    }

    return (
        <div className="max-w-4xl mx-auto bg-zinc-900 p-8 rounded-xl border border-zinc-800">
            <h1 className="text-2xl font-bold text-white mb-6">Nouveau Devis</h1>

            {/* Top Row: Client & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                    <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Client</label>
                    <select
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
                    >
                        <option value="">-- Sélectionner --</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white outline-none" />
                </div>
                <div>
                    <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Validité (Optionnel)</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white outline-none" />
                </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                            <th className="pb-3 w-[40%]">Description</th>
                            <th className="pb-3 w-[15%]">Unité</th>
                            <th className="pb-3 w-[10%]">Qté</th>
                            <th className="pb-3 w-[15%]">Prix</th>
                            <th className="pb-3 w-[15%] text-right">Total</th>
                            <th className="pb-3 w-[5%]"></th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {items.map((item, i) => (
                            <tr key={i} className="border-b border-zinc-800/50">
                                <td className="py-2"><input className="w-full bg-transparent outline-none text-white placeholder-zinc-700" placeholder="Description..." value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} /></td>
                                <td className="py-2"><input className="w-full bg-transparent outline-none text-zinc-400" placeholder="U, m2..." value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} /></td>
                                <td className="py-2"><input type="number" className="w-full bg-transparent outline-none text-white" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} /></td>
                                <td className="py-2"><input type="number" className="w-full bg-transparent outline-none text-white" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))} /></td>
                                <td className="py-2 text-right font-mono text-white">{item.total.toFixed(2)}</td>
                                <td className="py-2 text-right">
                                    <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-zinc-600 hover:text-red-500 transition"><span className="material-symbols-outlined text-lg">close</span></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button onClick={() => setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0, unit: 'U' }])} className="mt-4 text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">add</span> Ajouter une ligne
                </button>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-[#EAB308] hover:bg-[#EAB308]/90 text-black font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-yellow-900/20 disabled:opacity-50"
                >
                    {loading ? 'Création...' : 'Créer le Devis'}
                </button>
            </div>
        </div>
    )
}