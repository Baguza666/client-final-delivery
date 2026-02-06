'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

interface Client {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    address: string | null;
    ice: string | null;
}

interface ClientsManagerProps {
    clients: Client[];
}

export default function ClientsManager({ clients: initialClients }: ClientsManagerProps) {
    const [clients, setClients] = useState<Client[]>(initialClients);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        city: '',
        address: '',
        ice: ''
    });

    // Filter Logic
    const filteredClients = clients.filter(client =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handlers
    const handleOpenCreate = () => {
        setEditingClient(null);
        setFormData({ name: '', email: '', phone: '', city: '', address: '', ice: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (client: Client) => {
        setEditingClient(client);
        setFormData({
            name: client.name || '',
            email: client.email || '',
            phone: client.phone || '',
            city: client.city || '',
            address: client.address || '',
            ice: client.ice || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (!error) {
            setClients(clients.filter(c => c.id !== id));
            router.refresh();
        } else {
            alert('Erreur lors de la suppression');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (editingClient) {
            // UPDATE Existing
            const { data, error } = await supabase
                .from('clients')
                .update(formData)
                .eq('id', editingClient.id)
                .select();

            if (!error && data) {
                setClients(clients.map(c => (c.id === editingClient.id ? (data[0] as Client) : c)));
                setIsModalOpen(false);
            }
        } else {
            // CREATE New
            const { data, error } = await supabase
                .from('clients')
                .insert([formData])
                .select();

            if (!error && data) {
                setClients([data[0] as Client, ...clients]);
                setIsModalOpen(false);
            }
        }
        setLoading(false);
        router.refresh();
    };

    return (
        <div className="min-h-screen bg-black pl-72 text-white">
            <div className="max-w-7xl mx-auto p-12">

                {/* Header */}
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Clients</h1>
                        <p className="text-zinc-500 mt-2 font-medium">Gérez votre carnet d'adresses</p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="bg-[#EAB308] text-black px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-[#FACC15] transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Nouveau Client
                    </button>
                </div>

                {/* Search */}
                <div className="mb-8">
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl py-4 px-6 focus:ring-2 focus:ring-[#EAB308] focus:outline-none"
                    />
                </div>

                {/* Table */}
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-widest">
                                <th className="px-8 py-5">Nom / Entreprise</th>
                                <th className="px-8 py-5">Contact</th>
                                <th className="px-8 py-5">Ville</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-zinc-800/40 transition-colors group">
                                    <td className="px-8 py-5 font-bold">{client.name}</td>
                                    <td className="px-8 py-5 text-zinc-400 text-sm">
                                        {client.email}<br />{client.phone}
                                    </td>
                                    <td className="px-8 py-5 text-zinc-400">{client.city || '-'}</td>
                                    <td className="px-8 py-5 text-right flex justify-end gap-2">
                                        <button onClick={() => handleOpenEdit(client)} className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white">
                                            <span className="material-symbols-outlined">edit</span>
                                        </button>
                                        <button onClick={() => handleDelete(client.id)} className="p-2 hover:bg-red-900/30 rounded-lg text-zinc-400 hover:text-red-500">
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* MODAL (Popup Form) */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#111] border border-zinc-800 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>

                            <h2 className="text-2xl font-bold mb-6">{editingClient ? 'Modifier le client' : 'Nouveau Client'}</h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase text-zinc-500 font-bold">Nom de l'entreprise</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:border-[#EAB308] focus:outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs uppercase text-zinc-500 font-bold">Email</label>
                                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:border-[#EAB308] focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-zinc-500 font-bold">Téléphone</label>
                                        <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:border-[#EAB308] focus:outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs uppercase text-zinc-500 font-bold">Ville</label>
                                        <input type="text" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:border-[#EAB308] focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-zinc-500 font-bold">ICE (Optionnel)</label>
                                        <input type="text" value={formData.ice} onChange={e => setFormData({ ...formData, ice: e.target.value })} className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:border-[#EAB308] focus:outline-none" />
                                    </div>
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

            </div>
        </div>
    );
}