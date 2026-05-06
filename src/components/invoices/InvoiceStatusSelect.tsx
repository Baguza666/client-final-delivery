'use client'

import { useState, useRef, useEffect } from 'react'
import { updateInvoiceStatus } from '@/app/actions/invoices'
import { useRouter } from 'next/navigation'
import { getStatusEntry, TONE_CLASSES, TONE_DOT } from '@/utils/status'

const SELECTABLE_STATUSES = ['draft', 'pending', 'paid', 'overdue'] as const

export default function InvoiceStatusSelect({ invoice }: { invoice: any }) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const containerRef = useRef<HTMLDivElement>(null)

    const currentStatus = invoice.status || 'draft'
    const activeEntry = getStatusEntry('invoice', currentStatus)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = async (newStatus: string) => {
        if (newStatus === currentStatus) {
            setIsOpen(false)
            return
        }
        setLoading(true)
        setIsOpen(false)
        await updateInvoiceStatus(invoice.id, newStatus)
        setLoading(false)
        router.refresh()
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={loading}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer select-none w-[140px] justify-between ${TONE_CLASSES[activeEntry.tone]}`}
            >
                <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[activeEntry.tone]}`}></span>
                    {loading ? '...' : activeEntry.label}
                </div>
                <span className={`material-symbols-outlined text-[16px] opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            {isOpen && (
                <div role="listbox" className="absolute top-full left-0 mt-2 w-[140px] bg-[#0A0A0A] border border-zinc-800 rounded-xl shadow-2xl z-[100] overflow-hidden animate-fade-in p-1 ring-1 ring-white/10">
                    {SELECTABLE_STATUSES.map((statusKey) => {
                        const entry = getStatusEntry('invoice', statusKey)
                        const isActive = currentStatus === statusKey
                        return (
                            <button
                                key={statusKey}
                                role="option"
                                aria-selected={isActive}
                                onClick={() => handleSelect(statusKey)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all text-left mb-0.5 last:mb-0 ${
                                    isActive ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[entry.tone]}`}></span>
                                {entry.label}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
