'use client';

export default function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-text-secondary border border-border-dark hover:text-white hover:border-white hover:bg-white/5 transition-all uppercase tracking-wider"
        >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Imprimer / PDF
        </button>
    );
}