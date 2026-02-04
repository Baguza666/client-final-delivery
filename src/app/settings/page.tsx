import React from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Sidebar from '@/components/Sidebar'
import SettingsForm from '@/components/settings/SettingsForm'

// Ensures the page fetches fresh data on every visit
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const cookieStore = await cookies()

    // Initialize Supabase client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name) => cookieStore.get(name)?.value
            }
        }
    )

    // Fetch the workspace (company/workspace details) from the database
    const { data: workspace } = await supabase
        .from('workspaces')
        .select('*')
        .single()

    return (
        <div className="bg-black min-h-screen text-white font-['Inter']">
            {/* Fixed Sidebar */}
            <div className="fixed left-0 top-0 h-screen z-20">
                <Sidebar />
            </div>

            {/* Main Content Area next to Sidebar */}
            <main className="ml-72 p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold">Paramètres de l'entreprise</h1>
                    <p className="text-zinc-400 mt-2">
                        Gérez les informations de votre entreprise qui apparaîtront sur vos documents.
                    </p>
                </header>

                <div className="max-w-4xl">
                    {/* The form that handles updating company details */}
                    <SettingsForm workspace={workspace} />
                </div>
            </main>
        </div>
    )
}