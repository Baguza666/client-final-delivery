'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Plus } from 'lucide-react'
import { formatMAD, formatDateShort } from '@/utils/format'
import KpiCard from './KpiCard'
import TrendChartCard from './TrendChartCard'
import TopClientsCard from './TopClientsCard'
import ExpenseCategoryCard from './ExpenseCategoryCard'
import RecentInvoicesTable from './RecentInvoicesTable'
import RappelsWidget from './RappelsWidget'
import OnboardingPanel from './OnboardingPanel'
import type { DashboardData, Reminder } from '@/lib/dashboard-helpers'

function useReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
        setReduced(mq.matches)
        const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])
    return reduced
}

function OverduePanel({ reminders }: { reminders: Reminder[] }) {
    const overdueItems = reminders.filter(r => r.type === 'overdue')

    return (
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-rose-500/15 border border-rose-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Alertes</span>
                </div>
                {overdueItems.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
                        {overdueItems.length} en retard
                    </span>
                )}
            </div>

            {overdueItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                    </div>
                    <p className="text-xs text-zinc-600">Tout est à jour</p>
                </div>
            ) : (
                <ul className="flex-1 overflow-y-auto thin-scrollbar space-y-0.5">
                    {overdueItems.map(r => (
                        <li key={r.id}>
                            <Link
                                href={`/invoices/${r.id}`}
                                className="flex items-center justify-between px-2 py-2 rounded-xl hover:bg-rose-500/[0.06] border border-transparent hover:border-rose-500/10 transition-all duration-150 group"
                            >
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate group-hover:text-rose-300 transition-colors">{r.invoiceNumber}</p>
                                    <p className="text-[10px] text-zinc-600 truncate">{r.clientName}</p>
                                </div>
                                <div className="text-right ml-2 shrink-0">
                                    <p className="text-xs font-mono font-bold text-rose-400">{formatMAD(r.amount)}</p>
                                    {r.dueDate && <p className="text-[9px] text-zinc-600">{formatDateShort(r.dueDate)}</p>}
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default function DashboardUI({
    stats,
    recentTransactions,
    revenueByMonth,
    expensesByMonth,
    monthLabels,
    expensesByCategory,
    topClients,
    hasAnyData,
    pendingAmount,
    reminders,
}: DashboardData) {
    const reducedMotion = useReducedMotion()
    const anim = (delay: string): React.CSSProperties =>
        reducedMotion ? {} : { animation: `fadeUp 0.4s ease-out ${delay} both` }

    const [today, setToday] = useState('')
    const [greeting, setGreeting] = useState('Bonjour')

    useEffect(() => {
        const now = new Date()
        const h = now.getHours()
        setGreeting(h >= 18 ? 'Bonsoir' : h >= 12 ? 'Bon après-midi' : 'Bonjour')
        setToday(now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    }, [])

    const revMTD = revenueByMonth[11] || 0
    const expMTD = expensesByMonth[11] || 0
    const prevRevMTD = revenueByMonth[10] || 0
    const prevExpMTD = expensesByMonth[10] || 0
    const overdueTotal = reminders.filter(r => r.type === 'overdue').reduce((s, r) => s + r.amount, 0)
    const overdueCount = reminders.filter(r => r.type === 'overdue').length

    const momRev = prevRevMTD > 0 ? ((revMTD - prevRevMTD) / prevRevMTD) * 100 : revMTD > 0 ? 100 : 0
    const momExp = prevExpMTD > 0 ? ((expMTD - prevExpMTD) / prevExpMTD) * 100 : expMTD > 0 ? 100 : 0

    return (
        <main className="flex flex-col px-5 py-4 min-h-screen lg:h-screen lg:overflow-hidden relative bg-zinc-950">
            {/* Ambient glows — brand-matched */}
            <div aria-hidden className="pointer-events-none fixed -top-24 left-[12%] w-[600px] h-[420px] bg-indigo-600/[0.05] rounded-full blur-[110px]" />
            <div aria-hidden className="pointer-events-none fixed bottom-0 right-0 w-[480px] h-[380px] bg-violet-600/[0.04] rounded-full blur-[100px]" />

            {/* Header */}
            <header
                className="flex items-center justify-between mb-5 shrink-0 relative z-10"
                style={anim('0ms')}
            >
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80 mb-0.5" suppressHydrationWarning>
                        {greeting}
                    </p>
                    <h1 className="text-xl font-[800] tracking-tight text-white leading-none">Vue d&apos;ensemble</h1>
                    <time className="text-[11px] text-zinc-600 mt-0.5 block capitalize" suppressHydrationWarning>{today}</time>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/invoices/new"
                        className="flex items-center gap-1.5 bg-brand-gradient text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-glow-sm hover:shadow-glow hover:opacity-90 transition-all duration-200"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Facture
                    </Link>
                    <RappelsWidget reminders={reminders} />
                </div>
            </header>

            {!hasAnyData && (
                <div className="relative z-10 mb-4 shrink-0">
                    <OnboardingPanel />
                </div>
            )}

            {/* KPI Strip */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 shrink-0 relative z-10">
                <div style={anim('80ms')}>
                    <KpiCard
                        label="Revenus ce mois"
                        value={formatMAD(revMTD)}
                        icon="payments"
                        accent="emerald"
                        trend={momRev > 0 ? 'up' : momRev < 0 ? 'down' : 'flat'}
                        trendLabel={(momRev > 0 ? '+' : '') + momRev.toFixed(0) + '% vs mois préc.'}
                        href="/invoices"
                    />
                </div>
                <div style={anim('140ms')}>
                    <KpiCard
                        label="En attente"
                        value={formatMAD(pendingAmount)}
                        icon="hourglass_top"
                        accent="amber"
                        sub={stats.pending === 0 ? 'Aucune' : `${stats.pending} facture${stats.pending > 1 ? 's' : ''}`}
                        href="/invoices"
                    />
                </div>
                <div style={anim('200ms')}>
                    <KpiCard
                        label="En retard"
                        value={formatMAD(overdueTotal)}
                        icon="warning"
                        accent="rose"
                        sub={overdueCount === 0 ? 'Tout est à jour' : `${overdueCount} facture${overdueCount > 1 ? 's' : ''}`}
                        href="/invoices"
                    />
                </div>
                <div style={anim('260ms')}>
                    <KpiCard
                        label="Dépenses ce mois"
                        value={formatMAD(expMTD)}
                        icon="receipt_long"
                        accent="rose"
                        trend={momExp > 0 ? 'up' : momExp < 0 ? 'down' : 'flat'}
                        trendLabel={(momExp > 0 ? '+' : '') + momExp.toFixed(0) + '% vs mois préc.'}
                        href="/expenses"
                    />
                </div>
            </section>

            {/* Main grid */}
            <div className="flex gap-4 flex-1 min-h-0 relative z-10">
                {/* Left column: chart + recent invoices */}
                <div className="flex flex-col gap-4 flex-[3] min-h-0 min-w-0">
                    <div className="flex-1 min-h-0" style={anim('200ms')}>
                        <TrendChartCard
                            revenueByMonth={revenueByMonth}
                            expensesByMonth={expensesByMonth}
                            monthLabels={monthLabels}
                        />
                    </div>
                    <div className="h-[210px] shrink-0" style={anim('280ms')}>
                        <RecentInvoicesTable invoices={recentTransactions} />
                    </div>
                </div>

                {/* Right column: overdue + top clients + expense breakdown */}
                <div className="flex flex-col gap-4 flex-[2] min-h-0 min-w-0">
                    <div className="flex-[5] min-h-0" style={anim('220ms')}>
                        <OverduePanel reminders={reminders} />
                    </div>
                    <div className="flex-[4] min-h-0" style={anim('300ms')}>
                        <TopClientsCard topClients={topClients.slice(0, 3)} totalRevenue={stats.revenue} />
                    </div>
                    <div className="flex-[3] min-h-0" style={anim('360ms')}>
                        <ExpenseCategoryCard expensesByCategory={expensesByCategory} totalExpenses={stats.expenses} />
                    </div>
                </div>
            </div>
        </main>
    )
}
