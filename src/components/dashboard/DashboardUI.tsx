'use client'

import React from 'react'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'

interface DashboardProps {
    stats: {
        revenue: number;
        expenses: number;
        treasury: number;
        pending: number;
        debt: number;
    };
    recentExpenses: any[];
    recentTransactions: any[];
}

export default function DashboardUI({ stats, recentExpenses, recentTransactions }: DashboardProps) {

    // Helper for currency formatting
    const money = (val: number) =>
        new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(val)

    // Helper for smooth graph generation (Visual Mock)
    const generatePath = () => {
        if (!recentTransactions.length) return "M0,100 L100,100";
        return "M0,100 C20,90 40,95 50,70 C70,40 80,50 100,20 V100 Z";
    }

    return (
        <div className="flex min-h-screen bg-[#050505] text-white font-['Inter'] selection:bg-[#EAB308] selection:text-black">

            {/* 1. FIXED SIDEBAR */}
            <div className="fixed left-0 top-0 h-screen z-50">
                <Sidebar />
            </div>

            {/* 2. MAIN CONTENT AREA */}
            <main className="flex-1 p-8 md:p-12 ml-72 relative overflow-hidden">

                {/* Background Ambient Glow */}
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-zinc-900/50 to-transparent pointer-events-none" />
                <div className="absolute -top-[200px] right-[10%] w-[600px] h-[600px] bg-[#EAB308]/5 rounded-full blur-[120px] pointer-events-none" />

                {/* HEADER */}
                <header className="flex justify-between items-end mb-12 relative z-10">
                    <div>
                        <h1 className="text-4xl font-[800] tracking-tight mb-2 flex items-center gap-3">
                            <span className="w-3 h-8 bg-[#EAB308] rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)]"></span>
                            Tableau de Bord
                        </h1>
                        <p className="text-zinc-500 font-medium ml-6">Vue d'ensemble financière en temps réel</p>
                    </div>

                    {/* Date Badge */}
                    <div className="text-right bg-zinc-900/50 backdrop-blur-md border border-white/5 px-6 py-3 rounded-2xl">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Date</p>
                        <p className="text-sm font-medium text-white capitalize">
                            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </header>

                <div className="grid grid-cols-12 gap-8 relative z-10">

                    {/* --- LEFT COLUMN (Main Stats) --- */}
                    <div className="col-span-12 lg:col-span-8 space-y-8">

                        {/* 1. HERO CARD (TREASURY) - NEW SOPHISTICATED DESIGN 💎 */}
                        <div className="group relative w-full min-h-[380px] bg-[#0A0A0A] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-emerald-500/5 hover:border-white/10">

                            {/* Background Effects */}
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-emerald-500/5 to-transparent rounded-full blur-[120px] pointer-events-none -mr-20 -mt-20"></div>
                            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-emerald-500/5 to-transparent opacity-30"></div>

                            <div className="relative z-20 p-8 md:p-10 flex flex-col justify-between h-full">

                                {/* Top Section */}
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="relative flex h-3 w-3">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${stats.treasury >= 0 ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
                                            <span className={`relative inline-flex rounded-full h-3 w-3 ${stats.treasury >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                        </div>
                                        <h3 className="text-zinc-400 font-bold uppercase text-xs tracking-[0.2em]">Trésorerie Nette</h3>
                                    </div>

                                    {/* The Big Number (Responsive & Gradient) */}
                                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                        <span className={`
                                            font-[800] tracking-tighter font-mono 
                                            text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] xl:text-[5.5rem] 
                                            leading-none bg-clip-text text-transparent 
                                            ${stats.treasury >= 0
                                                ? 'bg-gradient-to-b from-white via-zinc-200 to-zinc-500'
                                                : 'bg-gradient-to-b from-red-400 via-red-500 to-red-800'}
                                        `}>
                                            {money(stats.treasury).replace(/\s?MAD\s?/, '')}
                                        </span>

                                        <span className="text-xl md:text-3xl font-bold text-zinc-600 font-mono mb-2 md:mb-4">
                                            MAD
                                        </span>
                                    </div>
                                </div>

                                {/* Bottom Stats (Grid) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 pt-8 mt-6">
                                    {/* Incoming */}
                                    <div className="group/stat">
                                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2 group-hover/stat:text-emerald-400 transition-colors">
                                            Revenus Encaissés
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500">
                                                <span className="material-symbols-outlined text-sm">arrow_outward</span>
                                            </div>
                                            <span className="text-xl md:text-2xl font-bold text-zinc-200 font-mono">
                                                +{money(stats.revenue).replace('MAD', '')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Outgoing */}
                                    <div className="group/stat">
                                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2 group-hover/stat:text-rose-400 transition-colors">
                                            Dépenses Totales
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-500">
                                                <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                            </div>
                                            <span className="text-xl md:text-2xl font-bold text-zinc-200 font-mono">
                                                -{money(stats.expenses).replace('MAD', '')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Chart Background */}
                            <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20 pointer-events-none mix-blend-plus-lighter">
                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                                    <defs>
                                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
                                            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path d={generatePath()} fill="url(#chartGrad)" />
                                    <path d={generatePath().replace('V100 Z', '')} fill="none" stroke="#10B981" strokeWidth="0.5" strokeDasharray="2 2" />
                                </svg>
                            </div>
                        </div>

                        {/* 2. RECENT ACTIVITY LISTS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                            {/* INVOICES */}
                            <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-3xl p-6 backdrop-blur-sm">
                                <div className="flex justify-between items-center mb-6 pl-2">
                                    <h3 className="font-bold text-zinc-300 flex items-center gap-2 text-sm uppercase tracking-wider">
                                        <span className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-emerald-500 text-xs">add</span>
                                        </span>
                                        Entrées
                                    </h3>
                                    <Link href="/invoices" className="text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full transition-colors">TOUT VOIR</Link>
                                </div>
                                <div className="space-y-3">
                                    {recentTransactions.length > 0 ? recentTransactions.map((inv, i) => (
                                        <div key={i} className="group flex justify-between items-center p-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-bold text-xs group-hover:text-white transition-colors">
                                                    {inv.client?.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-zinc-200 group-hover:text-white">{inv.client?.name}</p>
                                                    <p className="text-[10px] text-zinc-500 font-mono tracking-wide">{inv.number}</p>
                                                </div>
                                            </div>
                                            <p className="font-mono font-bold text-sm text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                                                +{money(inv.total_ttc)}
                                            </p>
                                        </div>
                                    )) : (
                                        <div className="p-8 text-center text-zinc-600 text-xs italic">Aucune facture récente</div>
                                    )}
                                </div>
                            </div>

                            {/* EXPENSES */}
                            <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-3xl p-6 backdrop-blur-sm">
                                <div className="flex justify-between items-center mb-6 pl-2">
                                    <h3 className="font-bold text-zinc-300 flex items-center gap-2 text-sm uppercase tracking-wider">
                                        <span className="w-6 h-6 rounded bg-rose-500/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-rose-500 text-xs">remove</span>
                                        </span>
                                        Sorties
                                    </h3>
                                    <Link href="/expenses" className="text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full transition-colors">TOUT VOIR</Link>
                                </div>
                                <div className="space-y-3">
                                    {recentExpenses.length > 0 ? recentExpenses.map((exp, i) => (
                                        <div key={i} className="group flex justify-between items-center p-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-rose-500/30 transition-colors">
                                                    <span className="material-symbols-outlined text-zinc-500 text-sm group-hover:text-rose-500">
                                                        {exp.category === 'Dette' ? 'account_balance' : 'receipt_long'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-zinc-200 group-hover:text-white truncate max-w-[100px]">{exp.description}</p>
                                                    <p className="text-[10px] text-zinc-500 uppercase">{exp.category}</p>
                                                </div>
                                            </div>
                                            <p className="font-mono font-bold text-sm text-rose-500 bg-rose-500/10 px-2 py-1 rounded-md">
                                                -{money(exp.amount)}
                                            </p>
                                        </div>
                                    )) : (
                                        <div className="p-8 text-center text-zinc-600 text-xs italic">Aucune dépense récente</div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* --- RIGHT COLUMN (Side Stats) --- */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">

                        {/* PENDING CARD */}
                        <div className="bg-zinc-900/30 border border-zinc-800/60 p-8 rounded-3xl relative overflow-hidden group hover:bg-zinc-900/50 transition-all">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#EAB308]/10 blur-2xl rounded-full -mr-10 -mt-10 group-hover:bg-[#EAB308]/20 transition-all"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-[#EAB308]">hourglass_top</span>
                                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">En Attente</p>
                                </div>
                                <p className="text-4xl font-[800] text-white font-mono">{stats.pending}</p>
                                <p className="text-xs text-zinc-500 mt-2">Factures envoyées, non payées.</p>
                            </div>
                        </div>

                        {/* EXPENSES MINI CARD */}
                        <div className="bg-zinc-900/30 border border-zinc-800/60 p-8 rounded-3xl relative overflow-hidden group hover:bg-zinc-900/50 transition-all">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 blur-2xl rounded-full -mr-10 -mt-10 group-hover:bg-rose-500/20 transition-all"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-rose-500">trending_down</span>
                                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Dépenses Globales</p>
                                </div>
                                <p className="text-3xl font-[800] text-white font-mono tracking-tight">{money(stats.expenses)}</p>
                            </div>
                        </div>

                        {/* DEBT CARD (Visual Bar) */}
                        <div className="bg-zinc-900/30 border border-zinc-800/60 p-8 rounded-3xl relative overflow-hidden group hover:bg-zinc-900/50 transition-all">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-900/20 blur-2xl rounded-full -mr-10 -mt-10"></div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-zinc-400">account_balance</span>
                                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Dettes Actives</p>
                                    </div>
                                    <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-1 rounded font-bold uppercase">Prioritaire</span>
                                </div>

                                <p className="text-3xl font-[800] text-white font-mono mb-4">-{money(stats.debt)}</p>

                                {/* Progress Bar */}
                                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                    <div className="bg-gradient-to-r from-rose-500 to-red-600 h-full w-[60%] shadow-[0_0_10px_rgba(225,29,72,0.5)]"></div>
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-3 text-right">60% du plafond autorisé</p>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    )
}