'use client';

import { useState } from 'react';
import { createNewClient, updateClient, deleteClient } from '@/app/actions/clients';
import { useRouter } from 'next/navigation';

export default function ClientManager({ clients }: { clients: any[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null);
    const router = useRouter(); // To force refresh if needed

    // Open Modal for New
    const openNew = () => {
        setEditingClient(null);
        setIsModalOpen(true);
    };

    // Open Modal for Edit
    const openEdit = (client: any) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formData = new FormData(e.currentTarget);
            let result;

            if (editingClient) {
                formData.append('id', editingClient.id);
                result = await updateClient(formData);
            } else {
                result = await createNewClient(formData);
            }

            // Check success
            if (result?.success === false) {
                alert(`Erreur: ${result.message}`);
            } else {
                // Success!
                setIsModalOpen(false);
                router.refresh(); // Refresh UI to show new client
            }

        } catch (err) {
            console.error("Form Error:", err);
            alert("Une erreur imprévue est survenue.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Voulez-vous vraiment supprimer ce client ?')) {
            await deleteClient(id);
            router.refresh();
        }
    };

    return (
        <>
            {/* HEADER ACTION */}
            <div className="flex justify-end mb-6">
                <button
                    onClick={openNew}
                    className="flex items-center gap-2 h-12 px-6 rounded-xl bg-gold-gradient text-black text-sm font-bold shadow-lg hover:scale-[1.02] transition-transform"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    NOUVEAU CLIENT
                </button>
            </div>

            {/* LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-zinc-500">
                        Aucun client trouvé. Cliquez sur "Nouveau Client".
                    </div>
                ) : (
                    clients.map(client => (
                        <div key={client.id} className="glass-card p-5 rounded-2xl border border-white/5 hover:border-yellow-500/30 transition-all group relative">
                            {/* ... (Keep your existing card design here) ... */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="size-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-bold border border-yellow-500/20">
                                    {client.name ? client.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(client)} className="size-8 flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(client.id)} className="size-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-white font-bold text-lg mb-4 truncate">{client.name}</h3>
                            <div className="space-y-2 text-sm text-zinc-400">
                                <p className="flex items-center gap-3"><span className="material-symbols-outlined text-[16px] text-zinc-600">email</span> <span className="truncate">{client.email || '-'}</span></p>
                                <p className="flex items-center gap-3"><span className="material-symbols-outlined text-[16px] text-zinc-600">call</span> {client.phone || '-'}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#121212] border border-white/10 w-full max-w-lg rounded-2xl p-8 shadow-2xl relative zoom-in-95 animate-in duration-200">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <h3 className="text-white text-2xl font-bold mb-6">{editingClient ? 'Modifier' : 'Nouveau Client'}</h3>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {/* ... (Keep your form inputs exactly as they are) ... */}
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Nom / Entreprise</label>
                                <input name="name" defaultValue={editingClient?.name} required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Email</label><input name="email" defaultValue={editingClient?.email} type="email" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-colors" /></div>
                                <div><label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Téléphone</label><input name="phone" defaultValue={editingClient?.phone} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-colors" /></div>
                            </div>
                            <div><label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Adresse</label><input name="address" defaultValue={editingClient?.address} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-colors" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Ville</label><input name="city" defaultValue={editingClient?.city} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-colors" /></div>
                                <div><label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">ICE</label><input name="ice" defaultValue={editingClient?.ice} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-colors" /></div>
                            </div>

                            {/* 👇 FIXED: Explicit type="submit" and loading state */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-4 w-full h-14 rounded-xl bg-gold-gradient text-black font-bold text-lg hover:scale-[1.01] transition-transform disabled:opacity-50"
                            >
                                {loading ? 'Sauvegarde...' : 'Enregistrer'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}