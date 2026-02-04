'use client'

import React, { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Sidebar from '@/components/Sidebar'
import { deleteDocument } from '@/app/actions/documentActions'
import ConfirmationModal from '@/components/ui/ConfirmationModal'

const getStatusColor = (status: string) => {
    switch (status) {
        case 'accepted': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        case 'draft': return 'bg-zinc-800 text-zinc-400 border-zinc-700';
        case 'sent': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
        default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
}

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDeleting, startTransition] = useTransition()
    const router = useRouter()

    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fetchQuotes = async () => {
        const { data } = await supabase
            .from('quotes')
            .select('*, client:clients(name)')
            .order('created_at', { ascending: false })

        if (data) setQuotes(data)
        setIsLoading(false)
    }

    useEffect(() => {
        fetchQuotes()
    }, [])

    const confirmDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setQuoteToDelete(id);
        setDeleteModalOpen(true);
    }

    const executeDelete = () => {
        if (!quoteToDelete) return;

        startTransition(async () => {
            await deleteDocument('quotes', quoteToDelete, '/quotes');
            await fetchQuotes();
            setDeleteModalOpen(false);
            setQuoteToDelete(null);
        });
    }

    const handlePreview = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        router.push(`/quotes/${id}`);
    }

    return (
        <div className="min-h-screen bg-black text-white font-['Inter']">
            <Sidebar />

            <ConfirmationModal
                isOpen={deleteModalOpen}
                title="Supprimer le devis ?"
                message="Cette action est irréversible. Voulez-vous vraiment supprimer ce devis définitivement ?"
                onConfirm={executeDelete}
                onCancel={() => setDeleteModalOpen(false)}
                isLoading={isDeleting}
            />

            <div className="p-8 ml-72">
                <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold tracking-tight">Devis</h1>
                    <Link
                        href="/quotes/new"
                        className="bg-[#EAB308] hover:bg-[#EAB308]/90 text-black font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2 shadow-lg shadow-yellow-900/20"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Nouveau Devis
                    </Link>
                </div>

                <div className="max-w-6xl mx-auto bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 uppercase tracking-wider text-[10px]">
                                <th className="px-6 py-4 font-bold">Numéro</th>
                                <th className="px-6 py-4 font-bold">Client</th>
                                <th className="px-6 py-4 font-bold">Date</th>
                                <th className="px-6 py-4 font-bold text-right">Total TTC</th>
                                <th className="px-6 py-4 font-bold text-center">Statut</th>
                                <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">Chargement...</td>
                                </tr>
                            ) : quotes.map((quote: any) => (
                                <tr
                                    key={quote.id}
                                    onClick={() => router.push(`/quotes/${quote.id}`)}
                                    className="group hover:bg-zinc-800/80 transition-colors duration-200 cursor-pointer"
                                >
                                    <td className="px-6 py-4 font-mono text-white group-hover:text-[#EAB308] transition-colors">
                                        {quote.number || 'BROUILLON'}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-300">
                                        {quote.client?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500 text-xs">
                                        {new Date(quote.created_at).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-zinc-300">
                                        {/* ✅ FIXED: Use total_amount instead of total_ttc */}
                                        {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(quote.total_amount || 0)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(quote.status)}`}>
                                            {quote.status}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handlePreview(e, quote.id)}
                                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-md transition-colors"
                                                title="Voir"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                                            </button>

                                            <button
                                                onClick={(e) => confirmDelete(e, quote.id)}
                                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                                                title="Supprimer"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && quotes.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">Aucun devis trouvé.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}