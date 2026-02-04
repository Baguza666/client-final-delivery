'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type ModalType = 'success' | 'error' | 'confirm' | 'info';

interface ModalOptions {
    title: string;
    message: string;
    type?: ModalType;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
}

interface ModalContextType {
    showModal: (options: ModalOptions) => void;
    closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ModalOptions | null>(null);

    const showModal = (opts: ModalOptions) => {
        setOptions(opts);
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
        // Small delay to clear data after animation
        setTimeout(() => setOptions(null), 300);
    };

    const handleConfirm = () => {
        if (options?.onConfirm) options.onConfirm();
        closeModal();
    };

    return (
        <ModalContext.Provider value={{ showModal, closeModal }}>
            {children}

            {/* THE GLOBAL MODAL UI */}
            {isOpen && options && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200">

                        {/* Icon based on type */}
                        <div className="mb-4 flex justify-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${options.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                    options.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                        'bg-primary/10 border-primary/20 text-primary'
                                }`}>
                                <span className="material-symbols-outlined text-3xl">
                                    {options.type === 'error' ? 'error' :
                                        options.type === 'success' ? 'check_circle' :
                                            options.type === 'confirm' ? 'help' : 'info'}
                                </span>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white text-center mb-2">{options.title}</h3>
                        <p className="text-text-secondary text-center mb-8 text-sm leading-relaxed">
                            {options.message}
                        </p>

                        <div className="flex gap-3 justify-center">
                            {/* Show Cancel only if it's a confirmation or we want a close button */}
                            {(options.type === 'confirm' || !options.type) && (
                                <button
                                    onClick={closeModal}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white hover:bg-white/5 transition-colors"
                                >
                                    {options.cancelText || 'Annuler'}
                                </button>
                            )}

                            <button
                                onClick={handleConfirm}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold text-black transition-transform hover:scale-105 ${options.type === 'error' ? 'bg-red-500 hover:bg-red-400' : 'bg-gold-gradient'
                                    }`}
                            >
                                {options.confirmText || 'OK'}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
}

// Custom Hook to use it easily anywhere
export function useModal() {
    const context = useContext(ModalContext);
    if (!context) throw new Error('useModal must be used within a ModalProvider');
    return context;
}