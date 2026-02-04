'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
// 👇 Import the Sidebar
import Sidebar from '@/components/Sidebar'

const getStatusColor = (status: string) => {
    switch (status) {
        case 'livré': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        case 'pending': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
}

export default function DeliveryNotesPage() {
    const [notes, setNotes] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchNotes = async () => {
            const { data } = await supabase
                .from('delivery_notes')
                .select('*, client:clients(name)')
                .order('created_at', { ascending: false })

            if (data) setNotes(data)
            setIsLoading(false)
        }
        fetchNotes()
    }, [])

    return (
        <div className="min-h-screen bg-black text-white font-['Inter']">
            {/* 👇 Sidebar is restored here */}
            <Sidebar />

            <div className="p-8 ml-72">
                <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold tracking-tight">Bons de Livraison</h1>
                </div>

                <div className="max-w-6xl mx-auto bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 uppercase tracking-wider text-xs">
                                <th className="px-6 py-4 font-bold">Numéro</th>
                                <th className="px-6 py-4 font-bold">Client</th>
                                <th className="px-6 py-4 font-bold">Date de Livraison</th>
                                <th className="px-6 py-4 font-bold text-right">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                                        Chargement...
                                    </td>
                                </tr>
                            ) : notes.map((dn: any) => (
                                <tr key={dn.id} className="group hover:bg-zinc-800/50 transition-colors duration-200">
                                    <td className="p-0" colSpan={4}>
                                        <Link href={`/delivery-notes/${dn.id}`} className="flex w-full h-full items-center">
                                            <div className="px-6 py-4 w-[25%] text-white font-mono group-hover:text-[#EAB308] transition-colors">
                                                {dn.number || 'BROUILLON'}
                                            </div>
                                            <div className="px-6 py-4 w-[35%] text-zinc-300">
                                                {dn.client?.name || '-'}
                                            </div>
                                            <div className="px-6 py-4 w-[25%] text-zinc-400">
                                                {new Date(dn.date).toLocaleDateString('fr-FR')}
                                            </div>
                                            <div className="px-6 py-4 w-[15%] text-right">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(dn.status)} capitalize`}>
                                                    {dn.status === 'pending' ? 'En cours' : dn.status}
                                                </span>
                                            </div>
                                        </Link>
                                    </td>
                                </tr>
                            ))}

                            {!isLoading && notes.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                                        Aucun bon de livraison trouvé.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}