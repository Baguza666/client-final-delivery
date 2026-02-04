'use client'

import { useState, useRef, useEffect } from 'react'
import { updateInvoiceStatus } from '@/app/actions/invoices'
import { useRouter } from 'next/navigation'

// Configuration for colors and labels
const STATUS_CONFIG: Record<string, { label: string, color: string, dot: string }> = {
    draft: {
        label: 'BROUILLON',
        color: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600',
        dot: 'bg-zinc-500'
    },
    pending: {
        label: 'EN ATTENTE',
        color: 'bg-[#EAB308]/10 text-[#EAB308] border-[#EAB308]/20 shadow-[0_0_15px_rgba(234,179,8,0.1)] hover:border-[#EAB308]/40',
        dot: 'bg-[#EAB308] animate-pulse'
    },
    paid: {
        label: 'PAYÉE',
        color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:border-emerald-500/40',
        dot: 'bg-emerald-500'
    },
    overdue: {
        label: 'EN RETARD',
        color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:border-red-500/40',
        dot: 'bg-red-500'
    }
}

const OPTIONS = ['draft', 'pending', 'paid']

export default function InvoiceStatusSelect({ invoice }: { invoice: any }) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const containerRef = useRef<HTMLDivElement>(null)

    const currentStatus = invoice.status || 'draft'
    const activeStyle = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.draft

    // 1. Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 2. Handle Status Change
    const handleSelect = async (newStatus: string) => {
        if (newStatus === currentStatus) {
            setIsOpen(false)
            return
        }

        setLoading(true)
        setIsOpen(false) // Close UI immediately for speed

        // Call Server Action
        await updateInvoiceStatus(invoice.id, newStatus)

        setLoading(false)
        router.refresh() // Refresh page to update stats
    }

    return (
        <div className="relative" ref={containerRef}>

            {/* TRIGGER BUTTON (The Badge) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={loading}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer select-none w-[140px] justify-between ${activeStyle.color}`}
            >
                <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeStyle.dot}`}></span>
                    {loading ? '...' : activeStyle.label}
                </div>
                <span className={`material-symbols-outlined text-[16px] opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            {/* CUSTOM DROPDOWN MENU */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[140px] bg-[#0A0A0A] border border-zinc-800 rounded-xl shadow-2xl z-[100] overflow-hidden animate-fade-in p-1 ring-1 ring-white/10">
                    {OPTIONS.map((statusKey) => {
                        const config = STATUS_CONFIG[statusKey]
                        const isActive = currentStatus === statusKey

                        return (
                            <button
                                key={statusKey}
                                onClick={() => handleSelect(statusKey)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all text-left mb-0.5 last:mb-0
                                    ${isActive
                                        ? 'bg-zinc-800 text-white'
                                        : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
                                    }
                                `}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
                                {config.label}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}