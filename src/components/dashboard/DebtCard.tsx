'use client';

import { useState } from 'react';
import { payDebtInstallment } from '@/app/actions/finance';

export default function DebtCard({ debt, workspaceId }: { debt: any, workspaceId: string }) {
    const [loading, setLoading] = useState(false);

    const handlePay = async () => {
        if (!confirm(`Confirmer le paiement de ${debt.monthly_payment} MAD pour ${debt.creditor_name}? Cela sera ajouté à vos dépenses.`)) return;

        setLoading(true);
        await payDebtInstallment(debt.id, debt.monthly_payment, debt.creditor_name, workspaceId);
        setLoading(false);
    };

    const progress = ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100;

    return (
        <div className="glass-card p-5 rounded-2xl border border-white/5 hover:border-primary/20 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-white font-bold">{debt.creditor_name}</h4>
                    <p className="text-xs text-text-secondary">Échéance: {new Date(debt.due_date).toLocaleDateString()}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full border ${debt.status === 'Paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                    {debt.status === 'Paid' ? 'PAYÉ' : 'EN COURS'}
                </span>
            </div>

            <div className="flex justify-between items-end mb-2">
                <div className="text-xs text-text-secondary">Reste à payer</div>
                <div className="text-lg font-bold text-white">{debt.remaining_amount} <span className="text-xs text-primary">MAD</span></div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${progress}%` }}></div>
            </div>

            {/* Pay Button */}
            {debt.status === 'Active' && (
                <button
                    onClick={handlePay}
                    disabled={loading}
                    className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 border border-white/5"
                >
                    {loading ? 'Traitement...' : `Payer Mensualité (${debt.monthly_payment} MAD)`}
                </button>
            )}
        </div>
    );
}