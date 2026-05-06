'use client'

import { useEffect } from 'react'

interface ConfirmationModalProps {
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
    isLoading?: boolean
    confirmLabel?: string
    danger?: boolean
}

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    isLoading,
    confirmLabel = 'Confirmer',
    danger = false,
}: ConfirmationModalProps) {
    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isLoading) onCancel() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [isOpen, isLoading, onCancel])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                {/* Top accent line */}
                <div className={`h-0.5 w-full ${danger ? 'bg-rose-500' : 'bg-primary'}`} />

                <div className="p-6">
                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 border ${
                        danger
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : 'bg-primary/10 border-primary/20 text-primary'
                    }`}>
                        <span className="material-symbols-outlined text-[22px]">
                            {danger ? 'delete_forever' : 'help'}
                        </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-7">{message}</p>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                                danger
                                    ? 'bg-rose-500 hover:bg-rose-400'
                                    : 'bg-primary hover:bg-primary/90'
                            }`}
                        >
                            {isLoading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
