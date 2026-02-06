'use client';

import { useState, useEffect } from 'react'; // ✅ Import useEffect
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import ClientsList from './ClientsList';

interface Client {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    address: string | null;
    ice: string | null;
    created_at: string;
}

export default function ClientsManager({ clients: initialClients }: { clients: any[] }) {
    // State
    const [clients, setClients] = useState<Client[]>(initialClients);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // New Client Form State
    const [newClientData, setNewClientData] = useState({
        name: '', email: '', phone: '', city: '', address: '', ice: ''
    });

    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // ✅ THE FIX: This synchronizes the state when the data actually arrives from the parent page
    useEffect(() => {
        setClients(initialClients);
    }, [initialClients]);

    // 🔍 Search Logic
    const filteredClients = clients.filter(client =>
        (client.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (client.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (client.city?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    // ➕ Handle Create Client
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Ensure we send NULL if owner_id is missing (handled by DB now)
        const { data, error } = await supabase
            .from('clients')
            .insert([newClientData])
            .select();

        if (error) {
            alert('Erreur : ' + error.message);
        } else if (data) {
            setClients([data[0] as Client, ...clients]); // Optimistic update
            setIsCreateModalOpen(false);
            setNewClientData({ name: '', email: '', phone: '', city: '', address: '', ice: '' });
            router.refresh();
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-black pl-72 text-white">
            <main className="max-w-7xl mx-auto p-12">

                {/* HEADER */}
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Clients</h1>
                        <p className="text-zinc-500 mt-2 font-medium">Gérez votre carnet d'adresses</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-[#EAB308] text-black px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-[#FACC15] transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Nouveau Client
                    </button>
                </div>

                {/* SEARCH BAR */}
                <div className="mb-8 relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-zinc-500 group-focus-within:text-[#EAB308] transition-colors">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher un client (nom, email, ville)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#EAB308]/50 focus:border-[#EAB308] transition-all placeholder-zinc-600"
                    />
                </div>

                {/* LIST COMPONENT */}
                <ClientsList initialClients={filteredClients} />

                {/* CREATE MODAL */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                        <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>

                            <h2 className="text-xl font-bold mb-1 text-white">Nouveau Client</h2>
                            <p className="text-zinc-500 text-sm mb-6">Ajoutez une nouvelle entreprise.</p>

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Nom de l'entreprise</label>
                                    <input required type="text" value={newClientData.name} onChange={e => setNewClientData({ ...newClientData, name: e.target.value })} className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-[#EAB308] outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Email</label>
                                        <input type="email" value={newClientData.email} onChange={e => setNewClientData({ ...newClientData, email: e.target.value })} className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-[#EAB308] outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Téléphone</label>
                                        <input type="text" value={newClientData.phone} onChange={e => setNewClientData({ ...newClientData, phone: e.target.value })} className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-[#EAB308] outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Ville</label>
                                        <input type="text" value={newClientData.city} onChange={e => setNewClientData({ ...newClientData, city: e.target.value })} className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-[#EAB308] outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">ICE</label>
                                        <input type="text" value={newClientData.ice} onChange={e => setNewClientData({ ...newClientData, ice: e.target.value })} className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-[#EAB308] outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Adresse</label>
                                    <textarea value={newClientData.address} onChange={e => setNewClientData({ ...newClientData, address: e.target.value })} rows={2} className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-[#EAB308] outline-none resize-none" />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#EAB308] text-black font-bold py-4 rounded-xl mt-6 hover:bg-[#FACC15] transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Enregistrement...' : 'Enregistrer le client'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}