'use client';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isLoading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isLoading
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* BACKDROP BLUR */}
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            ></div>

            {/* MODAL CARD */}
            <div className="relative bg-[#1a1a1a] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl transform transition-all scale-100">

                {/* GOLD GLOW EFFECT */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>

                <div className="relative z-10">
                    {/* ICON */}
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary border border-primary/20">
                        <span className="material-symbols-outlined text-[24px]">warning</span>
                    </div>

                    {/* TEXT */}
                    <h3 className="text-white text-xl font-bold mb-2">{title}</h3>
                    <p className="text-text-secondary text-sm leading-relaxed mb-8">
                        {message}
                    </p>

                    {/* ACTIONS */}
                    <div className="flex items-center gap-3 justify-end">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                        >
                            Annuler
                        </button>

                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-black bg-gold-gradient shadow-[0_0_15px_rgba(244,185,67,0.2)] hover:shadow-[0_0_20px_rgba(244,185,67,0.4)] hover:scale-[1.02] transition-all disabled:opacity-70 flex items-center gap-2"
                        >
                            {isLoading && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                            Confirmer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}