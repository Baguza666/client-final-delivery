'use client';

import { useState } from 'react';
import { addExpense, createDebt } from '@/app/actions/finance';

export default function FinanceControls({ workspaceId }: { workspaceId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'expense' | 'debt'>('expense');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        formData.append('workspace_id', workspaceId);

        if (activeTab === 'expense') {
            await addExpense(formData);
        } else {
            await createDebt(formData);
        }

        setLoading(false);
        setIsOpen(false);
        // Reset form naturally by closing
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 h-10 px-6 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-sm font-bold hover:bg-red-500/20 transition-all"
            >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>AJOUTER DÉPENSE / DETTE</span>
            </button>

            {/* MODAL */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>

                    <div className="relative bg-[#1a1a1a] border border-white/10 w-full max-w-lg rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-white text-xl font-bold mb-6">Nouvelle Opération</h3>

                        {/* TABS */}
                        <div className="flex p-1 bg-white/5 rounded-xl mb-6">
                            <button
                                onClick={() => setActiveTab('expense')}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'expense' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'}`}
                            >
                                Dépense (Reçu)
                            </button>
                            <button
                                onClick={() => setActiveTab('debt')}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'debt' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'}`}
                            >
                                Nouvelle Dette
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                            {/* EXPENSE FORM */}
                            {activeTab === 'expense' && (
                                <>
                                    <div>
                                        <label className="text-xs text-text-secondary mb-1 block">Montant (MAD)</label>
                                        <input name="amount" type="number" step="0.01" required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-text-secondary mb-1 block">Catégorie</label>
                                        <select name="category" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none">
                                            <option value="Matériel">Matériel</option>
                                            <option value="Transport">Transport</option>
                                            <option value="Bureau">Bureau</option>
                                            <option value="Salaires">Salaires</option>
                                            <option value="Autre">Autre</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-text-secondary mb-1 block">Description</label>
                                        <input name="description" type="text" required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none" placeholder="Ex: Achat papier" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-text-secondary mb-1 block">Reçu (Image)</label>
                                        <input name="receipt" type="file" accept="image/*" className="w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20" />
                                    </div>
                                </>
                            )}

                            {/* DEBT FORM */}
                            {activeTab === 'debt' && (
                                <>
                                    <div>
                                        <label className="text-xs text-text-secondary mb-1 block">Créancier (Qui a prêté ?)</label>
                                        <input name="creditor" type="text" required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none" placeholder="Ex: Banque Populaire" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-text-secondary mb-1 block">Montant Total</label>
                                            <input name="total_amount" type="number" required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none" placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-text-secondary mb-1 block">Mensualité</label>
                                            <input name="monthly_payment" type="number" required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-text-secondary mb-1 block">Date de début / prochaine échéance</label>
                                        <input name="due_date" type="date" required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none" />
                                    </div>
                                </>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-4 w-full h-12 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Traitement...' : 'Enregistrer'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}