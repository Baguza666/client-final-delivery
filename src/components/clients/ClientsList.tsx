'use client';

import { useState, useEffect } from 'react';
import { updateClient } from '@/app/actions/updateClient';
import { useModal } from '@/components/ui/ModalProvider';

export default function ClientsList({ initialClients }: { initialClients: any[] }) {
    const [clients, setClients] = useState(initialClients);
    const [editingClient, setEditingClient] = useState<any | null>(null);
    const { showModal } = useModal();

    // 🔍 SYNC FIX: Ensure the list updates when the parent searches/filters
    useEffect(() => {
        setClients(initialClients);
    }, [initialClients]);

    // Handle Edit Form Submit
    const handleUpdate = async (formData: FormData) => {
        const result = await updateClient(formData);

        if (result.success) {
            showModal({ title: "Succès", message: "Client mis à jour !", type: "success" });

            // Optimistic UI Update
            setClients(prev => prev.map(c => c.id === formData.get('id') ? {
                ...c,
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                ice: formData.get('ice')
            } : c));

            setEditingClient(null); // Close modal
        } else {
            showModal({ title: "Erreur", message: result.message || "Une erreur est survenue", type: "error" });
        }
    };

    return (
        <>
            {/* GRID LIST LAYOUT */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">group_off</span>
                        <p>Aucun client trouvé.</p>
                    </div>
                ) : (
                    clients.map((client) => (
                        <div key={client.id} className="glass-card p-6 rounded-xl border border-white/5 group relative hover:border-primary/50 transition-all duration-300 bg-zinc-900/40 hover:bg-zinc-900/80">

                            {/* Header: Avatar + Edit Button */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EAB308]/20 to-[#EAB308]/5 flex items-center justify-center text-[#EAB308] font-bold text-xl border border-[#EAB308]/20">
                                    {(client.name || '?').charAt(0).toUpperCase()}
                                </div>

                                <button
                                    onClick={() => setEditingClient(client)}
                                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white"
                                    title="Modifier"
                                >
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                </button>
                            </div>

                            {/* Main Info */}
                            <h3 className="font-bold text-lg text-white mb-1 truncate">{client.name}</h3>
                            <div className="text-sm text-gray-400 mb-4 space-y-2">
                                <p className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px] opacity-50">mail</span>
                                    <span className="truncate">{client.email || 'Pas d\'email'}</span>
                                </p>
                                {client.phone && (
                                    <p className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px] opacity-50">call</span>
                                        <span className="font-mono text-zinc-300">{client.phone}</span>
                                    </p>
                                )}
                            </div>

                            {/* Extra Details (ICE & Address) */}
                            <div className="space-y-2 text-xs text-gray-500 border-t border-white/5 pt-4">
                                {client.ice && (
                                    <div className="flex justify-between">
                                        <span className="font-semibold text-gray-600 uppercase tracking-wider">ICE:</span>
                                        <span className="text-gray-400 font-mono">{client.ice}</span>
                                    </div>
                                )}
                                {client.address && (
                                    <div className="flex justify-between items-start gap-4">
                                        <span className="font-semibold text-gray-600 uppercase tracking-wider">Adr:</span>
                                        <span className="text-gray-400 text-right truncate max-w-[150px]">{client.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* EDIT MODAL */}
            {editingClient && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative">

                        <button
                            onClick={() => setEditingClient(null)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-white">Modifier le client</h3>
                            <p className="text-zinc-500 text-sm">Mettez à jour les informations de {editingClient.name}</p>
                        </div>

                        <form action={handleUpdate} className="space-y-5">
                            <input type="hidden" name="id" value={editingClient.id} />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Nom Entreprise</label>
                                    <input name="name" defaultValue={editingClient.name} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] outline-none transition-all" required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Email</label>
                                    <input name="email" defaultValue={editingClient.email} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] outline-none transition-all" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Téléphone</label>
                                <input
                                    name="phone"
                                    defaultValue={editingClient.phone || ''}
                                    placeholder="+212 6..."
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">ICE (Identifiant Fiscal)</label>
                                <input name="ice" defaultValue={editingClient.ice} placeholder="Ex: 123456789" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] outline-none transition-all" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Adresse Complète</label>
                                <textarea name="address" defaultValue={editingClient.address} rows={3} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] outline-none transition-all resize-none" />
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                                <button type="button" onClick={() => setEditingClient(null)} className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">Annuler</button>
                                <button type="submit" className="bg-[#EAB308] text-black px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#FACC15] transition-transform shadow-lg shadow-[#EAB308]/20">Enregistrer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}