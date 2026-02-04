'use client';
import { useState } from 'react';
import { createProduct, deleteProduct } from '@/app/actions/data';

export default function ProductManager({ products, workspaceId }: { products: any[], workspaceId: string }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        await createProduct(new FormData(e.currentTarget));
        setLoading(false);
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Supprimer ce produit ?')) await deleteProduct(id);
    };

    return (
        <>
            <div className="flex justify-end mb-6">
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 h-10 px-6 rounded-full bg-white text-black text-sm font-bold shadow-lg hover:bg-gray-200 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    AJOUTER SERVICE / PRODUIT
                </button>
            </div>

            <div className="glass-card rounded-3xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-xs text-text-secondary border-b border-border-dark/50 bg-white/[0.02]">
                            <th className="py-4 px-6">Nom</th>
                            <th className="py-4 px-6">Description</th>
                            <th className="py-4 px-6">Unité</th>
                            <th className="py-4 px-6 text-right">Prix Unitaire</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-border-dark/30">
                        {products.map(product => (
                            <tr key={product.id} className="group hover:bg-white/[0.03]">
                                <td className="py-4 px-6 font-bold text-white">{product.name}</td>
                                <td className="py-4 px-6 text-text-secondary">{product.description || '-'}</td>
                                <td className="py-4 px-6 text-xs uppercase tracking-wider text-text-secondary">{product.unit}</td>
                                <td className="py-4 px-6 text-right font-mono text-primary">{product.price} MAD</td>
                                <td className="py-4 px-6 text-right">
                                    <button onClick={() => handleDelete(product.id)} className="text-text-secondary hover:text-red-500">
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {products.length === 0 && <div className="p-8 text-center text-text-secondary text-sm">Aucun produit ou service défini.</div>}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-text-secondary hover:text-white"><span className="material-symbols-outlined">close</span></button>
                        <h3 className="text-white text-xl font-bold mb-6">Nouveau Service / Produit</h3>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <input type="hidden" name="workspace_id" value={workspaceId} />
                            <input name="name" required placeholder="Nom du service (ex: Peinture m²)" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none" />
                            <div className="grid grid-cols-2 gap-4">
                                <input name="price" type="number" step="0.01" required placeholder="Prix (0.00)" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none" />
                                <select name="unit" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none">
                                    <option value="Unité">Unité</option>
                                    <option value="Heure">Heure</option>
                                    <option value="Jour">Jour</option>
                                    <option value="m²">m²</option>
                                    <option value="Forfait">Forfait</option>
                                </select>
                            </div>
                            <textarea name="description" rows={3} placeholder="Description (optionnel)" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none" />
                            <button disabled={loading} className="mt-2 w-full h-12 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-colors">{loading ? '...' : 'Ajouter'}</button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}