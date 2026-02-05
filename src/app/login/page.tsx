'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [isSignUp, setIsSignUp] = useState(false)
    const [loading, setLoading] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [message, setMessage] = useState<string | null>(null)
    const router = useRouter()

    // Memoize Supabase client to prevent recreation
    const supabase = useMemo(
        () =>
            createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            ),
        []
    )

    // ✅ CRITICAL: Check if user is already logged in
    // This prevents the "stuck on login" loop
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // User is already authenticated, redirect to dashboard
                router.replace('/')
            } else {
                setCheckingAuth(false)
            }
        }
        checkUser()
    }, [supabase, router])

    // Listen for auth state changes (handles OAuth callback)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    router.replace('/')
                    router.refresh()
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [supabase, router])

    // 1. GOOGLE LOGIN
    const handleGoogleLogin = async () => {
        const origin = window.location.origin
        const redirectTo = `${origin}/auth/callback`

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })

        if (error) {
            setMessage(error.message)
        }
    }

    // 2. EMAIL LOGIN / SIGNUP
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setMessage(null)

        const formData = new FormData(event.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const name = formData.get('name') as string
        const origin = window.location.origin

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name },
                        emailRedirectTo: `${origin}/auth/callback`,
                    },
                })
                if (error) throw error
                setMessage('Compte créé ! Veuillez vérifier votre email.')
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                // The onAuthStateChange listener will handle redirect
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Une erreur est survenue.'
            setMessage(message)
        } finally {
            setLoading(false)
        }
    }

    // Show loading while checking auth
    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-[#EAB308] rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden font-['Inter']">
            {/* Ambient Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#EAB308]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md p-8 relative z-10">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <img src="/logo1.png" alt="IMSAL" className="h-16 w-auto object-contain" />
                </div>

                <div className="bg-zinc-900/30 border border-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-bold text-white text-center mb-2">
                        {isSignUp ? 'Créer un compte' : 'Bon retour'}
                    </h2>
                    <p className="text-zinc-500 text-xs text-center mb-6">
                        Gérez votre activité financière en toute sérénité
                    </p>

                    {/* GOOGLE BUTTON */}
                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3 mb-6"
                    >
                        <img
                            src="https://www.svgrepo.com/show/475656/google-color.svg"
                            alt="Google"
                            className="w-5 h-5"
                        />
                        <span className="text-sm">Continuer avec Google</span>
                    </button>

                    {/* Divider */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-700"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                            <span className="bg-zinc-900/50 backdrop-blur px-2 text-zinc-500">
                                Ou par email
                            </span>
                        </div>
                    </div>

                    {/* EMAIL FORM */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <div>
                                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                                    Nom Complet
                                </label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="Ex: Hicham Zineddine"
                                    className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-[#EAB308] focus:border-[#EAB308] outline-none transition-all placeholder:text-zinc-700 text-sm"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                                Email
                            </label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="nom@imsal.ma"
                                className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-[#EAB308] focus:border-[#EAB308] outline-none transition-all placeholder:text-zinc-700 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                                Mot de passe
                            </label>
                            <input
                                name="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-[#EAB308] focus:border-[#EAB308] outline-none transition-all placeholder:text-zinc-700 text-sm"
                            />
                        </div>

                        {message && (
                            <div
                                className={`text-xs text-center p-3 rounded-lg font-medium border ${message.includes('créé')
                                        ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                                        : 'text-red-400 border-red-500/20 bg-red-500/10'
                                    }`}
                            >
                                {message}
                            </div>
                        )}

                        <button
                            disabled={loading}
                            className="w-full bg-[#EAB308] hover:bg-[#EAB308]/90 text-black font-bold py-3.5 rounded-xl transition-all transform active:scale-[0.98] mt-2 flex justify-center items-center gap-2 shadow-lg shadow-yellow-900/20"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                            ) : (
                                <span>{isSignUp ? 'Créer mon compte' : 'Se Connecter'}</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp)
                                setMessage(null)
                            }}
                            className="text-zinc-500 hover:text-white text-xs transition-colors underline decoration-zinc-700 underline-offset-4"
                        >
                            {isSignUp
                                ? 'Vous avez déjà un compte ? Connectez-vous'
                                : 'Nouveau ? Créer un compte'}
                        </button>
                    </div>
                </div>

                <p className="text-center text-zinc-600 text-[10px] mt-8 uppercase tracking-widest">
                    © {new Date().getFullYear()} IMSAL SERVICES.
                </p>
            </div>
        </div>
    )
}