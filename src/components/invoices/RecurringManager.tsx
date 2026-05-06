'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatMAD, formatDate } from '@/utils/format'
import {
    pauseRecurringTemplate,
    resumeRecurringTemplate,
    updateRecurringFrequency,
    generateSingleTemplate,
    deleteRecurringTemplate,
    type RecurringTemplate,
} from '@/app/actions/invoices'
import ConfirmationModal from '@/components/ui/ConfirmationModal'

const FREQ_LABELS: Record<string, string> = {
    monthly: 'Mensuelle',
    quarterly: 'Trimestrielle',
    biannual: 'Semestrielle',
    annual: 'Annuelle',
}

const FREQ_OPTIONS = ['monthly', 'quarterly', 'biannual', 'annual']

function isOverdue(nextDueDate: string, paused: boolean) {
    if (paused) return false
    return new Date(nextDueDate) <= new Date()
}

function daysUntil(dateStr: string): number {
    const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

interface Props {
    initialTemplates: RecurringTemplate[]
}

export default function RecurringManager({ initialTemplates }: Props) {
    const [templates, setTemplates] = useState<RecurringTemplate[]>(initialTemplates)
    const [working, setWorking] = useState<Record<string, boolean>>({})
    const [msg, setMsg] = useState<Record<string, string>>({})
    const [editingFreq, setEditingFreq] = useState<string | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const setWorking1 = (id: string, v: boolean) => setWorking((p) => ({ ...p, [id]: v }))
    const setMsg1 = (id: string, text: string) => {
        setMsg((p) => ({ ...p, [id]: text }))
        setTimeout(() => setMsg((p) => { const n = { ...p }; delete n[id]; return n }), 4000)
    }

    const handlePauseResume = async (tpl: RecurringTemplate) => {
        setWorking1(tpl.id, true)
        const res = tpl.paused ? await resumeRecurringTemplate(tpl.id) : await pauseRecurringTemplate(tpl.id)
        setWorking1(tpl.id, false)
        if (res.success) {
            setTemplates((prev) => prev.map((t) => t.id === tpl.id ? { ...t, paused: !tpl.paused } : t))
            setMsg1(tpl.id, tpl.paused ? 'Planification reprise' : 'Planification suspendue')
        } else {
            setMsg1(tpl.id, res.error || 'Erreur')
        }
    }

    const handleFrequencyChange = async (tpl: RecurringTemplate, freq: string) => {
        setEditingFreq(null)
        if (freq === tpl.frequency) return
        setWorking1(tpl.id, true)
        const res = await updateRecurringFrequency(tpl.id, freq)
        setWorking1(tpl.id, false)
        if (res.success) {
            setTemplates((prev) => prev.map((t) => t.id === tpl.id ? { ...t, frequency: freq } : t))
            setMsg1(tpl.id, 'Frequence mise a jour')
        } else {
            setMsg1(tpl.id, res.error || 'Erreur')
        }
    }

    const handleGenerate = async (tpl: RecurringTemplate) => {
        setWorking1(tpl.id, true)
        const res = await generateSingleTemplate(tpl.id)
        setWorking1(tpl.id, false)
        if (res.success) {
            const today = new Date().toISOString().split('T')[0]
            setTemplates((prev) => prev.map((t) => t.id === tpl.id ? { ...t, last_generated_at: today } : t))
            setMsg1(tpl.id, 'Facture generee avec succes')
        } else {
            setMsg1(tpl.id, res.error || 'Erreur')
        }
    }

    const handleDelete = async () => {
        if (!deleteId) return
        const res = await deleteRecurringTemplate(deleteId)
        if (res.success) {
            setTemplates((prev) => prev.filter((t) => t.id !== deleteId))
        }
        setDeleteId(null)
    }

    const active = templates.filter((t) => !t.paused)
    const paused = templates.filter((t) => t.paused)
    const overdue = active.filter((t) => isOverdue(t.nextDueDate, t.paused))

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            <ConfirmationModal
                isOpen={!!deleteId}
                title="Supprimer ce modele ?"
                message="Le modele de facture recurrente sera supprime definitivement. Les factures deja generees ne seront pas affectees."
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
                danger
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/invoices" className="text-zinc-500 hover:text-white transition-colors text-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                            Factures
                        </Link>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">Automatisation</p>
                    <h1 className="text-2xl md:text-3xl font-[800] tracking-tight text-white">
                        Factures Recurrentes
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        {active.length} active{active.length !== 1 ? 's' : ''}
                        {overdue.length > 0 && <span className="text-rose-400 font-semibold"> · {overdue.length} en retard</span>}
                        {paused.length > 0 && <span className="text-zinc-600"> · {paused.length} suspendue{paused.length !== 1 ? 's' : ''}</span>}
                    </p>
                </div>
                <Link
                    href="/invoices/new?recurring=true"
                    className="bg-brand-gradient text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-glow-sm hover:shadow-glow flex items-center gap-2 text-sm w-fit"
                >
                    <span className="material-symbols-outlined text-base">add</span>
                    Nouveau modele
                </Link>
            </div>

            {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <span className="material-symbols-outlined text-zinc-700 text-[64px] mb-4">autorenew</span>
                    <h3 className="text-lg font-bold text-zinc-400 mb-2">Aucun modele recurrent</h3>
                    <p className="text-zinc-600 text-sm mb-6 max-w-sm">
                        Creez une facture et activez l'option "Recurrente" pour automatiser vos facturations periodiques.
                    </p>
                    <Link
                        href="/invoices/new?recurring=true"
                        className="bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold py-2.5 px-5 rounded-lg transition-all text-sm flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-base">add</span>
                        Creer un modele
                    </Link>
                </div>
            ) : (
                <div className="space-y-8">
                    {active.length > 0 && (
                        <section>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Actives ({active.length})</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {active.map((tpl) => (
                                    <TemplateCard
                                        key={tpl.id}
                                        tpl={tpl}
                                        working={!!working[tpl.id]}
                                        msg={msg[tpl.id]}
                                        editingFreq={editingFreq === tpl.id}
                                        onEditFreq={() => setEditingFreq(editingFreq === tpl.id ? null : tpl.id)}
                                        onFrequencyChange={(f) => handleFrequencyChange(tpl, f)}
                                        onPauseResume={() => handlePauseResume(tpl)}
                                        onGenerate={() => handleGenerate(tpl)}
                                        onDelete={() => setDeleteId(tpl.id)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {paused.length > 0 && (
                        <section>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Suspendues ({paused.length})</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {paused.map((tpl) => (
                                    <TemplateCard
                                        key={tpl.id}
                                        tpl={tpl}
                                        working={!!working[tpl.id]}
                                        msg={msg[tpl.id]}
                                        editingFreq={editingFreq === tpl.id}
                                        onEditFreq={() => setEditingFreq(editingFreq === tpl.id ? null : tpl.id)}
                                        onFrequencyChange={(f) => handleFrequencyChange(tpl, f)}
                                        onPauseResume={() => handlePauseResume(tpl)}
                                        onGenerate={() => handleGenerate(tpl)}
                                        onDelete={() => setDeleteId(tpl.id)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </main>
    )
}

interface CardProps {
    tpl: RecurringTemplate
    working: boolean
    msg: string | undefined
    editingFreq: boolean
    onEditFreq: () => void
    onFrequencyChange: (f: string) => void
    onPauseResume: () => void
    onGenerate: () => void
    onDelete: () => void
}

function TemplateCard({ tpl, working, msg, editingFreq, onEditFreq, onFrequencyChange, onPauseResume, onGenerate, onDelete }: CardProps) {
    const overdue = isOverdue(tpl.nextDueDate, tpl.paused)
    const days = daysUntil(tpl.nextDueDate)
    const amount = tpl.total_ttc || 0

    return (
        <div className={"bg-white/[0.025] border rounded-2xl p-5 flex flex-col gap-4 transition-all " + (tpl.paused ? "border-white/[0.04] opacity-60" : overdue ? "border-rose-500/30 shadow-[0_0_0_1px_rgba(239,68,68,0.1)]" : "border-white/[0.06]")}>

            {/* Top row: client + status */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">
                        {tpl.invoice_number}
                    </p>
                    <h3 className="text-base font-bold text-white truncate">{tpl.clientName}</h3>
                </div>
                <div className={"shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border " + (tpl.paused ? "bg-zinc-800 border-zinc-700 text-zinc-400" : overdue ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400")}>
                    {tpl.paused ? 'Suspendue' : overdue ? 'En retard' : 'Active'}
                </div>
            </div>

            {/* Amount */}
            <div>
                <p className="text-2xl font-[800] font-mono text-white tracking-tight">{formatMAD(amount)}</p>
                <p className="text-xs text-zinc-500 mt-0.5">par periode</p>
            </div>

            {/* Frequency row */}
            <div className="relative">
                <button
                    onClick={onEditFreq}
                    className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors group w-full"
                >
                    <span className="material-symbols-outlined text-[16px] text-primary">autorenew</span>
                    <span className="font-semibold">{FREQ_LABELS[tpl.frequency] || tpl.frequency}</span>
                    <span className="material-symbols-outlined text-[14px] text-zinc-600 group-hover:text-zinc-400 ml-auto transition-colors">
                        {editingFreq ? 'expand_less' : 'edit'}
                    </span>
                </button>
                {editingFreq && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden z-20 shadow-xl">
                        {FREQ_OPTIONS.map((f) => (
                            <button
                                key={f}
                                onClick={() => onFrequencyChange(f)}
                                className={"w-full text-left px-4 py-2.5 text-sm transition-colors " + (f === tpl.frequency ? "text-primary font-bold bg-primary/10" : "text-zinc-300 hover:bg-zinc-800")}
                            >
                                {FREQ_LABELS[f]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Schedule info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                    <p className="text-zinc-500 mb-0.5">Derniere generation</p>
                    <p className="font-bold text-zinc-300">
                        {tpl.last_generated_at ? formatDate(tpl.last_generated_at) : 'Jamais'}
                    </p>
                </div>
                <div className={"rounded-lg px-3 py-2 " + (overdue && !tpl.paused ? "bg-rose-500/10" : "bg-white/[0.03]")}>
                    <p className={"mb-0.5 " + (overdue && !tpl.paused ? "text-rose-400" : "text-zinc-500")}>Prochaine</p>
                    <p className={"font-bold " + (overdue && !tpl.paused ? "text-rose-300" : "text-zinc-300")}>
                        {tpl.paused ? '—' : overdue ? 'Maintenant' : days <= 7 ? `Dans ${days}j` : formatDate(tpl.nextDueDate)}
                    </p>
                </div>
            </div>

            {/* Feedback msg */}
            {msg && (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    {msg}
                </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1 border-t border-white/[0.05]">
                <button
                    onClick={onGenerate}
                    disabled={working}
                    title="Generer une facture maintenant"
                    className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-bold text-xs px-3 py-2 rounded-lg transition-all flex-1 justify-center disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[15px]">{working ? 'progress_activity' : 'add_circle'}</span>
                    Generer
                </button>
                <button
                    onClick={onPauseResume}
                    disabled={working}
                    title={tpl.paused ? 'Reprendre la planification' : 'Suspendre la planification'}
                    className={"flex items-center gap-1.5 border font-bold text-xs px-3 py-2 rounded-lg transition-all disabled:opacity-50 " + (tpl.paused ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-400")}
                >
                    <span className="material-symbols-outlined text-[15px]">{tpl.paused ? 'play_arrow' : 'pause'}</span>
                </button>
                <Link
                    href={`/invoices/${tpl.id}`}
                    title="Voir le modele"
                    className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white font-bold text-xs px-3 py-2 rounded-lg transition-all"
                >
                    <span className="material-symbols-outlined text-[15px]">visibility</span>
                </Link>
                <button
                    onClick={onDelete}
                    disabled={working}
                    title="Supprimer ce modele"
                    className="flex items-center gap-1.5 bg-zinc-800 hover:bg-rose-500/10 border border-zinc-700 hover:border-rose-500/30 text-zinc-500 hover:text-rose-400 font-bold text-xs px-3 py-2 rounded-lg transition-all disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                </button>
            </div>
        </div>
    )
}
