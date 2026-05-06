'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useModal } from '@/components/ui/ModalProvider'
import ProductCombobox, { type CatalogProduct } from '@/components/ui/ProductCombobox'
import { convertStatic, getStaticRate, SUPPORTED_CURRENCIES, conversionRate } from '@/utils/currency'

const TVA_RATES = [0, 7, 10, 14, 20]

interface InvoiceItem {
    description: string
    unit: string
    quantity: number
    unit_price: number       // stored in document currency
    tva_rate: number
    original_price?: number  // product price in base_currency, frozen at selection
    base_currency?: string   // product's base_currency, frozen at selection
    rate_snapshot?: number   // exchange rate used at selection (1 doc_currency = X MAD)
}

interface Props {
    clients: { id: string; name: string }[]
    products: CatalogProduct[]
}

const EMPTY_ITEM: InvoiceItem = { description: '', unit: '', quantity: 1, unit_price: 0, tva_rate: 20 }

export default function InvoiceBuilder({ clients, products }: Props) {
    const router = useRouter()
    const { showModal } = useModal()
    const searchParams = useSearchParams()

    const [loading, setLoading] = useState(false)
    const [selectedClientId, setSelectedClientId] = useState('')
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
    const [dueDate, setDueDate] = useState('')
    const [discount, setDiscount] = useState(0)
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<InvoiceItem[]>([{ ...EMPTY_ITEM }])
    const [isRecurring, setIsRecurring] = useState(searchParams.get('recurring') === 'true')
    const [frequency, setFrequency] = useState('monthly')
    const [currency, setCurrency] = useState('MAD')
    const [exchangeRate, setExchangeRate] = useState(1)

    const handleAddItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== index) return item
            // Changing unit_price manually clears the conversion hint
            if (field === 'unit_price') {
                const { original_price: _op, base_currency: _bc, rate_snapshot: _rs, ...rest } = item
                return { ...rest, unit_price: value as number }
            }
            return { ...item, [field]: value }
        }))
    }

    const handleProductSelect = (index: number, product: CatalogProduct) => {
        const prodCurrency = product.base_currency || 'MAD'
        const needsConversion = currency !== prodCurrency

        let converted: number
        let meta: Partial<InvoiceItem> = {}

        if (needsConversion) {
            converted = convertStatic(product.price, prodCurrency, currency)
            meta = {
                original_price: product.price,
                base_currency: prodCurrency,
                // 1 prodCurrency = N docCurrency — frozen at selection time
                rate_snapshot: conversionRate(prodCurrency, currency),
            }
        } else {
            converted = product.price
        }

        setItems(prev => prev.map((item, i) =>
            i === index
                ? { ...item, description: product.name, unit: product.unit, unit_price: converted, ...meta }
                : item
        ))
    }

    const handleCurrencyChange = (newCurrency: string) => {
        setCurrency(newCurrency)
        if (newCurrency === 'MAD') {
            setExchangeRate(1)
        } else {
            // Pre-fill with the static default so user doesn't have to look it up
            setExchangeRate(getStaticRate(newCurrency))
        }
        // Clear conversion metadata when currency changes (prices are now stale)
        setItems(prev => prev.map(({ original_price: _op, base_currency: _bc, rate_snapshot: _rs, ...item }) => item))
    }

    // Totals — all in document currency
    const totalHT = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const discountAmount = totalHT * (discount / 100)
    const finalHT = totalHT - discountAmount
    const discountRatio = totalHT > 0 ? finalHT / totalHT : 1
    const finalTVA = items.reduce((sum, item) => {
        const lineHT = item.quantity * item.unit_price * discountRatio
        return sum + lineHT * (item.tva_rate / 100)
    }, 0)
    const finalTTC = finalHT + finalTVA

    const currSuffix = currency === 'MAD' ? 'DH' : currency

    const handleSave = async () => {
        if (!selectedClientId) {
            showModal({ title: 'Oups', message: 'Veuillez sélectionner un client.', type: 'error' })
            return
        }
        setLoading(true)
        const formData = new FormData()
        formData.append('client_id', selectedClientId)
        formData.append('date', invoiceDate)
        formData.append('due_date', dueDate)
        formData.append('discount', discount.toString())
        formData.append('notes', notes)
        formData.append('items', JSON.stringify(items))
        formData.append('is_recurring', isRecurring ? 'true' : 'false')
        if (isRecurring) formData.append('frequency', frequency)
        formData.append('currency', currency)
        formData.append('exchange_rate', exchangeRate.toString())

        const { createInvoice } = await import('@/app/actions/invoices')
        const result = await createInvoice(formData)

        if (result?.error) {
            showModal({ title: 'Erreur', message: result.error, type: 'error' })
        } else {
            showModal({
                title: 'Succès',
                message: 'Facture créée avec succès.',
                type: 'success',
                onConfirm: () => { router.push('/invoices'); router.refresh() },
            })
        }
        setLoading(false)
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">

            {/* Header */}
            <div className="bg-white/[0.025] border border-white/[0.06] p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 tracking-wider">Client</label>
                    <select
                        value={selectedClientId}
                        onChange={e => setSelectedClientId(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/60 appearance-none transition-all"
                    >
                        <option value="">Sélectionner…</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 tracking-wider">Date</label>
                        <input
                            type="date"
                            value={invoiceDate}
                            onChange={e => setInvoiceDate(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/60 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 tracking-wider">Échéance</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/60 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Currency */}
            <div className="bg-white/[0.025] border border-white/[0.06] p-4 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 tracking-wider">Devise</label>
                    <select
                        value={currency}
                        onChange={e => handleCurrencyChange(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-primary/40 outline-none"
                    >
                        {SUPPORTED_CURRENCIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
                {currency !== 'MAD' && (
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 tracking-wider">
                            Taux (1 {currency} = ? MAD)
                        </label>
                        <input
                            type="number"
                            value={exchangeRate}
                            min="0.001"
                            step="0.001"
                            onChange={e => setExchangeRate(parseFloat(e.target.value) || 1)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-primary/40 outline-none font-mono"
                        />
                    </div>
                )}
                {currency !== 'MAD' && (
                    <div className="col-span-2 flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5">
                        <span className="material-symbols-outlined text-primary text-[16px]">currency_exchange</span>
                        <p className="text-xs text-zinc-400">
                            Total TTC: <span className="font-bold text-white font-mono">{finalTTC.toFixed(2)} {currency}</span>
                            {' '}· Équivalent MAD: <span className="font-bold text-white font-mono">{(finalTTC * exchangeRate).toFixed(2)} MAD</span>
                        </p>
                    </div>
                )}
            </div>

            {/* Recurring toggle */}
            <div className="bg-white/[0.025] border border-white/[0.06] p-4 rounded-2xl flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-white">Facture récurrente</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Cette facture sera générée automatiquement à chaque période</p>
                </div>
                <div className="flex items-center gap-4">
                    {isRecurring && (
                        <select
                            value={frequency}
                            onChange={e => setFrequency(e.target.value)}
                            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary/40 outline-none"
                        >
                            <option value="monthly">Mensuelle</option>
                            <option value="quarterly">Trimestrielle</option>
                            <option value="biannual">Semestrielle</option>
                            <option value="annual">Annuelle</option>
                        </select>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsRecurring(v => !v)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${isRecurring ? 'bg-primary' : 'bg-white/[0.08]'}`}
                    >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isRecurring ? 'left-5' : 'left-0.5'}`} />
                    </button>
                </div>
            </div>

            {/* Items */}
            <div className="bg-white/[0.025] border border-white/[0.06] p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-zinc-500">list_alt</span>
                        Éléments
                    </h3>
                    {products.length > 0 && (
                        <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">inventory_2</span>
                            Tapez dans Description pour chercher le catalogue
                        </span>
                    )}
                </div>

                {/* Column headers */}
                <div className="hidden md:grid grid-cols-12 gap-3 px-1 mb-1">
                    <div className="col-span-4 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Description</div>
                    <div className="col-span-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider text-center">Unité</div>
                    <div className="col-span-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider text-center">Qté</div>
                    <div className="col-span-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider text-right">
                        Prix ({currSuffix})
                    </div>
                    <div className="col-span-1 text-[10px] font-bold text-zinc-600 uppercase tracking-wider text-center">TVA</div>
                    <div className="col-span-1" />
                </div>

                <div className="space-y-2">
                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 items-start bg-white/[0.03] border border-white/[0.04] p-3 rounded-xl">
                            <div className="col-span-12 md:col-span-4">
                                <ProductCombobox
                                    products={products}
                                    value={item.description}
                                    onChange={val => handleItemChange(index, 'description', val)}
                                    onSelect={product => handleProductSelect(index, product)}
                                    placeholder="Description…"
                                    className="w-full bg-transparent border-b border-white/[0.10] py-1.5 text-white text-sm outline-none focus:border-primary/60 placeholder:text-zinc-700"
                                />
                            </div>
                            <div className="col-span-3 md:col-span-2">
                                <input
                                    type="text"
                                    placeholder="U"
                                    value={item.unit}
                                    onChange={e => handleItemChange(index, 'unit', e.target.value)}
                                    className="w-full bg-transparent border-b border-white/[0.10] py-1.5 text-white text-sm text-center outline-none focus:border-primary/60"
                                />
                            </div>
                            <div className="col-span-3 md:col-span-2">
                                <input
                                    type="number"
                                    value={item.quantity}
                                    min="0"
                                    onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-transparent border-b border-white/[0.10] py-1.5 text-white text-sm text-center outline-none focus:border-primary/60"
                                />
                            </div>
                            <div className="col-span-3 md:col-span-2">
                                <input
                                    type="number"
                                    value={item.unit_price}
                                    min="0"
                                    step="0.01"
                                    onChange={e => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-transparent border-b border-white/[0.10] py-1.5 text-white text-sm text-right outline-none focus:border-primary/60 font-mono"
                                />
                                {/* Conversion hint — shown only when auto-converted from catalog */}
                                {item.original_price != null && item.base_currency && item.base_currency !== currency && (
                                    <p className="text-[9px] text-zinc-500 text-right mt-0.5 font-mono leading-tight">
                                        <span className="material-symbols-outlined text-[9px] align-middle">swap_horiz</span>
                                        {' '}{item.original_price.toFixed(2)} {item.base_currency} · taux {item.rate_snapshot?.toFixed(2)}
                                    </p>
                                )}
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <select
                                    value={item.tva_rate}
                                    onChange={e => handleItemChange(index, 'tva_rate', Number(e.target.value))}
                                    className="w-full bg-transparent border-b border-white/[0.10] py-1.5 text-zinc-400 text-xs text-center outline-none focus:border-primary/60 cursor-pointer"
                                >
                                    {TVA_RATES.map(r => <option key={r} value={r} className="bg-zinc-900">{r}%</option>)}
                                </select>
                            </div>
                            <div className="col-span-1 flex justify-center pt-1">
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

            {/* Totals + Notes */}
            <div className="bg-white/[0.025] border border-white/[0.06] p-6 rounded-2xl flex flex-col md:flex-row gap-8 justify-between">
                <div className="w-full md:w-1/2 flex flex-col gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Conditions / Notes de paiement</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Ex: Paiement à réception de la facture…"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-white text-sm outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/60 resize-y min-h-[100px] transition-all"
                    />
                </div>

                <div className="w-full md:w-1/2 flex flex-col items-end gap-2.5 pt-2">
                    <div className="flex justify-between w-60 text-sm">
                        <span className="text-zinc-500">Total HT brut</span>
                        <span className="font-mono text-white">{totalHT.toFixed(2)} {currSuffix}</span>
                    </div>
                    <div className="flex items-center justify-between w-60">
                        <span className="text-sm text-primary">Remise (%)</span>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={discount}
                            onChange={e => setDiscount(Number(e.target.value))}
                            className="w-20 bg-white/[0.04] border border-white/[0.08] rounded-lg p-1.5 text-right text-white focus:border-primary/60 outline-none font-mono text-sm"
                        />
                    </div>
                    <div className="flex justify-between w-60 text-sm border-t border-zinc-800 pt-2">
                        <span className="text-zinc-500">Net HT</span>
                        <span className="font-mono text-white">{finalHT.toFixed(2)} {currSuffix}</span>
                    </div>
                    <div className="flex justify-between w-60 text-sm">
                        <span className="text-zinc-500">TVA</span>
                        <span className="font-mono text-white">{finalTVA.toFixed(2)} {currSuffix}</span>
                    </div>
                    <div className="flex justify-between w-full pt-3">
                        <span className="text-base font-bold text-white">Total TTC</span>
                        <div className="text-right">
                            <span className="text-2xl font-black text-primary font-mono tracking-tight">
                                {finalTTC.toFixed(2)} {currSuffix}
                            </span>
                            {currency !== 'MAD' && (
                                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                                    ≈ {(finalTTC * exchangeRate).toFixed(2)} MAD
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={loading}
                        className="mt-4 w-full bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><span className="material-symbols-outlined text-[18px]">save</span> Créer la facture</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
