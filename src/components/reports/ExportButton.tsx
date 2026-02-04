'use client';

import { useState } from 'react';

interface ExportButtonProps {
    invoices: any[];
    expenses: any[];
}

export default function ExportButton({ invoices, expenses }: ExportButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleExport = () => {
        setLoading(true);

        // 1. Prepare Data for CSV
        // We combine Invoices (Revenue) and Expenses into a single chronological ledger
        const ledger = [
            ...invoices.map(inv => ({
                Date: new Date(inv.created_at).toLocaleDateString('fr-MA'),
                Type: 'Revenu',
                Category: 'Vente',
                Description: `Facture #${inv.invoice_number} - ${inv.client?.name || 'Client'}`,
                Montant: Number(inv.total_amount),
                Statut: inv.status === 'Paid' ? 'Encaissé' : 'En attente'
            })),
            ...expenses.map(exp => ({
                Date: new Date(exp.date).toLocaleDateString('fr-MA'),
                Type: 'Dépense',
                Category: exp.category || 'Autre',
                Description: exp.description,
                Montant: -Number(exp.amount), // Negative for expenses
                Statut: 'Payé'
            }))
        ].sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime()); // Sort by date desc

        // 2. Convert to CSV String
        const headers = ['Date', 'Type', 'Categorie', 'Description', 'Montant (MAD)', 'Statut'];
        const csvContent = [
            headers.join(','),
            ...ledger.map(row => Object.values(row).map(val => `"${val}"`).join(','))
        ].join('\n');

        // 3. Trigger Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Rapport_Financier_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => setLoading(false), 1000);
    };

    return (
        <button
            onClick={handleExport}
            disabled={loading}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all duration-300 active:scale-95"
        >
            {loading ? (
                <span className="material-symbols-outlined text-[20px] animate-spin text-text-secondary">progress_activity</span>
            ) : (
                <span className="material-symbols-outlined text-[20px] text-text-secondary group-hover:text-primary transition-colors">download</span>
            )}
            <span className="text-xs font-bold text-white tracking-wide">
                {loading ? 'EXPORT...' : 'EXPORTER CSV'}
            </span>
        </button>
    );
}