import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { TIERS, type Tier } from '@/lib/tiers'
import { getSubscription, isInMoneyBackWindow, daysUntilRenewal } from '@/lib/billing/subscription'
import BillingActions from '@/components/billing/BillingActions'

export const metadata = {
    title: 'Mon abonnement · Invoicify',
}

interface CustomerInvoiceRow {
    id: string
    invoice_number: string
    amount_mad: number
    period_start: string
    period_end: string
    pdf_url: string | null
    created_at: string
}

export default async function BillingPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const workspaceId = await getOrCreateWorkspace(supabase, user.id)
    const { data: workspace } = await supabase
        .from('workspaces')
        .select('tier, tier_at_peak, account_credit_mad')
        .eq('id', workspaceId)
        .single<{ tier: Tier; tier_at_peak: Tier; account_credit_mad: number }>()

    const tier = workspace?.tier ?? 'free'
    const subscription = await getSubscription(supabase, workspaceId)

    const { data: customerInvoices } = await supabase
        .from('customer_invoices')
        .select('id, invoice_number, amount_mad, period_start, period_end, pdf_url, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50)

    const inMoneyBack = subscription ? isInMoneyBackWindow(subscription) : false
    const daysLeft = subscription ? daysUntilRenewal(subscription) : 0

    return (
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
            <header>
                <h1 className="text-2xl font-bold">Mon abonnement</h1>
                <p className="text-sm text-white/60 mt-1">
                    Gérez votre plan, consultez vos factures, ou annulez à tout moment.
                </p>
            </header>

            {/* Plan card */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-white/40 mb-1">Plan actuel</p>
                        <h2 className="text-xl font-bold">{TIERS[tier].name}</h2>
                        {subscription && (
                            <p className="text-sm text-white/60 mt-2">
                                {subscription.cadence === 'annual' ? 'Annuel' : 'Mensuel'} ·
                                {' '}prochain renouvellement le{' '}
                                {new Date(subscription.current_period_end).toLocaleDateString('fr-MA')}
                                {' '}({daysLeft} jour{daysLeft > 1 ? 's' : ''})
                            </p>
                        )}
                        {inMoneyBack && (
                            <p className="text-xs text-emerald-400 mt-2">
                                ✓ Garantie 30 jours active — annulation = remboursement complet
                            </p>
                        )}
                        {workspace?.account_credit_mad ? (
                            <p className="text-xs text-amber-400 mt-2">
                                Crédit disponible : {workspace.account_credit_mad.toFixed(2)} MAD
                                (utilisé au prochain renouvellement)
                            </p>
                        ) : null}
                    </div>
                    <div className="flex flex-col gap-2 items-stretch min-w-[180px]">
                        {tier === 'free' ? (
                            <Link
                                href="/pricing"
                                className="rounded-xl bg-primary hover:bg-primary/90 text-black px-4 py-2.5 font-semibold text-sm text-center transition"
                            >
                                Découvrir Pro
                            </Link>
                        ) : (
                            <BillingActions
                                tier={tier}
                                inMoneyBack={inMoneyBack}
                                periodEnd={subscription?.current_period_end ?? null}
                                cancelAtPeriodEnd={subscription?.cancel_at_period_end ?? false}
                            />
                        )}
                    </div>
                </div>
            </section>

            {/* Customer factures */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <h2 className="text-lg font-bold mb-1">Factures Invoicify</h2>
                <p className="text-sm text-white/50 mb-4">
                    Factures marocaines auto-émises pour votre comptabilité (format auto-entrepreneur).
                </p>
                {!customerInvoices || customerInvoices.length === 0 ? (
                    <p className="text-sm text-white/40 italic">Aucune facture pour le moment.</p>
                ) : (
                    <ul className="divide-y divide-white/5">
                        {(customerInvoices as CustomerInvoiceRow[]).map((row) => (
                            <li key={row.id} className="py-3 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-mono">{row.invoice_number}</p>
                                    <p className="text-xs text-white/50 mt-0.5">
                                        {new Date(row.period_start).toLocaleDateString('fr-MA')} →{' '}
                                        {new Date(row.period_end).toLocaleDateString('fr-MA')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold">{row.amount_mad.toFixed(2)} MAD</p>
                                    {row.pdf_url ? (
                                        <a
                                            href={row.pdf_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-primary hover:underline"
                                        >
                                            Télécharger PDF
                                        </a>
                                    ) : (
                                        <span className="text-xs text-white/30">PDF en préparation</span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Edge-case refund */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <h2 className="text-lg font-bold mb-1">Cas particuliers</h2>
                <p className="text-sm text-white/60 mb-3">
                    Cessation d&apos;activité, force majeure, panne de service prolongée — soumettez une demande
                    et notre équipe vous répond sous 24h.
                </p>
                <Link
                    href="/billing/refund"
                    className="inline-block rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm font-medium transition"
                >
                    Demander un remboursement exceptionnel
                </Link>
            </section>
        </div>
    )
}
