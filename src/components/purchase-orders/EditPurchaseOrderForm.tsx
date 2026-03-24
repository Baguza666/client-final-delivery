'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updatePurchaseOrder } from '@/app/actions/purchaseOrders'
import { useModal } from '@/components/ui/ModalProvider'

interface EditPOFormProps { document: any; clients: any[] }

export default function EditPurchaseOrderForm({ document, clients }: EditPOFormProps) {
    const router = useRouter()
    const { showModal } = useModal()
    const [loading, setLoading] = useState(false)

    // ✅ State for custom number
    const [number, setNumber] = useState(document.number || '')
    const [status, setStatus] = useState(document.status)
    const [clientId, setClientId] = useState(document.client_id)
    const [date, setDate] = useState(new Date(document.date).toISOString().split('T')[0])

    const [items, setItems] = useState(document.purchase_order_items.map((item: any) => ({
        description: item.description,
        unit: item.unit || 'U',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total
    })))

    // 🧮 Calculations
    const totalHT = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)
    const totalTVA = totalHT * 0.20
    const totalTTC = totalHT + totalTVA

    const handleAddItem = () => { setItems([...items, { description: '', unit: 'U', quantity: 1, unit_price: 0, total: 0 }]) }
    const handleRemoveItem = (index: number) => { const newItems = [...items]; newItems.splice(index, 1); setItems(newItems) }
    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items] as any
        newItems[index][field] = value
        newItems[index].total = Number(newItems[index].quantity) * Number(newItems[index].unit_price)
        setItems(newItems)
    }

    const handleSave = async () => {
        setLoading(true)
        const formData = new FormData()
        formData.append('client_id', clientId)
        formData.append('number', number) // ✅ Send Custom Number
        formData.append('status', status)
        formData.append('date', date)

        const itemsToSave = items.map((item: any) => ({
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price
        }))
        formData.append('items', JSON.stringify(itemsToSave))

        const result = await updatePurchaseOrder(document.id, formData)
        setLoading(false)

        if (result?.error) {
            showModal({ title: "Erreur", message: result.error, type: "error" })
        } else {
            showModal({
                title: "Succès",
                message: "Bon de commande mis à jour.",
                type: "success",
                onConfirm: () => { router.push('/purchase-orders'); router.refresh(); }
            })
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Numéro</label><input type="text" value={number} onChange={(e) => setNumber(e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-lg focus:border-[#EAB308] outline-none" /></div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Statut</label><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-lg focus:border-[#EAB308] outline-none"><option value="pending">En attente</option><option value="completed">Terminé</option><option value="cancelled">Annulé</option></select></div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Fournisseur / Client</label><select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-lg focus:border-[#EAB308] outline-none"><option value="">Sélectionner...</option>{clients.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-lg focus:border-[#EAB308] outline-none" /></div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-6">Articles</h3>
                <div className="space-y-3">
                    {items.map((item: any, index: number) => (
                        <div key={index} className="grid grid-cols-12 gap-4 items-start bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                            <div className="col-span-5"><input type="text" placeholder="Description..." value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="w-full bg-transparent border-b border-zinc-700 py-1 text-white text-sm outline-none focus:border-[#EAB308]" /></div>
                            <div className="col-span-2"><input type="text" placeholder="U" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} className="w-full bg-transparent border-b border-zinc-700 py-1 text-white text-sm text-center outline-none focus:border-[#EAB308]" /></div>
                            <div className="col-span-2"><input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} className="w-full bg-transparent border-b border-zinc-700 py-1 text-white text-sm text-center outline-none focus:border-[#EAB308]" /></div>
                            <div className="col-span-2"><input type="number" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))} className="w-full bg-transparent border-b border-zinc-700 py-1 text-white text-sm text-right outline-none focus:border-[#EAB308]" /></div>
                            <div className="col-span-1 flex justify-center pt-1"><button onClick={() => handleRemoveItem(index)} className="text-zinc-600 hover:text-red-500 transition"><span className="material-symbols-outlined text-[18px]">delete</span></button></div>
                        </div>
                    ))}
                </div>
                <button onClick={handleAddItem} className="mt-6 text-[#EAB308] text-xs font-bold flex items-center gap-2 hover:opacity-80 uppercase tracking-wide"><span className="material-symbols-outlined text-sm">add_circle</span> Ajouter une ligne</button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col items-end gap-2">
                <div className="flex items-center gap-4 text-xs text-zinc-500"><span>Total HT</span><span>{totalHT.toFixed(2)}</span></div>
                <div className="flex items-center gap-4 text-xs text-zinc-500 border-t border-zinc-800 pt-1 mt-1"><span>TVA (20%)</span><span>{totalTVA.toFixed(2)}</span></div>
                <div className="flex items-center gap-4 text-xl font-bold text-white pt-1"><span>Total TTC</span><span className="text-[#EAB308]">{totalTTC.toFixed(2)} DH</span></div>
            </div>

            <div className="flex justify-end">
                <button onClick={handleSave} disabled={loading} className="bg-[#EAB308] hover:bg-[#EAB308]/90 text-black font-bold px-8 py-4 rounded-xl shadow-lg shadow-yellow-900/20 transition-transform active:scale-95">
                    {loading ? 'Enregistrement...' : 'SAUVEGARDER'}
                </button>
            </div>
        </div>
    )
}