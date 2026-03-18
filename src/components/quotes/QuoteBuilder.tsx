'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
    Plus,
    Trash2,
    Calendar,
    Save,
    ChevronDown,
    ArrowLeft,
    Receipt
} from 'lucide-react'
import Link from 'next/link'
import { createQuote, updateQuote } from './QuoteActions'

const COLUMN_WIDTHS = {
    description: 'flex-1 min-w-[200px]',
    unit: 'flex-shrink-0 w-[80px]',
    qty: 'flex-shrink-0 w-[100px]',
    price: 'flex-shrink-0 w-[120px]',
    total: 'flex-shrink-0 w-[140px]',
    actions: 'flex-shrink-0 w-[48px]'
}

interface Client { id: string; name: string }
interface QuoteItem { description: string; unit: string; quantity: number; unit_price: number; total: number }

const emptyItem = (): QuoteItem => ({ description: '', unit: 'U', quantity: 1, unit_price: 0, total: 0 })

export default function QuoteBuilder({ quoteId }: { quoteId?: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(!!quoteId)
    const [clients, setClients] = useState<Client[]>([])
    const [clientId, setClientId] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [discountRate, setDiscountRate] = useState(0)
    const [notes, setNotes] = useState('') // ✅ Added notes state
    const [items, setItems] = useState<QuoteItem[]>([emptyItem()])

    const supabase = useMemo(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), [])

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: clientsData } = await supabase.from('clients').select('id, name').order('name')
            if (clientsData) setClients(clientsData)

            if (quoteId) {
                const { data: quoteData } = await supabase.from('quotes').select('*, quote_items(*)').eq('id', quoteId).single()
                if (quoteData) {
                    setClientId(quoteData.client_id || '')
                    setDate(quoteData.date || new Date().toISOString().split('T')[0])
                    setDiscountRate(quoteData.discount_rate || 0)
                    setNotes(quoteData.notes || '') // ✅ Load existing notes

                    if (quoteData.quote_items && quoteData.quote_items.length > 0) {
                        setItems(quoteData.quote_items.map((i: any) => ({
                            description: i.description,
                            unit: i.unit || 'U',
                            quantity: i.quantity,
                            unit_price: i.unit_price,
                            total: i.total
                        })))
                    }
                }
                setFetching(false)
            }
        }
        fetchInitialData()
    }, [supabase, quoteId])

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
            if (field === 'description' || field === 'unit') { (item as any)[field] = value }
            else {
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
        formData.append('notes', notes) // ✅ Append notes to form data
        formData.append('items', JSON.stringify(items))

        const result = quoteId ? await updateQuote(quoteId, formData) : await createQuote(formData)
        if (result.success && result.id) router.push(`/quotes/${result.id}`)
        else alert(`Erreur: ${result.error}`)
        setLoading(false)
    }

    const formatCurrency = (value: number) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(value) + ' DH'

    if (fetching) return <div className="min-h-screen bg-black pl-72 text-white flex items-center justify-center">Chargement du devis...</div>

    return (
        <div className="min-h-screen bg-black pl-72 text-white font-sans">
            <div className="w-full p-8 space-y-8">

                {/* HEADER */}
                <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
                    <div className="flex items-center gap-4">
                        <Link href={quoteId ? `/quotes/${quoteId}` : "/quotes"} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-2xl font-bold flex items-center gap-3"><Receipt size={24} className="text-[#EAB308]" />{quoteId ? 'Modifier le Devis' : 'Nouveau Devis'}</h1>
                    </div>
                </div>

                {/* CONFIGURATION BAR */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                    <div className="flex flex-wrap gap-8">
                        <div className="flex-grow min-w-[300px] space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 ml-1">Client</label>
                            <div className="relative">
                                <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full h-12 bg-zinc-900 border border-zinc-700 rounded-lg px-4 text-white outline-none focus:border-[#EAB308] appearance-none transition-all font-medium">
                                    <option value="">-- Sélectionner un client --</option>
                                    {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                            </div>
                        </div>
                        <div className="w-64 space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 ml-1">Date d'émission</label>
                            <div className="relative">
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-12 bg-zinc-900 border border-zinc-700 rounded-lg px-4 pl-12 text-white outline-none focus:border-[#EAB308] transition-all font-medium" />
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={18} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ITEMS TABLE */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl shadow-sm">
                    <div className="overflow-x-auto">
                        <div className="min-w-[700px]">
                            <div className="flex gap-3 px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                <div className="flex-1 min-w-[200px]">Description / Service</div><div className="w-[70px] text-center">Unité</div><div className="w-[80px] text-center">Qté</div><div className="w-[100px] text-right">Prix Unit.</div><div className="w-[100px] text-right">Total HT</div><div className="w-[40px]"></div>
                            </div>
                            <div className="p-3 space-y-2">
                                {items.map((item, i) => (
                                    <div key={i} className="flex gap-3 items-center bg-zinc-800/30 p-3 rounded-lg border border-transparent hover:border-zinc-700 transition-all">
                                        <div className="flex-1 min-w-[200px]"><input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 outline-none focus:border-[#EAB308] text-sm" placeholder="Description..." /></div>
                                        <div className="w-[70px] flex-shrink-0"><input value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-center text-white text-xs font-bold uppercase focus:border-[#EAB308] outline-none" placeholder="U" /></div>
                                        <div className="w-[80px] flex-shrink-0"><input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-center text-white font-mono text-sm focus:border-[#EAB308] outline-none" /></div>
                                        <div className="w-[100px] flex-shrink-0"><input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-right text-white font-mono text-sm focus:border-[#EAB308] outline-none" /></div>
                                        <div className="w-[100px] flex-shrink-0 text-right font-mono text-white font-bold text-sm py-2">{formatCurrency(item.total).replace(' DH', '')}</div>
                                        <div className="w-[40px] flex-shrink-0 flex justify-center"><button onClick={() => removeItem(i)} className="text-zinc-600 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button></div>
                                    </div>
                                ))}
                                <button onClick={addItem} className="w-full py-3 mt-2 border border-dashed border-zinc-700 rounded-lg text-zinc-500 hover:text-[#EAB308] hover:border-[#EAB308] hover:bg-[#EAB308]/5 transition-all text-sm font-bold flex items-center justify-center gap-2"><Plus size={16} /> Ajouter un article</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RÉCAPITULATIF & NOTES */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">

                        {/* ✅ Left Side: Discount & Custom Notes */}
                        <div className="w-full md:w-1/2 flex flex-col gap-6">
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-zinc-400">Remise (%)</span>
                                <input type="number" value={discountRate} onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)} className="w-20 h-10 bg-zinc-900 border border-zinc-700 rounded-lg text-center text-white text-sm font-mono focus:border-[#EAB308] outline-none" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Conditions / Notes de paiement</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Ex: Acompte de 30% à la commande..."
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-sm outline-none focus:border-[#EAB308] resize-y min-h-[80px]"
                                />
                            </div>
                        </div>

                        {/* Right Side: Totals */}
                        <div className="flex flex-wrap items-end justify-end gap-6 md:gap-10 pt-4 md:pt-0">
                            <div className="text-center"><p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1">Total HT</p><p className="text-white font-mono text-lg">{formatCurrency(totals.subtotal)}</p></div>
                            <div className="text-center"><p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1">TVA 20%</p><p className="text-white font-mono text-lg">{formatCurrency(totals.tva)}</p></div>
                            <div className="text-center"><p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1">Net à Payer</p><p className="text-[#EAB308] font-mono text-2xl font-black">{formatCurrency(totals.totalTTC)}</p></div>
                        </div>
                    </div>

                    <button onClick={handleSubmit} disabled={loading} className="w-full mt-8 bg-[#EAB308] text-black font-bold h-12 rounded-xl hover:bg-[#FACC15] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50">
                        {loading ? "Enregistrement..." : <><Save size={18} /> Enregistrer le devis</>}
                    </button>
                </div>
            </div>
        </div >
    )
}