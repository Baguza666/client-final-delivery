'use client'

import React, { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Sidebar from '@/components/Sidebar'
import { deleteDocument } from '@/app/actions/documentActions'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import { Plus, Eye, Trash2, FileText, Search } from 'lucide-react'

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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount || 0)
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans flex">

            {/* Sidebar Fixed */}
            <div className="fixed left-0 top-0 h-screen z-20">
                <Sidebar />
            </div>

            {/* Main Content with Margin for Sidebar */}
            <div className="flex-1 ml-0 md:ml-72 p-8">

                <ConfirmationModal
                    isOpen={deleteModalOpen}
                    title="Supprimer le devis ?"
                    message="Cette action est irréversible. Voulez-vous vraiment supprimer ce devis définitivement ?"
                    onConfirm={executeDelete}
                    onCancel={() => setDeleteModalOpen(false)}
                    isLoading={isDeleting}
                />

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <FileText className="text-[#EAB308]" size={32} />
                            Devis
                        </h1>
                        <p className="text-zinc-500 mt-2">Gérez vos propositions commerciales et suivez leur statut.</p>
                    </div>
                    <Link
                        href="/quotes/new"
                        className="bg-[#EAB308] hover:bg-[#EAB308]/90 text-black font-bold py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] flex items-center gap-2 text-sm uppercase tracking-wide"
                    >
                        <Plus size={20} />
                        Créer un devis
                    </Link>
                </div>

                {/* Quotes Table Container */}
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-500 uppercase tracking-wider text-[11px]">
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
                                        <td colSpan={6} className="px-6 py-20 text-center text-zinc-500 animate-pulse">
                                            Chargement des données...
                                        </td>
                                    </tr>
                                ) : quotes.map((quote: any) => (
                                    <tr
                                        key={quote.id}
                                        onClick={() => router.push(`/quotes/${quote.id}`)}
                                        className="group hover:bg-zinc-900/40 transition-colors duration-200 cursor-pointer"
                                    >
                                        <td className="px-6 py-4 font-mono text-white font-medium group-hover:text-[#EAB308] transition-colors">
                                            {quote.number || 'BROUILLON'}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-300 font-medium">
                                            {quote.client?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-500 text-xs">
                                            {new Date(quote.created_at).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-zinc-300 font-medium">
                                            {formatCurrency(quote.total_ttc || quote.total || (quote.subtotal * 1.2))}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(quote.status)}`}>
                                                {quote.status || 'Brouillon'}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={(e) => handlePreview(e, quote.id)}
                                                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                                    title="Voir"
                                                >
                                                    <Eye size={18} />
                                                </button>

                                                <button
                                                    onClick={(e) => confirmDelete(e, quote.id)}
                                                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!isLoading && quotes.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-600">
                                                    <FileText size={32} />
                                                </div>
                                                <div className="text-zinc-500">Aucun devis trouvé.</div>
                                                <Link href="/quotes/new" className="text-[#EAB308] hover:underline text-sm font-medium">
                                                    Créer votre premier devis
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}