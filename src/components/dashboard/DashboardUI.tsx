'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { formatMAD, formatDateShort } from '@/utils/format'
import KpiCard from './KpiCard'
import TrendChartCard from './TrendChartCard'
import TopClientsCard from './TopClientsCard'
import ExpenseCategoryCard from './ExpenseCategoryCard'
import RecentInvoicesTable from './RecentInvoicesTable'
import RappelsWidget from './RappelsWidget'
import OnboardingPanel from './OnboardingPanel'
import type { DashboardData, Reminder } from '@/app/actions/dashboard'

function OverduePanel({ reminders }: { reminders: Reminder[] }) {
    const items = reminders.filter(r => r.type === 'overdue')

    return (
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-rose-500/15 border border-rose-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">En retard</span>
                </div>
                {items.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400">
                        {items.length}
                    </span>
                )}
            </div>

            {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                    </div>
                    <p className="text-xs text-zinc-600">Aucune facture en retard</p>
                </div>
            ) : (
                <ul className="flex-1 overflow-y-auto thin-scrollbar space-y-0.5">
                    {items.map(r => (
                        <li key={r.id}>
                            <Link href={`/invoices/${r.id}`}
                                className="flex items-center justify-between px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-colors group">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate group-hover:text-rose-300 transition-colors">
                                        {r.invoiceNumber}
                                    </p>
                                    <p className="text-[10px] text-zinc-600 truncate">{r.clientName}</p>
                                </div>
                                <div className="text-right ml-2 shrink-0">
                                    <p className="text-xs font-mono font-bold text-rose-400">{formatMAD(r.amount)}</p>
                                    {r.dueDate && (
                                        <p className="text-[9px] text-zinc-600">{formatDateShort(r.dueDate)}</p>
                                    )}
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
    const [today, setToday] = useState('')
    useEffect(() => {
        setToday(new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        }))
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
            {/* Ambient glows */}
            <div aria-hidden className="pointer-events-none fixed -top-32 left-1/3 w-[700px] h-[500px] bg-blue-600/[0.025] rounded-full blur-[120px]" />
            <div aria-hidden className="pointer-events-none fixed bottom-0 right-0 w-[500px] h-[400px] bg-violet-600/[0.02] rounded-full blur-[100px]" />

            {/* Header */}
            <header className="flex items-center justify-between mb-4 shrink-0 relative z-10">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-0.5">Tableau de Bord</p>
                    <h1 className="text-xl font-[800] tracking-tight text-white leading-none">Vue d&apos;ensemble</h1>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/invoices/new"
                        className="flex items-center gap-1.5 bg-primary hover:bg-accent text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        Facture
                    </Link>
                    <RappelsWidget reminders={reminders} />
                    <time className="text-xs text-zinc-600 hidden xl:block" suppressHydrationWarning>{today}</time>
                </div>
            </header>

            {!hasAnyData && (
                <div className="relative z-10 mb-4 shrink-0">
                    <OnboardingPanel />
                </div>
            )}

            {/* KPI Strip */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 shrink-0 relative z-10">
                <KpiCard
                    label="Revenus ce mois"
                    value={formatMAD(revMTD)}
                    icon="payments"
                    accent="emerald"
                    trend={momRev > 0 ? 'up' : momRev < 0 ? 'down' : 'flat'}
                    trendLabel={(momRev > 0 ? '+' : '') + momRev.toFixed(0) + '% vs mois préc.'}
                    href="/invoices"
                />
                <KpiCard
                    label="En attente"
                    value={formatMAD(pendingAmount)}
                    icon="hourglass_top"
                    accent="amber"
                    sub={stats.pending === 0 ? 'Aucune' : `${stats.pending} facture${stats.pending > 1 ? 's' : ''}`}
                    href="/invoices"
                />
                <KpiCard
                    label="En retard"
                    value={formatMAD(overdueTotal)}
                    icon="warning"
                    accent="rose"
                    sub={overdueCount === 0 ? 'Tout est à jour' : `${overdueCount} facture${overdueCount > 1 ? 's' : ''}`}
                    href="/invoices"
                />
                <KpiCard
                    label="Dépenses ce mois"
                    value={formatMAD(expMTD)}
                    icon="arrow_downward"
                    accent="rose"
                    trend={momExp > 0 ? 'up' : momExp < 0 ? 'down' : 'flat'}
                    trendLabel={(momExp > 0 ? '+' : '') + momExp.toFixed(0) + '% vs mois préc.'}
                    href="/expenses"
                />
            </section>

            {/* Main grid */}
            <div className="flex gap-4 flex-1 min-h-0 relative z-10">

                {/* Left column: chart + recent invoices */}
                <div className="flex flex-col gap-4 flex-[3] min-h-0 min-w-0">
                    <div className="flex-1 min-h-0">
                        <TrendChartCard
                            revenueByMonth={revenueByMonth}
                            expensesByMonth={expensesByMonth}
                            monthLabels={monthLabels}
                        />
                    </div>
                    <div className="h-[210px] shrink-0">
                        <RecentInvoicesTable invoices={recentTransactions} />
                    </div>
                </div>

                {/* Right column: overdue + top clients + expense breakdown */}
                <div className="flex flex-col gap-4 flex-[2] min-h-0 min-w-0">
                    <div className="flex-[5] min-h-0">
                        <OverduePanel reminders={reminders} />
                    </div>
                    <div className="flex-[4] min-h-0">
                        <TopClientsCard topClients={topClients.slice(0, 3)} totalRevenue={stats.revenue} />
                    </div>
                    <div className="flex-[3] min-h-0">
                        <ExpenseCategoryCard expensesByCategory={expensesByCategory} totalExpenses={stats.expenses} />
                    </div>
                </div>
            </div>
        </main>
    )
}
