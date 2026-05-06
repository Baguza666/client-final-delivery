'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updatePurchaseOrder } from '@/app/actions/purchaseOrders'
import { useModal } from '@/components/ui/ModalProvider'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import ProductCombobox, { type CatalogProduct } from '@/components/ui/ProductCombobox'

interface EditPOFormProps { document: any; clients: any[]; products?: CatalogProduct[] }

export default function EditPurchaseOrderForm({ document, clients, products = [] }: EditPOFormProps) {
    const router = useRouter()
    const { showModal } = useModal()
    const [loading, setLoading] = useState(false)

    const [number, setNumber] = useState(document.number || '')
    const [status, setStatus] = useState(document.status)
    const [clientId, setClientId] = useState(document.client_id)
    const [date, setDate] = useState(new Date(document.date).toISOString().split('T')[0])

    const [items, setItems] = useState(
        (document.purchase_order_items || []).map((item: any) => ({
            description: item.description,
            unit: item.unit || 'U',
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
        })),
    )

    const initialSnapshot = useRef<string | null>(null)
    useEffect(() => {
        initialSnapshot.current = JSON.stringify({ number, status, clientId, date, items })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const isDirty = !loading && initialSnapshot.current !== null &&
        JSON.stringify({ number, status, clientId, date, items }) !== initialSnapshot.current
    useUnsavedChanges(isDirty)

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
            <div className="bg-white/[0.025] border border-white/[0.06] p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Numéro</label><input type="text" value={number} onChange={(e) => setNumber(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none transition-all" /></div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Statut</label><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none transition-all"><option value="pending">En attente</option><option value="completed">Terminé</option><option value="cancelled">Annulé</option></select></div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Fournisseur / Client</label><select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none transition-all"><option value="">Sélectionner...</option>{clients.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none transition-all" /></div>
            </div>

            <div className="bg-white/[0.025] border border-white/[0.06] p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-6">Articles</h3>
                <div className="space-y-3">
                    {items.map((item: any, index: number) => (
                        <div key={index} className="grid grid-cols-12 gap-4 items-start bg-white/[0.03] border border-white/[0.04] p-3 rounded-xl">
                            <div className="col-span-5">
                                <ProductCombobox
                                    products={products}
                                    value={item.description}
                                    onChange={val => handleItemChange(index, 'description', val)}
                                    onSelect={product => {
                                        const newItems = [...items] as any
                                        newItems[index].description = product.name
                                        newItems[index].unit = product.unit
                                        newItems[index].unit_price = product.price
                                        newItems[index].total = newItems[index].quantity * product.price
                                        setItems(newItems)
                                    }}
                                    placeholder="Description..."
                                    className="w-full bg-transparent border-b border-white/[0.10] py-1 text-white text-sm outline-none focus:border-primary/60"
                                />
                            </div>
                            <div className="col-span-2"><input type="text" placeholder="U" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} className="w-full bg-transparent border-b border-white/[0.10] py-1 text-white text-sm text-center outline-none focus:border-primary/60" /></div>
                            <div className="col-span-2"><input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} className="w-full bg-transparent border-b border-white/[0.10] py-1 text-white text-sm text-center outline-none focus:border-primary/60" /></div>
                            <div className="col-span-2"><input type="number" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))} className="w-full bg-transparent border-b border-white/[0.10] py-1 text-white text-sm text-right outline-none focus:border-primary/60" /></div>
                            <div className="col-span-1 flex justify-center pt-1"><button onClick={() => handleRemoveItem(index)} className="text-zinc-600 hover:text-red-500 transition"><span className="material-symbols-outlined text-[18px]">delete</span></button></div>
                        </div>
                    ))}
                </div>
                <button onClick={handleAddItem} className="mt-6 text-primary text-xs font-bold flex items-center gap-2 hover:opacity-80 uppercase tracking-wide"><span className="material-symbols-outlined text-sm">add_circle</span> Ajouter une ligne</button>
            </div>

            <div className="bg-white/[0.025] border border-white/[0.06] p-6 rounded-2xl flex flex-col items-end gap-2">
                <div className="flex items-center gap-4 text-xs text-zinc-500"><span>Total HT</span><span>{totalHT.toFixed(2)}</span></div>
                <div className="flex items-center gap-4 text-xs text-zinc-500 border-t border-zinc-800 pt-1 mt-1"><span>TVA (20%)</span><span>{totalTVA.toFixed(2)}</span></div>
                <div className="flex items-center gap-4 text-xl font-bold text-white pt-1"><span>Total TTC</span><span className="text-primary">{totalTTC.toFixed(2)} DH</span></div>
            </div>

            <div className="flex justify-end">
                <button onClick={handleSave} disabled={loading} className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-4 rounded-xl transition-all">
                    {loading ? 'Enregistrement...' : 'SAUVEGARDER'}
                </button>
            </div>
        </div>
    )
}