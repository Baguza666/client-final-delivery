'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
// 👇 Import the Sidebar
import Sidebar from '@/components/Sidebar'

const getStatusColor = (status: string) => {
    switch (status) {
        case 'validé': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        case 'pending': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        case 'sent': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
}

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Using Client Side fetching to ensure sidebar compatibility
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchOrders = async () => {
            const { data } = await supabase
                .from('purchase_orders')
                .select('*, client:clients(name)')
                .order('created_at', { ascending: false })

            if (data) setOrders(data)
            setIsLoading(false)
        }
        fetchOrders()
    }, [])

    return (
        <div className="min-h-screen bg-black text-white font-['Inter']">
            {/* 👇 Sidebar is restored here */}
            <Sidebar />

            <div className="p-8 ml-72">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold tracking-tight">Bons de Commande</h1>
                </div>

                {/* Table */}
                <div className="max-w-6xl mx-auto bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 uppercase tracking-wider text-xs">
                                <th className="px-6 py-4 font-bold">Numéro</th>
                                <th className="px-6 py-4 font-bold">Fournisseur</th>
                                <th className="px-6 py-4 font-bold">Date</th>
                                <th className="px-6 py-4 font-bold text-right">Total TTC</th>
                                <th className="px-6 py-4 font-bold text-right">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                        Chargement...
                                    </td>
                                </tr>
                            ) : orders.map((po: any) => (
                                <tr key={po.id} className="group hover:bg-zinc-800/50 transition-colors duration-200">
                                    <td className="p-0" colSpan={5}>
                                        <Link href={`/purchase-orders/${po.id}`} className="flex w-full h-full items-center">
                                            <div className="px-6 py-4 w-[20%] text-white font-mono group-hover:text-[#EAB308] transition-colors">
                                                {po.number || 'BROUILLON'}
                                            </div>
                                            <div className="px-6 py-4 w-[25%] text-zinc-300">
                                                {po.client?.name || '-'}
                                            </div>
                                            <div className="px-6 py-4 w-[20%] text-zinc-400">
                                                {new Date(po.date).toLocaleDateString('fr-FR')}
                                            </div>
                                            <div className="px-6 py-4 w-[20%] text-right font-mono text-zinc-300">
                                                {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(po.total_ttc || 0)}
                                            </div>
                                            <div className="px-6 py-4 w-[15%] text-right">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(po.status)} capitalize`}>
                                                    {po.status === 'pending' ? 'En attente' : po.status}
                                                </span>
                                            </div>
                                        </Link>
                                    </td>
                                </tr>
                            ))}

                            {!isLoading && orders.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                        Aucun bon de commande trouvé.
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