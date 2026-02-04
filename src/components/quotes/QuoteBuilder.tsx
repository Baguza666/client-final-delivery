'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createQuote } from '@/app/actions/createQuote'
import StatusModal from '@/components/ui/StatusModal'

type Product = { id: string; name: string; price: number; description?: string }
type Client = { id: string; name: string }
interface QuoteBuilderProps { clients: Client[]; products: Product[] }

export default function QuoteBuilder({ clients, products }: QuoteBuilderProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [modal, setModal] = useState({ isOpen: false, type: 'error' as 'success' | 'error', message: '' })

    const [clientId, setClientId] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [discount, setDiscount] = useState(0) // ✅ Discount State
    const [items, setItems] = useState([{ description: '', unit: '', quantity: 1, unit_price: 0, total: 0 }])

    const calculateTotal = (qty: number, price: number) => Number(qty) * Number(price)

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items] as any
        newItems[index][field] = value
        if (field === 'productId_helper') {
            const selectedProduct = products.find(p => p.id === value)
            if (selectedProduct) {
                newItems[index].description = selectedProduct.name
                newItems[index].unit_price = selectedProduct.price
            }
        }
        newItems[index].total = calculateTotal(newItems[index].quantity, newItems[index].unit_price)
        setItems(newItems)
    }

    const addItem = () => setItems([...items, { description: '', unit: '', quantity: 1, unit_price: 0, total: 0 }])
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))

    // 🧮 Calculations
    const totalHT_Gross = items.reduce((sum, item) => sum + item.total, 0)
    const discountAmount = totalHT_Gross * (discount / 100)
    const finalHT = totalHT_Gross - discountAmount
    const finalTVA = finalHT * 0.20
    const finalTTC = finalHT + finalTVA

    const handleSubmit = async () => {
        if (!clientId) { setModal({ isOpen: true, type: 'error', message: "Veuillez sélectionner un client." }); return }
        setLoading(true)
        const result = await createQuote({
            client_id: clientId,
            number: `DEV-${Date.now().toString().slice(-6)}`,
            discount: discount, // ✅ Send Discount
            total_amount: finalTTC,
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            items
        })
        setLoading(false)

        if (result?.success) {
            setModal({ isOpen: true, type: 'success', message: "Devis créé avec succès." })
            setTimeout(() => router.push(`/quotes/${result.quoteId}`), 1500)
        } else {
            setModal({ isOpen: true, type: 'error', message: result?.error || "Erreur inconnue." })
        }
    }

    return (
        <>
            <StatusModal isOpen={modal.isOpen} type={modal.type} message={modal.message} onClose={() => setModal({ ...modal, isOpen: false })} />
            <div className="bg-zinc-900 p-8 rounded-2xl border border-white/10 max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">Nouveau Devis</h2>

                {/* Header Inputs */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Client</label>
                        <select className="w-full bg-black border border-zinc-700 text-white p-3 rounded-lg focus:border-primary outline-none" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                            <option value="">Sélectionner un client...</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Date</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-lg focus:border-primary outline-none" />
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-3 mb-8">
                    {items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 items-end bg-black/40 p-4 rounded-lg border border-white/5">
                            <div className="col-span-5"><label className="text-xs text-zinc-500 mb-1 block">Description</label><input type="text" placeholder="Désignation..." className="w-full bg-transparent border-b border-zinc-700 text-white pb-2 outline-none focus:border-primary font-medium" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} /><select onChange={(e) => updateItem(idx, 'productId_helper', e.target.value)} className="w-full bg-transparent text-[10px] text-zinc-600 mt-1 cursor-pointer hover:text-zinc-400 outline-none"><option value="">+ Catalogue...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                            <div className="col-span-2"><label className="text-xs text-zinc-500 mb-1 block text-center">Unité</label><input type="text" placeholder="ex: U" className="w-full bg-transparent border-b border-zinc-700 text-white pb-2 outline-none text-center focus:border-primary" value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} /></div>
                            <div className="col-span-2"><label className="text-xs text-zinc-500 mb-1 block text-center">Qté</label><input type="number" min="1" className="w-full bg-transparent border-b border-zinc-700 text-white pb-2 outline-none text-center focus:border-primary" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} /></div>
                            <div className="col-span-2"><label className="text-xs text-zinc-500 mb-1 block text-right">Prix</label><input type="number" className="w-full bg-transparent border-b border-zinc-700 text-white pb-2 outline-none text-right focus:border-primary" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))} /></div>
                            <div className="col-span-1 text-right pb-2"><button onClick={() => removeItem(idx)} className="text-zinc-600 hover:text-red-500"><span className="material-symbols-outlined">delete</span></button></div>
                        </div>
                    ))}
                    <button onClick={addItem} className="text-primary text-sm font-bold flex items-center gap-2 hover:opacity-80 mt-4"><span className="material-symbols-outlined text-lg">add_circle</span> AJOUTER UNE LIGNE</button>
                </div>

                {/* 💸 TOTALS SECTION */}
                <div className="flex flex-col items-end gap-2 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-zinc-500">Total HT (Brut)</span>
                        <span className="text-white font-mono">{totalHT_Gross.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-[#EAB308]">Remise (%)</span>
                        <input type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-20 bg-zinc-800 border border-zinc-700 rounded p-1 text-right text-white focus:border-[#EAB308] outline-none" />
                    </div>
                    <div className="flex items-center gap-4 border-t border-zinc-800 pt-2 mt-1">
                        <span className="text-sm text-zinc-500">Net HT</span>
                        <span className="text-white font-mono">{finalHT.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-zinc-500">TVA (20%)</span>
                        <span className="text-white font-mono">{finalTVA.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                        <span className="text-lg font-bold text-white">Total TTC</span>
                        <span className="text-2xl font-bold text-[#EAB308]">{finalTTC.toFixed(2)} DH</span>
                    </div>
                    <button onClick={handleSubmit} disabled={loading} className="mt-4 bg-gold-gradient text-black font-bold px-8 py-4 rounded-xl shadow-glow hover:scale-105 transition-transform">{loading ? 'Création...' : 'CRÉER LE DEVIS'}</button>
                </div>
            </div>
        </>
    )
}