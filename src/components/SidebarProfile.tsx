'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { signout } from '@/app/auth/actions'

export default function SidebarProfile() {
    const [user, setUser] = useState<{ name: string; email: string } | null>(null)
    const [isOpen, setIsOpen] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilisateur'
                setUser({ name, email: user.email || '' })
            }
        }
        getUser()
    }, [supabase])

    if (!user) return <div className="h-14 bg-white/5 rounded-xl animate-pulse" />

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-zinc-900 p-3 rounded-xl flex items-center gap-3 border border-white/5 hover:bg-white/5 transition-colors text-left group"
            >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 border border-primary/20 group-hover:scale-105 transition-transform">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{user.name}</p>
                    <p className="text-xs text-zinc-500 truncate">Admin</p>
                </div>
                <span className={`material-symbols-outlined text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    expand_less
                </span>
            </button>

            {/* Pop-up Menu */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute bottom-full left-0 w-full mb-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 animate-in slide-in-from-bottom-2 fade-in duration-200">
                        <div className="px-4 py-3 border-b border-white/5">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Compte</p>
                            <p className="text-xs font-medium text-white truncate">{user.email}</p>
                        </div>
                        <button
                            onClick={() => signout()}
                            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-3 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">logout</span>
                            Déconnexion
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}