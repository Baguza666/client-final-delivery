import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import RefundEdgeCaseForm from '@/components/billing/RefundEdgeCaseForm'

export const metadata = {
    title: 'Remboursement exceptionnel · Invoicify',
}

export default async function RefundEdgeCasePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
        <div className="max-w-2xl mx-auto px-4 py-10">
            <header className="mb-6">
                <h1 className="text-2xl font-bold">Demande de remboursement exceptionnel</h1>
                <p className="text-sm text-white/60 mt-2">
                    Hors fenêtre de garantie 30 jours. Cas particuliers étudiés au cas par cas :
                    cessation d&apos;activité, force majeure, panne de service prolongée.
                </p>
            </header>
            <RefundEdgeCaseForm />
        </div>
    )
}
