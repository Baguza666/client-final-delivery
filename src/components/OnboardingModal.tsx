'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function OnboardingModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [fullName, setFullName] = useState('')
    const [role, setRole] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const checkProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single()
            if (profile && !profile.full_name) setIsOpen(true)
        }
        checkProfile()
    }, [])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { error: dbError } = await supabase
                .from('profiles')
                .update({ full_name: fullName, role: role || 'Fondateur' })
                .eq('id', user.id)
            if (dbError) {
                setError(dbError.message)
                setLoading(false)
                return
            }
            setIsOpen(false)
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
                {/* Top accent */}
                <div className="h-0.5 w-full bg-primary" />

                <div className="p-8">
                    {/* Icon + heading */}
                    <div className="text-center mb-8">
                        <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                            <span className="material-symbols-outlined text-[28px]">waving_hand</span>
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">
                            Bienvenue
                        </p>
                        <h2 className="text-2xl font-[800] tracking-tight text-white">
                            Configurons votre profil
                        </h2>
                        <p className="text-zinc-500 text-sm mt-1.5">
                            Ces informations apparaissent dans l'interface.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                                Nom complet <span className="text-rose-400">*</span>
                            </label>
                            <input
                                required
                                autoFocus
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="Hicham Zineddine"
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/60 transition-all placeholder:text-zinc-600"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                                Rôle / Titre
                            </label>
                            <input
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                placeholder="CEO, Manager, Fondateur…"
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/60 transition-all placeholder:text-zinc-600"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !fullName.trim()}
                            className="w-full bg-brand-gradient text-white font-bold py-3.5 rounded-xl transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                    Commencer
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
