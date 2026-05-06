'use client'

import Link from 'next/link'
import Logo from '@/components/ui/Logo'

export default function AuthErrorPage() {
    return (
        <div className="min-h-screen bg-[#07070B] flex items-center justify-center p-4">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/[0.03] rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md relative z-10 text-center">
                <div className="flex justify-center mb-8">
                    <Logo variant="full" className="h-9 w-auto" />
                </div>

                <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-8">
                    <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                        <span className="material-symbols-outlined text-rose-400 text-[28px]">link_off</span>
                    </div>

                    <h1 className="text-xl font-bold text-white mb-2">
                        Lien invalide ou expiré
                    </h1>
                    <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
                        Aucun code d'authentification n'a été trouvé. Cela arrive si le lien a expiré,
                        si vous l'avez ouvert dans un autre navigateur, ou si vous avez actualisé la page.
                    </p>

                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl transition-all text-sm"
                    >
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Retour à la connexion
                    </Link>
                </div>
            </div>
        </div>
    )
}
