'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateInvoice } from '@/app/actions/invoices'
import { useModal } from '@/components/ui/ModalProvider'

interface EditInvoiceFormProps { invoice: any; clients: any[] }

export default function EditInvoiceForm({ invoice, clients }: EditInvoiceFormProps) {
    const router = useRouter()
    const { showModal } = useModal()
    const [loading, setLoading] = useState(false)

    const [invoiceNumber, setInvoiceNumber] = useState(invoice.number || invoice.invoice_number)
    const [status, setStatus] = useState(invoice.status)
    const [clientId, setClientId] = useState(invoice.client_id)
    const [date, setDate] = useState(new Date(invoice.date).toISOString().split('T')[0])
    const [dueDate, setDueDate] = useState(invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : '')
    const [discount, setDiscount] = useState(invoice.discount || 0)
    const [notes, setNotes] = useState(invoice.notes || '') // ✅ Load existing Notes from DB

    const [items, setItems] = useState(invoice.invoice_items.map((item: any) => ({
        description: item.description,
        unit: item.unit || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total
    })))

    // 🧮 Calculations
    const totalHT_Gross = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)
    const discountAmount = totalHT_Gross * (discount / 100)
    const finalHT = totalHT_Gross - discountAmount
    const finalTVA = finalHT * 0.20
    const finalTTC = finalHT + finalTVA

    const handleAddItem = () => { setItems([...items, { description: '', unit: '', quantity: 1, unit_price: 0, total: 0 }]) }
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
        formData.append('number', invoiceNumber)
        formData.append('status', status)
        formData.append('date', date)
        formData.append('due_date', dueDate)
        formData.append('discount', discount.toString())
        formData.append('notes', notes) // ✅ Save Notes to Server Action

        const itemsToSave = items.map((item: any) => ({
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price
        }))
        formData.append('items', JSON.stringify(itemsToSave))

        const result = await updateInvoice(invoice.id, formData)
        setLoading(false)

        if (result?.error) {
            showModal({ title: "Erreur", message: result.error, type: "error" })
        } else {
            showModal({
                title: "Succès",
                message: "Facture mise à jour.",
                type: "success",
                onConfirm: () => { router.push('/invoices'); router.refresh(); }
            })
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header inputs */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Numéro</label><input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-lg focus:border-[#EAB308] outline-none" /></div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Statut</label><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-lg focus:border-[#EAB308] outline-none"><option value="draft">Brouillon</option><option value="sent">Envoyée</option><option value="paid">Payée</option></select></div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Client</label><select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-lg focus:border-[#EAB308] outline-none"><option value="">Sélectionner...</option>{clients.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-lg focus:border-[#EAB308] outline-none" /></div>
                    <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Échéance</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-lg focus:border-[#EAB308] outline-none" /></div>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-6">Articles & Services</h3>
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

            {/* 💸 TOTALS & NOTES SECTION */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-start md:justify-between gap-10">

                {/* 📝 Left Side: Custom Notes */}
                <div className="w-full md:w-1/2 flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Conditions / Notes de paiement</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ex: Paiement à réception de la facture..."
                        className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white text-sm outline-none focus:border-[#EAB308] resize-y min-h-[100px]"
                    />
                </div>

                {/* Right Side: Totals */}
                <div className="w-full md:w-1/2 flex flex-col items-end gap-2 pt-2 md:pt-0">
                    <div className="flex items-center gap-4 text-xs text-zinc-500"><span>Total HT Brut</span><span>{totalHT_Gross.toFixed(2)}</span></div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-[#EAB308]">Remise (%)</span>
                        <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-16 bg-zinc-800 border border-zinc-700 rounded text-right text-white focus:border-[#EAB308] outline-none text-sm p-1" />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 border-t border-zinc-800 pt-1 mt-1"><span>Net HT</span><span>{finalHT.toFixed(2)}</span></div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500"><span>TVA (20%)</span><span>{finalTVA.toFixed(2)}</span></div>
                    <div className="flex items-center gap-4 text-xl font-bold text-white pt-1"><span>Total TTC</span><span className="text-[#EAB308]">{finalTTC.toFixed(2)} DH</span></div>
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={handleSave} disabled={loading} className="bg-[#EAB308] hover:bg-[#EAB308]/90 text-black font-bold px-8 py-4 rounded-xl shadow-lg shadow-yellow-900/20 transition-transform active:scale-95">
                    {loading ? 'Enregistrement...' : 'SAUVEGARDER'}
                </button>
            </div>
        </div>
    )
}