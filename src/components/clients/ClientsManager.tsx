'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Client {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    address: string | null;
    created_at: string;
}

interface ClientsManagerProps {
    clients: Client[];
}

export default function ClientsManager({ clients }: ClientsManagerProps) {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter clients based on search
    const filteredClients = clients.filter(client =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-black pl-72 text-white">
            <main className="max-w-7xl mx-auto p-12">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Clients</h1>
                        <p className="text-zinc-500 mt-2 font-medium">
                            Gérez votre carnet d'adresses et vos relations clients
                        </p>
                    </div>
                    <button className="bg-[#EAB308] text-black px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-[#FACC15] transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Nouveau Client
                    </button>
                </div>

                {/* Search & Statistics Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {/* Search Input */}
                    <div className="md:col-span-3 relative group">
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

                    {/* Stat Card */}
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                        <span className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Total Clients</span>
                        <span className="text-2xl font-black text-white">{clients.length}</span>
                    </div>
                </div>

                {/* Clients Table */}
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-500 text-[11px] uppercase tracking-[0.2em]">
                                <th className="px-8 py-5 font-semibold">Entreprise / Nom</th>
                                <th className="px-8 py-5 font-semibold">Contact</th>
                                <th className="px-8 py-5 font-semibold">Ville</th>
                                <th className="px-8 py-5 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredClients.length > 0 ? (
                                filteredClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-zinc-800/40 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                {/* Avatar Initials */}
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 group-hover:border-[#EAB308] group-hover:text-[#EAB308] transition-all">
                                                    {client.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-white text-base tracking-tight">{client.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-zinc-300 text-sm">{client.email || '-'}</span>
                                                <span className="text-zinc-500 text-xs font-mono">{client.phone || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-zinc-400 font-medium">
                                            {client.city || <span className="text-zinc-600 italic">Non renseigné</span>}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg group-hover:visible">
                                                <span className="material-symbols-outlined text-[20px]">edit_square</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-8 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="h-16 w-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-zinc-600 text-3xl">search_off</span>
                                            </div>
                                            <p className="text-zinc-500 font-medium">Aucun client trouvé pour cette recherche.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </main>
        </div>
    );
}