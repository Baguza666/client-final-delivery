import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getOrCreateWorkspace } from '@/lib/workspace'
import FiscalInfoForm from '@/components/settings/FiscalInfoForm'

export const metadata = {
    title: 'Informations fiscales · Invoicify',
}

export default async function FiscalSettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const workspaceId = await getOrCreateWorkspace(supabase, user.id)
    const { data: workspace } = await supabase
        .from('workspaces')
        .select('id, name, address, city, country, phone, email, ice, tax_id, rc, cnss, tp, tax_regime, bank_name, rib')
        .eq('id', workspaceId)
        .single()

    return (
        <div className="max-w-3xl mx-auto px-4 py-10">
            <header className="mb-8">
                <h1 className="text-2xl font-bold">Informations fiscales</h1>
                <p className="text-sm text-white/60 mt-1">
                    Renseignez vos identifiants ICE, IF, RC pour que vos factures soient conformes.
                </p>
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3 text-xs text-amber-200">
                    Préparation à la facturation électronique DGI 2026.
                </div>
            </header>

            <FiscalInfoForm initial={workspace ?? null} />
        </div>
    )
}
