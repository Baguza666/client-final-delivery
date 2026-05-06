'use client'

import { useState } from 'react'
import Logo from '@/components/ui/Logo'
import { resetPassword } from '@/app/auth/actions'

const inputCls =
    'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/60 transition-all placeholder:text-zinc-600'

export default function ResetPasswordPage() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)
        const fd = new FormData(e.currentTarget)
        const result = await resetPassword(fd)
        setLoading(false)
        if (result?.error) {
            setMessage({ type: 'error', text: result.error })
        }
        // On success, resetPassword calls redirect('/') — this line is never reached
    }

    return (
        <div className="min-h-screen bg-[#07070B] flex items-center justify-center relative overflow-hidden p-4">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="flex justify-center mb-8">
                    <Logo variant="full" className="h-9 w-auto" />
                </div>

                <div className="bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    <div className="p-8">
                        <div className="mb-7">
                            <h1 className="text-xl font-bold text-white">Nouveau mot de passe</h1>
                            <p className="text-zinc-500 text-sm mt-1">
                                Choisissez un mot de passe sécurisé d'au moins 8 caractères.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                name="password"
                                type="password"
                                required
                                minLength={8}
                                placeholder="Nouveau mot de passe"
                                autoComplete="new-password"
                                autoFocus
                                className={inputCls}
                            />
                            <input
                                name="confirm"
                                type="password"
                                required
                                minLength={8}
                                placeholder="Confirmer le mot de passe"
                                autoComplete="new-password"
                                className={inputCls}
                            />

                            {message && (
                                <div className="text-xs px-3 py-2.5 rounded-lg flex items-start gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20">
                                    <span className="material-symbols-outlined text-[14px] shrink-0 mt-0.5">error</span>
                                    {message.text}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                                        Réinitialiser le mot de passe
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <p className="text-center text-zinc-700 text-[10px] mt-6 uppercase tracking-widest">
                    © {new Date().getFullYear()} Invoicify. Tous droits réservés.
                </p>
            </div>
        </div>
    )
}
