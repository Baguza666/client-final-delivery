import React from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import SettingsForm from '@/components/settings/SettingsForm'
import TeamManager from '@/components/settings/TeamManager'
import EmailSettingsForm from '@/components/settings/EmailSettingsForm'
import EmailSetupGuide from '@/components/settings/EmailSetupGuide'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const [
        { data: { user } },
        { data: profiles },
        { data: workspaceData },
        { data: invitations },
    ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('profiles').select('*'),
        supabase.from('workspaces').select('*').single(),
        supabase.from('team_invitations').select('*').order('created_at', { ascending: false }),
    ])

    const workspace = workspaceData || {}

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            {/* Header */}
            <header className="mb-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">
                    Configuration
                </p>
                <h1 className="text-2xl md:text-3xl font-[800] tracking-tight text-white">
                    Paramètres
                </h1>
                <p className="text-zinc-500 text-sm mt-1">
                    Gérez les informations de votre entreprise et les accès de l'équipe.
                </p>
            </header>

            <div className="max-w-4xl space-y-10">
                {/* Company settings */}
                <section>
                    <div className="mb-4">
                        <h2 className="text-base font-bold text-white">Entreprise</h2>
                        <p className="text-zinc-500 text-sm mt-0.5">
                            Ces informations apparaissent sur vos devis, bons de commande et factures.
                        </p>
                    </div>
                    <SettingsForm workspace={workspace} />
                </section>

                {/* Email / SMTP */}
                <section className="pt-6 border-t border-zinc-800/60">
                    <div className="mb-4">
                        <h2 className="text-base font-bold text-white">Email (SMTP)</h2>
                        <p className="text-zinc-500 text-sm mt-0.5">
                            Configurez votre serveur d'envoi pour les emails de facturation.
                        </p>
                    </div>
                    <EmailSetupGuide />
                    <div className="mt-6">
                        <EmailSettingsForm />
                    </div>
                </section>

                {/* Team */}
                <section className="pt-6 border-t border-zinc-800/60">
                    <div className="mb-4">
                        <h2 className="text-base font-bold text-white">Équipe</h2>
                        <p className="text-zinc-500 text-sm mt-0.5">
                            Gérez les membres de votre équipe et leurs permissions.
                        </p>
                    </div>
                    <TeamManager
                        profiles={profiles || []}
                        currentUserId={user?.id || ''}
                        invitations={invitations || []}
                    />
                </section>
            </div>
        </main>
    )
}
