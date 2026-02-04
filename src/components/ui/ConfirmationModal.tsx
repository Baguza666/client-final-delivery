'use client'

import React from 'react'

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    isLoading
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl p-6 relative overflow-hidden">

                {/* Decorative Top Line (Gold Brand Color) */}
                <div className="absolute top-0 left-0 w-full h-1 bg-[#EAB308]"></div>

                {/* Icon */}
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-blue-500 text-2xl">
                        rocket_launch
                    </span>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-2">
                    {title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                    {message}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 px-4 py-3 bg-[#EAB308] hover:bg-[#EAB308]/90 text-black rounded-lg text-sm font-bold transition-all transform active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                                Traitement...
                            </>
                        ) : (
                            'Confirmer'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}