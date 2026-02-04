'use client';
import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// This component takes the Invoice ID and Status as inputs
export default function StatusUpdater({ id, currentStatus }: { id: string, currentStatus: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleUpdate = async () => {
        setLoading(true);
        // Update status in Supabase
        await supabase.from('invoices').update({ status: 'Paid' }).eq('id', id);
        // Refresh the page to show new status
        router.refresh();
        setLoading(false);
    };

    // 1. IF PAID: Show a Green Badge (No click needed)
    if (currentStatus === 'Paid') {
        return (
            <span className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20 uppercase tracking-wider shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                <span className="material-symbols-outlined text-[16px] mr-2">check_circle</span>
                Payée
            </span>
        );
    }

    // 2. IF PENDING: Show the "Mark as Paid" Button (Gold Styling)
    return (
        <button
            onClick={handleUpdate}
            disabled={loading}
            className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-primary border border-primary/30 hover:bg-primary hover:text-black transition-all uppercase tracking-wider"
        >
            <span className="material-symbols-outlined text-[18px]">
                {loading ? 'sync' : 'credit_score'}
            </span>
            {loading ? 'Traitement...' : 'Marquer comme Payée'}

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>
    );
}