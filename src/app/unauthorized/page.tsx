'use client'

import { signout } from '@/app/auth/actions' // 👈 Import the server action

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-4">

            {/* Warning Icon */}
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-red-500 text-3xl">block</span>
            </div>

            <h1 className="text-4xl font-bold text-white mb-2">Accès Refusé</h1>

            <p className="text-zinc-500 mb-8 max-w-md text-sm leading-relaxed">
                Ce compte Google n'est pas autorisé à accéder au système IMSAL PRO.
                Veuillez vous déconnecter et utiliser votre compte professionnel.
            </p>

            {/* 👇 FIX: We use a Form to trigger the Server Action */}
            <form action={signout}>
                <button
                    type="submit"
                    className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Se Déconnecter
                </button>
            </form>
        </div>
    )
}