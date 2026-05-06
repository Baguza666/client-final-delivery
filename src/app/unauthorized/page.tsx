'use client'

import { signout } from '@/app/auth/actions'
import Logo from '@/components/ui/Logo'

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-[#07070B] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/[0.03] rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md relative z-10 text-center">
                <div className="flex justify-center mb-8">
                    <Logo variant="full" className="h-9 w-auto" />
                </div>

                <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-8">
                    <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                        <span className="material-symbols-outlined text-rose-400 text-[28px]">block</span>
                    </div>

                    <h1 className="text-xl font-bold text-white mb-2">Accès refusé</h1>
                    <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
                        Ce compte n'est pas autorisé à accéder à Invoicify.
                        Déconnectez-vous et réessayez avec votre compte professionnel.
                    </p>

                    <form action={signout}>
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 bg-white hover:bg-zinc-100 text-zinc-900 font-bold px-6 py-3 rounded-xl transition-all text-sm"
                        >
                            <span className="material-symbols-outlined text-[18px]">logout</span>
                            Se déconnecter
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
