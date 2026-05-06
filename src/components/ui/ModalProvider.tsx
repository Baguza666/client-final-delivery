'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type ModalType = 'success' | 'error' | 'confirm' | 'info'

interface ModalOptions {
    title: string
    message: string
    type?: ModalType
    onConfirm?: () => void
    confirmText?: string
    cancelText?: string
}

interface ModalContextType {
    showModal: (options: ModalOptions) => void
    closeModal: () => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

function GlobalModal({ isOpen, options, onClose, onConfirm }: {
    isOpen: boolean
    options: ModalOptions | null
    onClose: () => void
    onConfirm: () => void
}) {
    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [isOpen, onClose])

    if (!isOpen || !options) return null

    const isError = options.type === 'error'
    const isSuccess = options.type === 'success'
    const isConfirm = options.type === 'confirm' || !options.type

    const iconColor = isError
        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        : isSuccess
            ? 'bg-status-paid/10 border-status-paid/20 text-status-paid'
            : 'bg-primary/10 border-primary/20 text-primary'

    const icon = isError ? 'error' : isSuccess ? 'check_circle' : isConfirm ? 'help' : 'info'

    const confirmBtnClass = isError
        ? 'bg-rose-500 hover:bg-rose-400 text-white'
        : isSuccess
            ? 'bg-status-paid hover:bg-status-paid/90 text-white'
            : 'bg-primary hover:bg-primary/90 text-white'

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                {/* Icon */}
                <div className="mb-4 flex justify-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${iconColor}`}>
                        <span className="material-symbols-outlined text-[28px]">{icon}</span>
                    </div>
                </div>

                <h3 className="text-lg font-bold text-white text-center mb-2">{options.title}</h3>
                <p className="text-zinc-400 text-center mb-7 text-sm leading-relaxed">{options.message}</p>

                <div className="flex gap-3 justify-center">
                    {isConfirm && (
                        <button
                            onClick={onClose}
                            className="flex-1 px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            {options.cancelText || 'Annuler'}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${confirmBtnClass}`}
                    >
                        {options.confirmText || 'OK'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export function ModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [options, setOptions] = useState<ModalOptions | null>(null)

    const showModal = (opts: ModalOptions) => {
        setOptions(opts)
        setIsOpen(true)
    }

    const closeModal = () => {
        setIsOpen(false)
        setTimeout(() => setOptions(null), 300)
    }

    const handleConfirm = () => {
        if (options?.onConfirm) options.onConfirm()
        closeModal()
    }

    return (
        <ModalContext.Provider value={{ showModal, closeModal }}>
            {children}
            <GlobalModal
                isOpen={isOpen}
                options={options}
                onClose={closeModal}
                onConfirm={handleConfirm}
            />
        </ModalContext.Provider>
    )
}

export function useModal() {
    const context = useContext(ModalContext)
    if (!context) throw new Error('useModal must be used within a ModalProvider')
    return context
}
