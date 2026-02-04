import React from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Sidebar from '@/components/Sidebar'
import SettingsForm from '@/components/settings/SettingsForm'
import TeamManager from '@/components/settings/TeamManager'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name) => cookieStore.get(name)?.value
            }
        }
    )

    // 1. Fetch current user and all profiles for the TeamManager
    const [
        { data: { user } },
        { data: profiles },
        { data: workspaceData }
    ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('profiles').select('*'),
        supabase.from('workspaces').select('*').single()
    ])

    // 2. Hardcode IMSAL data overrides as requested
    const workspace = {
        ...(workspaceData || {}),
        name: "IMSAL SERVICES",
        address: "7 Lotis Najmat El Janoub",
        city: "El Jadida",
        country: "Maroc",
        phone: "+212(0)6 61 43 52 83",
        email: "i.assal@imsalservices.com",
        logo_url: "/logo.png", // Hardcoded logo
        ice: "002972127000089",
        rc: "19215",
        tax_id: "000081196000005",
        cnss: "5249290",
        tp: "43003134",
        bank_name: "BANK OF AFRICA",
        rib: "011170000008210000137110"
    }

    return (
        <div className="bg-black min-h-screen text-white font-['Inter']">
            <div className="fixed left-0 top-0 h-screen z-20">
                <Sidebar />
            </div>
            <main className="ml-72 p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold">Paramètres de l'entreprise</h1>
                </header>

                <div className="max-w-4xl space-y-12">
                    {/* Section 1: Company Settings */}
                    <section>
                        <SettingsForm workspace={workspace} />
                    </section>

                    {/* Section 2: Team Management */}
                    <section className="pt-8 border-t border-zinc-900">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold">Gestion de l'équipe</h2>
                            <p className="text-zinc-500 text-sm mt-1">
                                Gérez les membres de votre équipe et leurs permissions.
                            </p>
                        </div>
                        {/* ✅ Props passed to fix the TS error */}
                        <TeamManager
                            profiles={profiles || []}
                            currentUserId={user?.id || ''}
                        />
                    </section>
                </div>
            </main>
        </div>
    )
}