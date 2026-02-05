'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [isSignUp, setIsSignUp] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const router = useRouter()

    // Initialize Supabase Client
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 1. GOOGLE LOGIN - Now Dynamic
    const handleGoogleLogin = async () => {
        // 👇 This automatically detects "https://client-final-delivery.vercel.app"
        const origin = window.location.origin
        const redirectTo = `${origin}/auth/callback`

        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectTo,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })
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
        const origin = window.location.origin // Get dynamic origin

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name },
                        // Dynamic redirect for email links too
                        emailRedirectTo: `${origin}/auth/callback`
                    }
                })
                if (error) throw error
                setMessage("Compte créé ! Veuillez vérifier votre email.")
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                })
                if (error) throw error
                router.push('/')
                router.refresh()
            }
        } catch (error: any) {
            setMessage(error.message || "Une erreur est survenue.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden font-['Inter']">
            <div className="w-full max-w-md p-8 relative z-10">
                <div className="flex justify-center mb-8">
                    <div className="relative h-16 flex items-center">
                        <img src="/logo1.png" alt="IMSAL" className="h-16 w-auto object-contain" />
                    </div>
                </div>

                <div className="bg-zinc-900/30 border border-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-bold text-white text-center mb-2">{isSignUp ? "Créer un compte" : "Bon retour"}</h2>

                    {/* GOOGLE BUTTON */}
                    <button onClick={handleGoogleLogin} type="button" className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3 mb-6">
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                        <span className="text-sm">Continuer avec Google</span>
                    </button>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <div><input name="name" required placeholder="Nom Complet" className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm" /></div>
                        )}
                        <div><input name="email" type="email" required placeholder="Email" className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm" /></div>
                        <div><input name="password" type="password" required placeholder="Mot de passe" className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm" /></div>

                        {message && <div className="text-xs text-white">{message}</div>}

                        <button disabled={loading} className="w-full bg-[#EAB308] text-black font-bold py-3.5 rounded-xl mt-2">
                            {loading ? '...' : (isSignUp ? "Créer mon compte" : "Se Connecter")}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button onClick={() => setIsSignUp(!isSignUp)} className="text-zinc-500 text-xs underline">
                            {isSignUp ? "Connexion" : "Créer un compte"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}