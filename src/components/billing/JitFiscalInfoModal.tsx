'use client'

import Link from 'next/link'

interface JitFiscalInfoModalProps {
    open: boolean
    onLater: () => void
    onClose: () => void
}

export default function JitFiscalInfoModal({ open, onLater, onClose }: JitFiscalInfoModalProps) {
    if (!open) return null
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="jit-fiscal-title"
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl">
                <h2 id="jit-fiscal-title" className="text-xl font-bold mb-2">
                    Pour une facture professionnelle
                </h2>
                <p className="text-sm text-white/60 mb-6">
                    Ajoutez vos informations fiscales (ICE, IF) maintenant pour que vos factures soient
                    conformes aux exigences DGI dès leur création.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onLater}
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white px-4 py-3 font-medium transition"
                    >
                        Plus tard
                    </button>
                    <Link
                        href="/settings/billing"
                        onClick={onClose}
                        className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-black px-4 py-3 font-semibold text-center transition"
                    >
                        Compléter maintenant
                    </Link>
                </div>
            </div>
        </div>
    )
}
