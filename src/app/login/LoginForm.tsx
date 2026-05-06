'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { login, signup } from '@/app/auth/actions'

const inputCls =
    'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/60 transition-all placeholder:text-zinc-600'

type Tab = 'login' | 'signup'

export default function LoginForm() {
    const searchParams  = useSearchParams()
    const next          = searchParams.get('next') || '/'
    const callbackError = searchParams.get('error')

    const [tab, setTab]       = useState<Tab>('login')
    const [loading, setLoading]     = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
        callbackError ? { type: 'error', text: 'Le lien de connexion a échoué. Réessayez.' } : null,
    )

    const supabase = useMemo(
        () => createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        ),
        [],
    )

    const handleGoogleLogin = async () => {
        setGoogleLoading(true)
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
                queryParams: { access_type: 'offline', prompt: 'consent' },
            },
        })
        setGoogleLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const fd = new FormData(e.currentTarget)
        fd.set('next', next)

        const result = tab === 'signup' ? await signup(fd) : await login(fd)

        // Only reached when the action returned (i.e. an error — success calls redirect()).
        setLoading(false)
        if (!result) return
        if ('error' in result && result.error) {
            setMessage({ type: 'error', text: result.error })
        } else if ('success' in result && result.success) {
            setMessage({ type: 'success', text: (result as any).message })
        }
    }

    return (
        <div className="min-h-screen bg-[#07070B] flex items-center justify-center relative overflow-hidden p-4">
            {/* Ambient orbs */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-40 -left-40 w-[700px] h-[700px] bg-primary/[0.04] rounded-full blur-[140px]" />
                <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-cyan-500/[0.04] rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/[0.02] rounded-full blur-[80px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="flex justify-center mb-8">
                    <Logo variant="full" className="h-9 w-auto" />
                </div>

                <div className="bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    <div className="p-8">
                        {/* Tab switcher */}
                        <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-xl p-1 mb-7">
                            {(['login', 'signup'] as Tab[]).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => { setTab(t); setMessage(null) }}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                        tab === t
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    {t === 'login' ? 'Connexion' : 'Inscription'}
                                </button>
                            ))}
                        </div>

                        {/* Google */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={googleLoading}
                            className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-3 mb-6 disabled:opacity-60"
                        >
                            {googleLoading ? (
                                <span className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    <span className="text-sm">Continuer avec Google</span>
                                </>
                            )}
                        </button>

                        {/* Divider */}
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/[0.06]" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-[#0D0D18] px-3 text-[10px] uppercase font-bold tracking-widest text-zinc-600">
                                    ou par email
                                </span>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-3">
                            {tab === 'signup' && (
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="Nom complet"
                                    autoComplete="name"
                                    className={inputCls}
                                />
                            )}
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="Adresse email"
                                autoComplete="email"
                                className={inputCls}
                            />
                            <input
                                name="password"
                                type="password"
                                required
                                minLength={tab === 'signup' ? 8 : undefined}
                                placeholder={tab === 'signup' ? 'Mot de passe (8 caractères min.)' : 'Mot de passe'}
                                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                                className={inputCls}
                            />

                            {message && (
                                <div className={`text-xs px-3 py-2.5 rounded-lg flex items-start gap-2 ${
                                    message.type === 'success'
                                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                        : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                                }`}>
                                    <span className="material-symbols-outlined text-[14px] shrink-0 mt-0.5">
                                        {message.type === 'success' ? 'check_circle' : 'error'}
                                    </span>
                                    {message.text}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">
                                            {tab === 'login' ? 'login' : 'person_add'}
                                        </span>
                                        {tab === 'login' ? 'Se connecter' : 'Créer mon compte'}
                                    </>
                                )}
                            </button>
                        </form>

                        {tab === 'login' && (
                            <p className="text-center mt-4">
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-zinc-500 hover:text-primary transition-colors"
                                >
                                    Mot de passe oublié ?
                                </Link>
                            </p>
                        )}
                    </div>
                </div>

                <p className="text-center text-zinc-700 text-[10px] mt-6 uppercase tracking-widest">
                    © {new Date().getFullYear()} Invoicify. Tous droits réservés.
                </p>
            </div>
        </div>
    )
}
