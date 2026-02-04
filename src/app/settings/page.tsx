import React from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Sidebar from '@/components/Sidebar'
import SettingsForm from '@/components/settings/SettingsForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    let { data: workspace } = await supabase.from('workspaces').select('*').single()

    // ✅ FALLBACK: If DB is empty, use your real data
    if (!workspace) {
        workspace = {
            name: "IMSAL SERVICES",
            address: "7 Lotis Najmat El Janoub",
            city: "El Jadida",
            country: "Maroc",
            phone: "+212(0)6 61 43 52 83",
            email: "i.assal@imsalservices.com",
            website: "Imsalservices.ma",
            ice: "002972127000089",
            rc: "19215",
            tax_id: "000081196000005",
            cnss: "5249290",
            tp: "43003134",
            bank_name: "BANK OF AFRICA",
            rib: "011170000008210000137110"
        }
    }

    return (
        <div className="bg-black min-h-screen text-white font-['Inter']">
            <div className="fixed left-0 top-0 h-screen z-20"><Sidebar /></div>
            <main className="ml-72 p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold">Paramètres de l'entreprise</h1>
                </header>
                <div className="max-w-4xl">
                    <SettingsForm workspace={workspace} />
                </div>
            </main>
        </div>
    )
}