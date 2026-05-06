'use client'

import { useMemo, useState } from 'react'
import ReportsView from './ReportsView'
import { formatMAD, formatDateShort } from '@/utils/format'

interface ReportsPageClientProps {
    invoices: any[]
    expenses: any[]
}

// ── CSV helpers ────────────────────────────────────────────
function downloadCsv(filename: string, rows: string[][], headers: string[]) {
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))]
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

const TAB_CLS_BASE = 'px-5 py-2.5 rounded-xl text-sm font-bold border transition-all'
const TAB_ACTIVE = TAB_CLS_BASE + ' bg-primary/10 border-primary/30 text-primary'
const TAB_INACTIVE = TAB_CLS_BASE + ' bg-white/[0.025] border-white/[0.06] text-zinc-500 hover:text-zinc-300'

type Tab = 'analytics' | 'tva' | 'aging' | 'export'

export default function ReportsPageClient({ invoices, expenses }: ReportsPageClientProps) {
    const [tab, setTab] = useState<Tab>('analytics')
    const [tvaYear, setTvaYear] = useState(new Date().getFullYear())
    const [tvaMonth, setTvaMonth] = useState<number | null>(null)

    // ── TVA data ────────────────────────────────────────────
    const tvaData = useMemo(() => {
        const paid = invoices.filter(inv => {
            const s = (inv.status || '').toLowerCase()
            if (s !== 'paid') return false
            const d = new Date(inv.date || inv.created_at)
            if (d.getFullYear() !== tvaYear) return false
            if (tvaMonth !== null && d.getMonth() + 1 !== tvaMonth) return false
            return true
        })

        const byRate: Record<number, { ht: number; tva: number; ttc: number }> = {}

        for (const inv of paid) {
            const items = inv.invoice_items || []
            const totalHT = items.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0)
            const discount = inv.discount || 0
            const netHT = totalHT * (1 - discount / 100)
            const discountRatio = totalHT > 0 ? netHT / totalHT : 1

            if (items.length === 0) {
                // Fallback: use stored totals with 20%
                const ttc = Number(inv.total_ttc) || 0
                const ht = ttc / 1.20
                const tva = ttc - ht
                byRate[20] = byRate[20] || { ht: 0, tva: 0, ttc: 0 }
                byRate[20].ht += ht
                byRate[20].tva += tva
                byRate[20].ttc += ttc
            } else {
                for (const item of items) {
                    const rate = Number(item.tva_rate ?? 20)
                    const lineHT = (Number(item.total) || 0) * discountRatio
                    const lineTVA = lineHT * (rate / 100)
                    byRate[rate] = byRate[rate] || { ht: 0, tva: 0, ttc: 0 }
                    byRate[rate].ht += lineHT
                    byRate[rate].tva += lineTVA
                    byRate[rate].ttc += lineHT + lineTVA
                }
            }
        }

        const rows = Object.entries(byRate).map(([rate, v]) => ({
            rate: Number(rate),
            ht: v.ht,
            tva: v.tva,
            ttc: v.ttc,
        })).sort((a, b) => a.rate - b.rate)

        const totals = rows.reduce((s, r) => ({ ht: s.ht + r.ht, tva: s.tva + r.tva, ttc: s.ttc + r.ttc }), { ht: 0, tva: 0, ttc: 0 })

        return { rows, totals, invoiceCount: paid.length }
    }, [invoices, tvaYear, tvaMonth])

    // ── Client aging ────────────────────────────────────────
    const agingData = useMemo(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const clientMap: Record<string, { name: string; email: string; buckets: number[]; total: number; oldest: Date | null }> = {}

        for (const inv of invoices) {
            const s = (inv.status || '').toLowerCase()
            if (s === 'paid' || s === 'draft') continue
            const clientId = inv.client_id || inv.id
            const clientName = inv.client?.name || 'Client inconnu'
            const clientEmail = inv.client?.email || ''
            const amount = Number(inv.total_ttc) || 0
            const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.date || inv.created_at)
            const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000)

            if (!clientMap[clientId]) {
                clientMap[clientId] = { name: clientName, email: clientEmail, buckets: [0, 0, 0, 0], total: 0, oldest: null }
            }
            const c = clientMap[clientId]
            c.total += amount
            if (daysOverdue < 0) c.buckets[0] += amount       // not yet due
            else if (daysOverdue <= 30) c.buckets[1] += amount  // 0-30 days
            else if (daysOverdue <= 60) c.buckets[2] += amount  // 31-60 days
            else c.buckets[3] += amount                          // 60+ days
            if (!c.oldest || dueDate < c.oldest) c.oldest = dueDate
        }

        return Object.values(clientMap).sort((a, b) => b.total - a.total)
    }, [invoices])

    // ── CSV exports ──────────────────────────────────────────
    const exportInvoicesCsv = () => {
        const rows = invoices.map(inv => [
            inv.invoice_number || 'BROUILLON',
            inv.client?.name || '',
            inv.date || '',
            inv.due_date || '',
            inv.status || 'draft',
            String(Number(inv.total_ttc) || 0),
        ])
        downloadCsv(`factures_${new Date().toISOString().slice(0, 10)}.csv`, rows,
            ['Numero', 'Client', 'Date', 'Echeance', 'Statut', 'Total TTC (MAD)'])
    }

    const exportExpensesCsv = () => {
        const rows = expenses.map(exp => [
            exp.date || '',
            exp.description || '',
            exp.category || '',
            exp.payment_method || '',
            String(Number(exp.amount) || 0),
        ])
        downloadCsv(`depenses_${new Date().toISOString().slice(0, 10)}.csv`, rows,
            ['Date', 'Description', 'Categorie', 'Mode de paiement', 'Montant (MAD)'])
    }

    const exportTvaCsv = () => {
        const rows = tvaData.rows.map(r => [
            String(r.rate) + '%',
            r.ht.toFixed(2),
            r.tva.toFixed(2),
            r.ttc.toFixed(2),
        ])
        downloadCsv(`tva_${tvaYear}${tvaMonth ? '_' + String(tvaMonth).padStart(2, '0') : ''}.csv`, rows,
            ['Taux TVA', 'Base HT (MAD)', 'TVA (MAD)', 'TTC (MAD)'])
    }

    const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-3xl">bar_chart</span>
                        Rapports
                    </h1>
                    <p className="text-zinc-500 mt-2 text-sm">Analyses financieres, declaration TVA, vieillissement clients et exports.</p>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {([
                        { id: 'analytics', label: 'Analyses', icon: 'insights' },
                        { id: 'tva', label: 'Declaration TVA', icon: 'receipt_long' },
                        { id: 'aging', label: 'Vieillissement', icon: 'hourglass_top' },
                        { id: 'export', label: 'Exports', icon: 'download' },
                    ] as { id: Tab; label: string; icon: string }[]).map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={tab === t.id ? TAB_ACTIVE : TAB_INACTIVE}>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                                {t.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Analytics tab */}
                {tab === 'analytics' && (
                    <ReportsView invoices={invoices} expenses={expenses} />
                )}

                {/* TVA Declaration tab */}
                {tab === 'tva' && (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                value={tvaYear}
                                onChange={e => setTvaYear(Number(e.target.value))}
                                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:ring-1 focus:ring-primary/40"
                            >
                                {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <div className="flex flex-wrap gap-1.5">
                                <button
                                    onClick={() => setTvaMonth(null)}
                                    className={'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ' + (tvaMonth === null ? 'bg-primary/10 border-primary/30 text-primary' : 'border-white/[0.06] text-zinc-500 hover:text-white')}
                                >
                                    Annee complete
                                </button>
                                {MONTHS.map((m, i) => (
                                    <button key={m} onClick={() => setTvaMonth(i + 1)}
                                        className={'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ' + (tvaMonth === i + 1 ? 'bg-primary/10 border-primary/30 text-primary' : 'border-white/[0.06] text-zinc-500 hover:text-white')}>
                                        {m}
                                    </button>
                                ))}
                            </div>
                            <button onClick={exportTvaCsv}
                                className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-sm font-bold hover:bg-white/[0.08] transition-all">
                                <span className="material-symbols-outlined text-[16px]">download</span>
                                Exporter
                            </button>
                        </div>

                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                                <h3 className="font-bold text-white">
                                    Declaration TVA — {tvaMonth ? MONTHS[tvaMonth - 1] + ' ' : ''}{tvaYear}
                                </h3>
                                <span className="text-xs text-zinc-500">{tvaData.invoiceCount} facture(s) payee(s)</span>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-500 uppercase text-[10px] tracking-wider">
                                        <th className="px-6 py-3 text-left font-bold">Taux TVA</th>
                                        <th className="px-6 py-3 text-right font-bold">Base HT</th>
                                        <th className="px-6 py-3 text-right font-bold">Montant TVA</th>
                                        <th className="px-6 py-3 text-right font-bold">Total TTC</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {tvaData.rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center text-zinc-500">
                                                Aucune facture payee pour cette periode.
                                            </td>
                                        </tr>
                                    ) : (
                                        tvaData.rows.map(r => (
                                            <tr key={r.rate} className="hover:bg-zinc-800/40">
                                                <td className="px-6 py-4">
                                                    <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-lg text-xs font-bold">
                                                        TVA {r.rate}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-zinc-300">{formatMAD(r.ht)}</td>
                                                <td className="px-6 py-4 text-right font-mono text-amber-400 font-bold">{formatMAD(r.tva)}</td>
                                                <td className="px-6 py-4 text-right font-mono text-white font-bold">{formatMAD(r.ttc)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {tvaData.rows.length > 0 && (
                                    <tfoot>
                                        <tr className="border-t-2 border-zinc-700 bg-zinc-900/80">
                                            <td className="px-6 py-4 font-bold text-white uppercase text-xs tracking-wider">TOTAL</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-white">{formatMAD(tvaData.totals.ht)}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-amber-400">{formatMAD(tvaData.totals.tva)}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-primary text-lg">{formatMAD(tvaData.totals.ttc)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}

                {/* Client Aging tab */}
                {tab === 'aging' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                            {['Non echu', '0-30 jours', '31-60 jours', '60+ jours'].map((label, i) => {
                                const total = agingData.reduce((s, c) => s + c.buckets[i], 0)
                                const colors = ['text-zinc-400', 'text-amber-400', 'text-orange-400', 'text-rose-400']
                                const bgColors = ['bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]', 'bg-amber-500/[0.08] border-amber-500/20 hover:border-amber-500/40', 'bg-orange-500/[0.08] border-orange-500/20 hover:border-orange-500/40', 'bg-rose-500/[0.08] border-rose-500/20 hover:border-rose-500/40']
                                return (
                                    <div key={label} className={'border rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg cursor-default ' + bgColors[i]}>
                                        <p className={'text-[10px] font-bold uppercase tracking-wider mb-2 ' + colors[i]}>{label}</p>
                                        <p className={'font-mono font-bold text-xs leading-snug break-all ' + colors[i]} title={formatMAD(total)}>{formatMAD(total)}</p>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-500 uppercase text-[10px] tracking-wider">
                                        <th className="px-6 py-3 text-left font-bold">Client</th>
                                        <th className="px-6 py-3 text-right font-bold">Non echu</th>
                                        <th className="px-6 py-3 text-right font-bold">0-30 j</th>
                                        <th className="px-6 py-3 text-right font-bold">31-60 j</th>
                                        <th className="px-6 py-3 text-right font-bold">60+ j</th>
                                        <th className="px-6 py-3 text-right font-bold">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {agingData.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-zinc-500">
                                                Aucune facture impayee.
                                            </td>
                                        </tr>
                                    ) : agingData.map((c, i) => (
                                        <tr key={i} className="hover:bg-zinc-800/40">
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-white">{c.name}</p>
                                                {c.email && <p className="text-xs text-zinc-500">{c.email}</p>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-zinc-400 text-xs">{c.buckets[0] > 0 ? formatMAD(c.buckets[0]) : '—'}</td>
                                            <td className="px-6 py-4 text-right font-mono text-amber-400 text-xs">{c.buckets[1] > 0 ? formatMAD(c.buckets[1]) : '—'}</td>
                                            <td className="px-6 py-4 text-right font-mono text-orange-400 text-xs">{c.buckets[2] > 0 ? formatMAD(c.buckets[2]) : '—'}</td>
                                            <td className="px-6 py-4 text-right font-mono text-rose-400 text-xs">{c.buckets[3] > 0 ? formatMAD(c.buckets[3]) : '—'}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-white">{formatMAD(c.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Export tab */}
                {tab === 'export' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            {
                                title: 'Factures',
                                description: 'Exportez toutes vos factures au format CSV: numero, client, date, echeance, statut et montant.',
                                icon: 'receipt_long',
                                count: invoices.length,
                                onClick: exportInvoicesCsv,
                                accent: 'primary',
                            },
                            {
                                title: 'Depenses',
                                description: 'Exportez toutes vos depenses avec date, description, categorie, mode de paiement et montant.',
                                icon: 'account_balance_wallet',
                                count: expenses.length,
                                onClick: exportExpensesCsv,
                                accent: 'rose',
                            },
                        ].map(card => (
                            <div key={card.title} className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ' + (card.accent === 'primary' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400')}>
                                        <span className="material-symbols-outlined text-[22px]">{card.icon}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-base">{card.title}</h3>
                                        <p className="text-zinc-500 text-xs mt-1">{card.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-600">{card.count} enregistrement(s)</span>
                                    <button
                                        onClick={card.onClick}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-gradient text-white text-sm font-bold shadow-glow-sm hover:shadow-glow transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">download</span>
                                        Telecharger CSV
                                    </button>
                                </div>
                            </div>
                        ))}

                        <div className="md:col-span-2 bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[22px]">receipt_long</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base">Declaration TVA</h3>
                                    <p className="text-zinc-500 text-xs mt-1">Exportez le recapitulatif TVA par taux pour l'annee ou le mois courant (onglet Declaration TVA).</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-600">{tvaData.rows.length} taux distincts</span>
                                <button
                                    onClick={() => { setTab('tva'); }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-sm font-bold hover:bg-white/[0.08] transition-all"
                                >
                                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                    Voir la declaration
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
