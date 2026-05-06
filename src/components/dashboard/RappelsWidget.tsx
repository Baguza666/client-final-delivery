'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Bell, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import type { Reminder } from '@/app/actions/dashboard'
import { formatMAD } from '@/utils/format'

interface Props {
    reminders: Reminder[]
}

export default function RappelsWidget({ reminders }: Props) {
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
    const wrapperRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const overdueCount = reminders.filter(r => r.type === 'overdue').length
    const hasOverdue = overdueCount > 0
    const total = reminders.length

    useEffect(() => {
        setMounted(true)
    }, [])

    useLayoutEffect(() => {
        if (!open || !buttonRef.current) return
        function updatePosition() {
            const rect = buttonRef.current?.getBoundingClientRect()
            if (!rect) return
            setPos({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            })
        }
        updatePosition()
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition, true)
        return () => {
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition, true)
        }
    }, [open])

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const target = e.target as Node
            const insideWrapper = wrapperRef.current?.contains(target)
            const insideDropdown = dropdownRef.current?.contains(target)
            if (!insideWrapper && !insideDropdown) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    const dropdown = (
        <div
            ref={dropdownRef}
            style={{ top: pos.top, right: pos.right }}
            className="fixed w-80 bg-slate-950 border border-slate-800 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] z-[9999] overflow-hidden animate-fade-in"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Rappels</p>
                {total > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasOverdue ? 'bg-rose-500/15 text-rose-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
                        {total} en attente
                    </span>
                )}
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto thin-scrollbar">
                {reminders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-sm font-semibold text-white">Tout est à jour !</p>
                        <p className="text-xs text-slate-500">Aucun rappel pour le moment.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-800/60">
                        {reminders.map(r => (
                            <li key={r.id}>
                                <Link
                                    href={`/invoices/${r.id}`}
                                    onClick={() => setOpen(false)}
                                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-800/50 transition-colors group"
                                >
                                    <div className={`mt-0.5 w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                                        r.type === 'overdue'
                                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                    }`}>
                                        {r.type === 'overdue'
                                            ? <AlertTriangle className="w-3.5 h-3.5" />
                                            : <Clock className="w-3.5 h-3.5" />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                                            {r.invoiceNumber}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">{r.clientName}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wide ${r.type === 'overdue' ? 'text-rose-400' : 'text-amber-400'}`}>
                                                {r.type === 'overdue' ? 'En retard' : 'Brouillon'}
                                            </span>
                                            {r.dueDate && (
                                                <span className="text-[10px] text-slate-600">
                                                    · Échéance {new Date(r.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-400 whitespace-nowrap mt-0.5">
                                        {formatMAD(r.amount)}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Footer */}
            {reminders.length > 0 && (
                <div className="border-t border-slate-800 px-4 py-3">
                    <Link
                        href="/invoices"
                        onClick={() => setOpen(false)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                    >
                        Voir toutes les factures →
                    </Link>
                </div>
            )}
        </div>
    )

    return (
        <div ref={wrapperRef} className="relative">
            {/* ── Trigger pill ── */}
            <button
                ref={buttonRef}
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-150"
            >
                <span className="relative flex items-center">
                    <Bell className="w-4 h-4" />
                    {total > 0 && (
                        <span className={`absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full ${hasOverdue ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                    )}
                </span>
                <span>Rappels</span>
                {total > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${hasOverdue ? 'bg-rose-500/15 text-rose-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
                        {total}
                    </span>
                )}
            </button>

            {/* ── Dropdown rendered via portal to escape parent stacking context ── */}
            {open && mounted && createPortal(dropdown, document.body)}
        </div>
    )
}
