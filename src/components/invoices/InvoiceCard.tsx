'use client'

import Link from 'next/link'
import { useState } from 'react'
import InvoiceStatusSelect from './InvoiceStatusSelect'

export default function InvoiceCard({ invoice }: { invoice: any }) {
    const [sending, setSending] = useState(false)
    const isOverdue = new Date() > new Date(invoice.due_date) && invoice.status !== 'paid'
    const amount = new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(invoice.total_ttc || 0)

    const handleDownload = () => {
        const win = window.open(`/invoices/${invoice.id}`, '_blank')
        if (win) win.focus()
    }

    const handleSend = async () => {
        setSending(true)
        await new Promise(r => setTimeout(r, 1000))
        alert(`Facture #${invoice.number} envoyée !`)
        setSending(false)
    }

    return (
        // 👇 FIXED: Added 'z-0 hover:z-50' to bring card to front on hover
        // 👇 FIXED: Added 'overflow-visible' so dropdowns can stick out
        <div className={`group relative z-0 hover:z-50 overflow-visible bg-zinc-900/40 backdrop-blur-sm border rounded-2xl p-5 transition-all hover:bg-zinc-900/80 ${isOverdue ? 'border-red-500/30' : 'border-zinc-800 hover:border-zinc-700'}`}>

            {/* OVERDUE BADGE */}
            {isOverdue && (
                <div className="absolute -top-3 -right-3 bg-red-600 text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse flex items-center gap-1 z-10">
                    <span className="material-symbols-outlined text-[12px]">warning</span>
                    RETARD
                </div>
            )}

            <div className="flex justify-between items-center">

                {/* LEFT: Icon & Client */}
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl transition-colors ${invoice.status === 'paid'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 group-hover:text-white'
                        }`}>
                        <span className="material-symbols-outlined">
                            {invoice.status === 'paid' ? 'verified' : 'receipt_long'}
                        </span>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base group-hover:text-primary transition-colors">
                            {invoice.client?.name || 'Client Inconnu'}
                        </h3>
                        <p className="text-zinc-500 text-xs font-mono mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                            {invoice.number}
                        </p>
                    </div>
                </div>

                {/* RIGHT: Stats & Actions */}
                <div className="flex items-center gap-8">

                    {/* AMOUNT */}
                    <span className="font-mono font-bold text-white tracking-tight text-lg">
                        {amount}
                    </span>

                    {/* BRANDED DROPDOWN */}
                    <InvoiceStatusSelect invoice={invoice} />

                    {/* ACTION BUTTONS */}
                    <div className="flex items-center gap-1 border-l border-zinc-800 pl-6">
                        <Link href={`/invoices/${invoice.id}`} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </Link>
                        <Link href={`/invoices/${invoice.id}/edit`} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-500 hover:text-blue-400 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Link>
                        <button onClick={handleSend} disabled={sending} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-500 hover:text-[#EAB308] transition-colors">
                            <span className={`material-symbols-outlined text-[18px] ${sending ? 'animate-spin' : ''}`}>
                                {sending ? 'refresh' : 'send'}
                            </span>
                        </button>
                        <button onClick={handleDownload} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-500 hover:text-emerald-400 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">download</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}