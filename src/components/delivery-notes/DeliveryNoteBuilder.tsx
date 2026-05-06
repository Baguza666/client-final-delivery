'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useModal } from '@/components/ui/ModalProvider'
import ProductCombobox, { type CatalogProduct } from '@/components/ui/ProductCombobox'

interface DNItem {
    description: string
    unit: string
    quantity: number
}

interface Props {
    clients: { id: string; name: string }[]
    products: CatalogProduct[]
}

const EMPTY_ITEM: DNItem = { description: '', unit: '', quantity: 1 }

export default function DeliveryNoteBuilder({ clients, products }: Props) {
    const router = useRouter()
    const { showModal } = useModal()

    const [loading, setLoading] = useState(false)
    const [selectedClientId, setSelectedClientId] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [items, setItems] = useState<DNItem[]>([{ ...EMPTY_ITEM }])

    const handleAddItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    const handleItemChange = (index: number, field: keyof DNItem, value: string | number) => {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
    }

    const handleProductSelect = (index: number, product: CatalogProduct) => {
        setItems(prev => prev.map((item, i) =>
            i === index ? { ...item, description: product.name, unit: product.unit } : item
        ))
    }

    const handleSave = async () => {
        if (!selectedClientId) {
            showModal({ title: 'Oups', message: 'Veuillez sélectionner un destinataire.', type: 'error' })
            return
        }
        setLoading(true)
        const formData = new FormData()
        formData.append('client_id', selectedClientId)
        formData.append('date', date)
        formData.append('items', JSON.stringify(items))

        const { createDeliveryNote } = await import('@/app/actions/deliveryNotes')
        const result = await createDeliveryNote(formData)

        if (result?.error) {
            showModal({ title: 'Erreur', message: result.error, type: 'error' })
        } else {
            showModal({
                title: 'Succès',
                message: 'Bon de livraison créé avec succès.',
                type: 'success',
                onConfirm: () => { router.push('/delivery-notes'); router.refresh() },
            })
        }
        setLoading(false)
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">

            {/* Header */}
            <div className="bg-white/[0.025] border border-white/[0.06] p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 tracking-wider">Destinataire / Client</label>
                    <select
                        value={selectedClientId}
                        onChange={e => setSelectedClientId(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/60 appearance-none transition-all"
                    >
                        <option value="">Sélectionner…</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 tracking-wider">Date de livraison</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/60 transition-all"
                    />
                </div>
            </div>

            {/* Items */}
            <div className="bg-white/[0.025] border border-white/[0.06] p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-zinc-500">list_alt</span>
                        Articles à livrer
                    </h3>
                    {products.length > 0 && (
                        <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">inventory_2</span>
                            Tapez dans Description pour chercher le catalogue
                        </span>
                    )}
                </div>

                <div className="hidden md:grid grid-cols-12 gap-3 px-1 mb-1">
                    <div className="col-span-7 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Description</div>
                    <div className="col-span-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider text-center">Unité</div>
                    <div className="col-span-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider text-center">Qté</div>
                    <div className="col-span-1" />
                </div>

                <div className="space-y-2">
                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 items-start bg-white/[0.03] border border-white/[0.04] p-3 rounded-xl">
                            <div className="col-span-12 md:col-span-7">
                                <ProductCombobox
                                    products={products}
                                    value={item.description}
                                    onChange={val => handleItemChange(index, 'description', val)}
                                    onSelect={product => handleProductSelect(index, product)}
                                    placeholder="Description…"
                                    className="w-full bg-transparent border-b border-white/[0.10] py-1.5 text-white text-sm outline-none focus:border-primary/60 placeholder:text-zinc-700"
                                />
                            </div>
                            <div className="col-span-5 md:col-span-2">
                                <input
                                    type="text"
                                    placeholder="U"
                                    value={item.unit}
                                    onChange={e => handleItemChange(index, 'unit', e.target.value)}
                                    className="w-full bg-transparent border-b border-white/[0.10] py-1.5 text-white text-sm text-center outline-none focus:border-primary/60"
                                />
                            </div>
                            <div className="col-span-5 md:col-span-2">
                                <input
                                    type="number"
                                    value={item.quantity}
                                    min="0"
                                    onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-transparent border-b border-white/[0.10] py-1.5 text-white text-sm text-center outline-none focus:border-primary/60"
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1 flex justify-center pt-1">
                                <button
                                    type="button"
                                    onClick={() => handleRemoveItem(index)}
                                    disabled={items.length === 1}
                                    className="text-zinc-700 hover:text-rose-400 transition-colors disabled:opacity-20"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={handleAddItem}
                    className="mt-4 text-primary text-xs font-bold flex items-center gap-2 hover:opacity-80 uppercase tracking-wide"
                >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Ajouter une ligne
                </button>
            </div>

            {/* Save */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <><span className="material-symbols-outlined text-[18px]">save</span> Créer le bon de livraison</>
                    )}
                </button>
            </div>
        </div>
    )
}
