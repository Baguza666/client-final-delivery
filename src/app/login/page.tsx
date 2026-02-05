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

    const supabase = useMemo(
        () =>
            createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            ),
        []
    )

    // Check if user is already logged in
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                router.replace('/')
            } else {
                setCheckingAuth(false)
            }
        }
        checkUser()
    }, [supabase, router])

    // Listen for auth state changes
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

    const handleGoogleLogin = async () => {
        const origin = window.location.origin

        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })
    }

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
                setMessage('Compte créé ! Vérifiez votre email.')
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erreur inconnue'
            setMessage(msg)
        } finally {
            setLoading(false)
        }
    }

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-[#EAB308] rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden font-['Inter']">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#EAB308]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="flex justify-center mb-8">
                    <img src="/logo1.png" alt="IMSAL" className="h-16 w-auto object-contain" />
                </div>

                <div className="bg-zinc-900/30 border border-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-bold text-white text-center mb-2">
                        {isSignUp ? 'Créer un compte' : 'Bon retour'}
                    </h2>
                    <p className="text-zinc-500 text-xs text-center mb-6">
                        Gérez votre activité financière
                    </p>

                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3 mb-6"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                        <span className="text-sm">Continuer avec Google</span>
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-700"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                            <span className="bg-zinc-900/50 px-2 text-zinc-500">Ou par email</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <input
                                name="name"
                                type="text"
                                required
                                placeholder="Nom complet"
                                className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#EAB308]"
                            />
                        )}
                        <input
                            name="email"
                            type="email"
                            required
                            placeholder="Email"
                            className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#EAB308]"
                        />
                        <input
                            name="password"
                            type="password"
                            required
                            placeholder="Mot de passe"
                            className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#EAB308]"
                        />

                        {message && (
                            <div className={`text-xs p-3 rounded-lg ${message.includes('créé') ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                {message}
                            </div>
                        )}

                        <button
                            disabled={loading}
                            className="w-full bg-[#EAB308] text-black font-bold py-3.5 rounded-xl hover:bg-[#EAB308]/90 transition-all flex justify-center items-center"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                <span>{isSignUp ? 'Créer mon compte' : 'Se Connecter'}</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => { setIsSignUp(!isSignUp); setMessage(null) }}
                            className="text-zinc-500 hover:text-white text-xs underline"
                        >
                            {isSignUp ? 'Déjà un compte ? Connexion' : 'Nouveau ? Créer un compte'}
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