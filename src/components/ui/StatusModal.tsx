'use client'

import { useEffect } from 'react'

interface StatusModalProps {
    isOpen: boolean
    type: 'success' | 'error'
    message: string
    onClose: () => void
}

export default function StatusModal({ isOpen, type, message, onClose }: StatusModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-white/10 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center relative transform transition-all scale-100">

                {/* Icon */}
                <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                    <span className="material-symbols-outlined text-3xl">
                        {type === 'success' ? 'check_circle' : 'error'}
                    </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">
                    {type === 'success' ? 'Succès' : 'Erreur'}
                </h3>

                {/* Message */}
                <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
                    {message}
                </p>

                {/* Button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors uppercase text-sm tracking-wider"
                >
                    Compris
                </button>

            </div>
        </div>
    )
}