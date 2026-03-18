'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useModal } from '@/components/ui/ModalProvider';

export default function InvoiceBuilder() {
    const router = useRouter();
    const { showModal } = useModal();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    const [selectedClientId, setSelectedClientId] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [discount, setDiscount] = useState(0);
    const [notes, setNotes] = useState(''); // ✅ Notes State
    const [items, setItems] = useState([{ description: '', unit: '', quantity: 1, price: 0 }]);

    useEffect(() => {
        const fetchData = async () => {
            const { data: clientsData } = await supabase.from('clients').select('*');
            const { data: productsData } = await supabase.from('products').select('*');
            if (clientsData) setClients(clientsData);
            if (productsData) setProducts(productsData);
        };
        fetchData();
    }, []);

    const handleAddItem = () => setItems([...items, { description: '', unit: '', quantity: 1, price: 0 }]);

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items] as any;
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleProductSelect = (index: number, productId: string) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            const newItems = [...items];
            newItems[index].description = product.name;
            newItems[index].price = product.price;
            setItems(newItems);
        }
    };

    // 🧮 Calculations
    const totalHT = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const discountAmount = totalHT * (discount / 100);
    const finalHT = totalHT - discountAmount;
    const finalTVA = finalHT * 0.20;
    const finalTTC = finalHT + finalTVA;

    const handleSave = async () => {
        if (!selectedClientId) {
            showModal({ title: "Oups", message: "Veuillez sélectionner un client.", type: "error" });
            return;
        }
        setLoading(true);

        const formData = new FormData();
        formData.append('client_id', selectedClientId);
        formData.append('date', invoiceDate);
        formData.append('due_date', dueDate);
        formData.append('discount', discount.toString());
        formData.append('notes', notes); // ✅ Pass Notes
        formData.append('items', JSON.stringify(items));

        const { createInvoice } = await import('@/app/actions/invoices');
        const result = await createInvoice(formData);

        if (result?.error) {
            showModal({ title: "Erreur", message: result.error, type: "error" });
        } else {
            showModal({
                title: "Succès",
                message: "Facture créée avec succès.",
                type: "success",
                onConfirm: () => { router.push('/invoices'); router.refresh(); }
            });
        }
        setLoading(false);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">

            {/* Header Inputs */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs text-[#a1a1aa] uppercase font-bold mb-2">Client</label>
                    <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#EAB308]">
                        <option value="">Sélectionner...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-[#a1a1aa] uppercase font-bold mb-2">Date</label>
                        <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#EAB308]" />
                    </div>
                    <div>
                        <label className="block text-xs text-[#a1a1aa] uppercase font-bold mb-2">Échéance</label>
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#EAB308]" />
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="glass-card p-6 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4">Éléments</h3>
                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-4 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="col-span-5 flex flex-col gap-2">
                                <input type="text" placeholder="Description..." value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-white outline-none focus:border-[#EAB308] font-medium" />
                                <select onChange={(e) => handleProductSelect(index, e.target.value)} className="w-full bg-transparent text-[10px] text-[#a1a1aa] outline-none cursor-pointer hover:text-white">
                                    <option value="">+ Catalogue...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <input type="text" placeholder="U" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-white text-center outline-none focus:border-[#EAB308]" />
                            </div>
                            <div className="col-span-2">
                                <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))} className="w-full bg-transparent border-b border-white/10 py-2 text-white text-center outline-none focus:border-[#EAB308]" />
                            </div>
                            <div className="col-span-2">
                                <input type="number" value={item.price} onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value))} className="w-full bg-transparent border-b border-white/10 py-2 text-white text-right outline-none focus:border-[#EAB308]" />
                            </div>
                            <div className="col-span-1 flex justify-center pt-2">
                                <button onClick={() => handleRemoveItem(index)} className="text-zinc-600 hover:text-red-500 transition"><span className="material-symbols-outlined">delete</span></button>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={handleAddItem} className="mt-6 text-[#EAB308] text-sm font-bold flex items-center gap-2 hover:opacity-80">
                    <span className="material-symbols-outlined">add_circle</span> AJOUTER UNE LIGNE
                </button>
            </div>

            {/* 💸 TOTALS & NOTES SECTION */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-8 justify-between">

                {/* 📝 Left Side: Notes */}
                <div className="w-full md:w-1/2 flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Conditions / Notes de paiement</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ex: Paiement à réception de la facture..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-[#EAB308] resize-y min-h-[120px]"
                    />
                </div>

                {/* Right Side: Totals */}
                <div className="w-full md:w-1/2 flex flex-col items-end gap-3 pt-4 md:pt-0">
                    <div className="flex items-center gap-4 w-64 justify-between">
                        <span className="text-sm text-zinc-400">Total HT (Brut)</span>
                        <span className="text-white font-mono">{totalHT.toFixed(2)}</span>
                    </div>

                    {/* DISCOUNT INPUT */}
                    <div className="flex items-center gap-4 w-64 justify-between">
                        <span className="text-sm text-[#EAB308]">Remise (%)</span>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={discount}
                            onChange={(e) => setDiscount(Number(e.target.value))}
                            className="w-20 bg-zinc-800 border border-zinc-700 rounded p-1 text-right text-white focus:border-[#EAB308] outline-none font-mono"
                        />
                    </div>

                    <div className="flex items-center gap-4 border-t border-zinc-800 pt-3 mt-1 w-64 justify-between">
                        <span className="text-sm text-zinc-400">Net HT</span>
                        <span className="text-white font-mono">{finalHT.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-4 w-64 justify-between">
                        <span className="text-sm text-zinc-400">TVA (20%)</span>
                        <span className="text-white font-mono">{finalTVA.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-4 pt-4 w-full justify-end">
                        <span className="text-lg font-bold text-white mr-4">Total TTC</span>
                        <span className="text-3xl font-black text-[#EAB308] tracking-tight">{finalTTC.toFixed(2)} DH</span>
                    </div>

                    <button onClick={handleSave} disabled={loading} className="mt-6 w-full md:w-auto bg-[#EAB308] text-black font-bold px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-all flex items-center justify-center gap-2">
                        {loading ? '...' : <><span className="material-symbols-outlined">save</span> CRÉER LA FACTURE</>}
                    </button>
                </div>
            </div>
        </div>
    );
}