'use client';

import { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

interface ReportsViewProps {
    invoices: any[];
    expenses: any[];
}

const formatMoney = (val: number) =>
    new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(val);

export default function ReportsView({ invoices, expenses }: ReportsViewProps) {
    const [range, setRange] = useState<'1M' | '3M' | '6M' | '1Y'>('6M');

    // --- DATA PROCESSING ---
    const { filteredInvoices, filteredExpenses, chartData } = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        let grouping: 'day' | 'month' = 'month';

        if (range === '1M') { startDate.setMonth(now.getMonth() - 1); grouping = 'day'; }
        else if (range === '3M') { startDate.setMonth(now.getMonth() - 3); grouping = 'month'; }
        else if (range === '6M') { startDate.setMonth(now.getMonth() - 6); grouping = 'month'; }
        else if (range === '1Y') { startDate.setFullYear(now.getFullYear() - 1); grouping = 'month'; }

        const fInvoices = invoices.filter(i => new Date(i.created_at) >= startDate);
        const fExpenses = expenses.filter(e => new Date(e.date) >= startDate);

        // Initialize map
        const dataMap = new Map();
        let current = new Date(startDate);
        while (current <= now) {
            const key = grouping === 'day' ? current.toISOString().slice(0, 10) : current.toISOString().slice(0, 7);
            const label = grouping === 'day'
                ? current.toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit' })
                : current.toLocaleDateString('fr-MA', { month: 'short' });

            dataMap.set(key, { name: label, Revenu: 0, Dépenses: 0, Profit: 0 });
            if (grouping === 'day') current.setDate(current.getDate() + 1);
            else current.setMonth(current.getMonth() + 1);
        }

        // Populate data
        fInvoices.forEach(inv => {
            if (inv.status !== 'Paid') return;
            const key = grouping === 'day' ? inv.created_at.slice(0, 10) : inv.created_at.slice(0, 7);
            if (dataMap.has(key)) {
                const entry = dataMap.get(key);
                entry.Revenu += Number(inv.total_amount);
                entry.Profit = entry.Revenu - entry.Dépenses;
            }
        });

        fExpenses.forEach(exp => {
            const key = grouping === 'day' ? exp.date.slice(0, 10) : exp.date.slice(0, 7);
            if (dataMap.has(key)) {
                const entry = dataMap.get(key);
                entry.Dépenses += Number(exp.amount);
                entry.Profit = entry.Revenu - entry.Dépenses;
            }
        });

        return { filteredInvoices: fInvoices, filteredExpenses: fExpenses, chartData: Array.from(dataMap.values()) };
    }, [invoices, expenses, range]);

    // --- KPIs ---
    const totalRevenue = filteredInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.total_amount), 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
    const pendingRevenue = filteredInvoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + Number(i.total_amount), 0);

    // --- PIE DATA ---
    const expensesByCategory = filteredExpenses.reduce((acc: any, curr) => {
        const cat = curr.category || 'Autre';
        acc[cat] = (acc[cat] || 0) + Number(curr.amount);
        return acc;
    }, {});
    const pieData = Object.keys(expensesByCategory).map(key => ({ name: key, value: expensesByCategory[key] }));
    const COLORS = ['#f4b943', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6'];

    return (
        <div className="flex flex-col gap-8 pb-20 animate-fade-in">

            {/* FILTER TABS - Scrollable on Mobile */}
            <div className="flex justify-start overflow-x-auto no-scrollbar pb-2">
                <div className="bg-black/40 p-1.5 rounded-xl border border-white/10 flex gap-1 whitespace-nowrap">
                    {[
                        { id: '1M', label: 'Ce Mois' },
                        { id: '3M', label: 'Trimestre' },
                        { id: '6M', label: 'Semestre' },
                        { id: '1Y', label: 'Année' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setRange(tab.id as any)}
                            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${range === tab.id
                                    ? 'bg-gold-gradient text-black shadow-lg scale-105'
                                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {[
                    { title: "Chiffre d'Affaires", amount: totalRevenue, icon: "payments", color: "text-primary", sub: "Encaissé", subColor: "text-green-500", subIcon: "check_circle" },
                    { title: "Dépenses Totales", amount: totalExpenses, icon: "trending_down", color: "text-red-500", sub: "Sorties", subColor: "text-red-400", subIcon: "arrow_downward" },
                    { title: "Bénéfice Net", amount: netProfit, icon: "account_balance_wallet", color: "text-white", sub: `Marge: ${margin}%`, subColor: "text-primary", subIcon: "trending_up", gradient: true },
                    { title: "En Attente", amount: pendingRevenue, icon: "pending_actions", color: "text-blue-400", sub: "À recevoir", subColor: "text-blue-400", subIcon: "schedule" }
                ].map((kpi, idx) => (
                    <div key={idx} className={`glass-card p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all duration-300 ${kpi.gradient ? 'bg-gradient-to-br from-primary/10 to-transparent' : ''}`}>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <span className="material-symbols-outlined text-7xl text-white">{kpi.icon}</span>
                        </div>
                        <p className="text-text-secondary text-[10px] font-bold uppercase tracking-widest mb-2">{kpi.title}</p>
                        <h3 className={`text-2xl lg:text-3xl font-bold text-white tracking-tight ${kpi.color === 'text-red-500' ? '' : ''}`}>{formatMoney(kpi.amount)}</h3>
                        <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${kpi.subColor}`}>
                            {kpi.subIcon && <span className="material-symbols-outlined text-[14px]">{kpi.subIcon}</span>}
                            <span>{kpi.sub}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* CHARTS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* BAR CHART */}
                <div className="lg:col-span-2 glass-card p-6 lg:p-8 rounded-3xl border border-white/5 flex flex-col h-[400px]">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-3 text-sm uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        Flux de Trésorerie
                    </h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    cursor={{ fill: '#ffffff05' }}
                                    contentStyle={{ backgroundColor: '#121212', borderColor: '#333', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
                                    formatter={(val: any) => formatMoney(Number(val))}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', opacity: 0.7 }} />
                                <Bar dataKey="Revenu" fill="#f4b943" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="Dépenses" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* PIE CHART */}
                <div className="glass-card p-6 lg:p-8 rounded-3xl border border-white/5 flex flex-col h-[400px]">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-3 text-sm uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Répartition
                    </h3>
                    <div className="flex-1 w-full min-h-0 relative">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#121212', borderColor: '#333', borderRadius: '12px', color: '#fff' }}
                                        formatter={(val: any) => formatMoney(Number(val))}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', opacity: 0.8 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-text-secondary opacity-50">
                                <span className="material-symbols-outlined text-4xl mb-2">data_usage</span>
                                <span className="text-xs">Aucune donnée</span>
                            </div>
                        )}

                        {/* Center Text for Pie */}
                        {pieData.length > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                                <div className="text-center">
                                    <span className="text-[10px] text-text-secondary uppercase tracking-widest">Total</span>
                                    <div className="text-white font-bold text-lg">{formatMoney(totalExpenses)}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AREA CHART - Full Width */}
            <div className="glass-card p-6 lg:p-8 rounded-3xl border border-white/5 h-[350px] flex flex-col">
                <h3 className="text-white font-bold mb-6 flex items-center gap-3 text-sm uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Croissance du Bénéfice
                </h3>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#121212', borderColor: '#333', borderRadius: '12px', color: '#fff' }}
                                formatter={(val: any) => formatMoney(Number(val))}
                            />
                            <Area type="monotone" dataKey="Profit" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
}