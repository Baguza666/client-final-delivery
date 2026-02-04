'use client'

import React, { useState, useTransition } from 'react'
import { createExpense } from '@/app/actions/financeActions'
import { createBrowserClient } from '@supabase/ssr'

interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddExpenseModal({ isOpen, onClose, onSuccess }: AddExpenseModalProps) {
    const [isPending, startTransition] = useTransition()
    const [isRecurring, setIsRecurring] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: 'Matériel',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'Espèces',
        frequency: 'Mensuel',
        proof_url: '' // Will store the uploaded file URL
    })

    // Supabase for File Upload
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    if (!isOpen) return null;

    // --- HANDLE FILE UPLOAD ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            // Upload to 'receipts' bucket
            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
            setFormData(prev => ({ ...prev, proof_url: data.publicUrl }));
        } catch (error) {
            console.error('Upload failed:', error);
            alert("Erreur d'upload. Vérifiez que le bucket 'receipts' existe.");
        } finally {
            setUploading(false);
        }
    };

    // --- SUBMIT ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            await createExpense({ ...formData, is_recurring: isRecurring })
            onSuccess() // Refresh parent
            onClose()   // Close modal
            // Reset form
            setFormData({
                description: '',
                amount: '',
                category: 'Matériel',
                date: new Date().toISOString().split('T')[0],
                payment_method: 'Espèces',
                frequency: 'Mensuel',
                proof_url: ''
            })
            setIsRecurring(false)
        })
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden relative">

                {/* Header */}
                <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#EAB308]">add_circle</span>
                        Nouvelle Dépense
                    </h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Description</label>
                        <input
                            required
                            type="text"
                            placeholder="Ex: Achat Ciment, Paiement Electricité..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-[#EAB308] focus:border-[#EAB308] outline-none transition-all placeholder:text-zinc-600"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    {/* Amount & Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Montant (DH)</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-[#EAB308] focus:border-[#EAB308] outline-none font-mono"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Date</label>
                            <input
                                required
                                type="date"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-[#EAB308] focus:border-[#EAB308] outline-none"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Category & Payment */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Catégorie</label>
                            <select
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none appearance-none cursor-pointer"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option>Matériel</option>
                                <option>Main d'oeuvre</option>
                                <option>Transport</option>
                                <option>Bureau</option>
                                <option>Marketing</option>
                                <option>Dette</option>
                                <option>Autre</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Paiement</label>
                            <select
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none appearance-none cursor-pointer"
                                value={formData.payment_method}
                                onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                            >
                                <option>Espèces</option>
                                <option>Chèque</option>
                                <option>Virement</option>
                                <option>Carte Bancaire</option>
                            </select>
                        </div>
                    </div>

                    {/* RECEIPT UPLOAD */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                        <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider flex justify-between">
                            <span>Preuve / Reçu</span>
                            {uploading && <span className="text-[#EAB308] animate-pulse">Upload en cours...</span>}
                            {formData.proof_url && !uploading && <span className="text-emerald-500 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check</span> Reçu Ajouté</span>}
                        </label>
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="block w-full text-xs text-zinc-400
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-xs file:font-semibold
                                file:bg-zinc-800 file:text-white
                                hover:file:bg-zinc-700 cursor-pointer"
                        />
                    </div>

                    {/* Recurring Toggle */}
                    <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer select-none">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isRecurring ? 'bg-[#EAB308] border-[#EAB308]' : 'border-zinc-600 bg-transparent'}`}>
                                {isRecurring && <span className="material-symbols-outlined text-black text-[16px] font-bold">check</span>}
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={isRecurring}
                                onChange={e => setIsRecurring(e.target.checked)}
                            />
                            Dépense Récurrente
                        </label>

                        {isRecurring && (
                            <select
                                className="bg-zinc-800 border-zinc-700 rounded text-xs px-3 py-1.5 text-white outline-none"
                                value={formData.frequency}
                                onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                            >
                                <option>Hebdomadaire</option>
                                <option>Mensuel</option>
                                <option>Annuel</option>
                            </select>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isPending || uploading}
                        className="w-full bg-[#EAB308] hover:bg-[#EAB308]/90 text-black font-bold py-4 rounded-lg transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-yellow-900/20 mt-4"
                    >
                        {isPending ? (
                            <>
                                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">save</span>
                                Enregistrer la Dépense
                            </>
                        )}
                    </button>

                </form>
            </div>
        </div>
    )
}