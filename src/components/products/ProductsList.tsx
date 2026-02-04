'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useUserRole } from '@/hooks/useUserRole';

export default function ProductsList({ initialProducts }: { initialProducts: any[] }) {
    const { isAdmin, isEditor, isViewer } = useUserRole();
    const [products, setProducts] = useState(initialProducts);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form States
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (isAdmin) {
            // ADMIN: Direct Add
            const { data, error } = await supabase
                .from('products')
                .insert([{
                    owner_id: user.id,
                    name: newName,
                    price: parseFloat(newPrice),
                    description: newDesc
                }])
                .select()
                .single();

            if (!error && data) {
                setProducts([data, ...products]);
                closeModal();
            }
        }
        else if (isEditor) {
            // EDITOR: Request
            const { error } = await supabase
                .from('resource_requests')
                .insert({
                    user_id: user.id,
                    type: 'product',
                    details: { name: newName, price: newPrice, description: newDesc },
                    status: 'pending'
                });

            if (!error) {
                alert("Demande de service envoyée à l'admin !");
                closeModal();
            }
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!isAdmin) return;
        if (!confirm('Supprimer ce service ?')) return;

        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) {
            setProducts(products.filter(p => p.id !== id));
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewName(''); setNewPrice(''); setNewDesc('');
    };

    return (
        <div>
            {/* Header Action: Hidden for Viewers */}
            {!isViewer && (
                <div className="flex justify-end mb-6">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-gold-gradient text-black px-6 py-2 rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">
                            {isAdmin ? 'add' : 'outgoing_mail'}
                        </span>
                        {isAdmin ? 'NOUVEAU SERVICE' : 'DEMANDER AJOUT'}
                    </button>
                </div>
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                    <div key={product.id} className="glass-card p-6 rounded-2xl border border-white/5 hover:border-primary/50 transition-colors group relative">

                        {/* Delete: Admin Only */}
                        {isAdmin && (
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-400">
                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                            </div>
                        )}

                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                            <span className="material-symbols-outlined">inventory_2</span>
                        </div>

                        <h3 className="text-white font-bold text-lg">{product.name}</h3>
                        <p className="text-text-secondary text-sm mb-4 line-clamp-2 min-h-[40px]">
                            {product.description || 'Aucune description'}
                        </p>

                        <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                            <span className="text-xs text-text-secondary uppercase">Prix unitaire</span>
                            <span className="text-primary font-bold text-xl">{product.price} Dh</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {products.length === 0 && (
                <div className="text-center py-20 text-text-secondary">
                    <span className="material-symbols-outlined text-6xl mb-4 opacity-20">inventory_2</span>
                    <p>Aucun service enregistré.</p>
                </div>
            )}

            {/* ADD MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl max-w-md w-full relative">
                        <button onClick={closeModal} className="absolute top-4 right-4 text-text-secondary hover:text-white">
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <h3 className="text-xl font-bold text-white mb-6">
                            {isAdmin ? 'Nouveau Service' : "Demande d'ajout Service"}
                        </h3>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <input
                                placeholder="Nom du service (ex: Consultation)"
                                value={newName} onChange={e => setNewName(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                                required
                            />
                            <input
                                type="number" step="0.01"
                                placeholder="Prix (Dh)"
                                value={newPrice} onChange={e => setNewPrice(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                                required
                            />
                            <textarea
                                placeholder="Description (optionnel)"
                                value={newDesc} onChange={e => setNewDesc(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary h-24 resize-none"
                            />

                            <button disabled={loading} className="mt-2 bg-gold-gradient text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
                                {loading ? 'Traitement...' : (isAdmin ? 'AJOUTER' : 'ENVOYER LA DEMANDE')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}