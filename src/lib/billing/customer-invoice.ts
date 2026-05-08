import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Atomically reserves the next sequential customer-invoice number for the year.
 * Backed by the next_customer_invoice_number(year) Postgres function which
 * uses a row-level lock on customer_invoice_counter to prevent gaps under
 * concurrent webhook deliveries.
 */
export async function generateNextInvoiceNumber(
    supabase: SupabaseClient,
    year: number = new Date().getUTCFullYear(),
): Promise<string> {
    const { data, error } = await supabase.rpc('next_customer_invoice_number', { p_year: year })
    if (error || !data) {
        throw new Error(`Failed to allocate customer invoice number: ${error?.message ?? 'no data'}`)
    }
    return data as string
}

interface MoneyLike {
    amount: number
    currency: string
}

interface LsPaymentSuccessEvent {
    meta: { event_name: string }
    data: {
        id: string
        attributes: Record<string, unknown>
    }
}

/**
 * Creates a Moroccan-format facture row for a given LS payment-success event.
 * - Looks up the workspace via subscriptions.provider_subscription_id.
 * - Allocates a gap-free invoice number.
 * - Inserts a customer_invoices row.
 * - PDF generation is deferred to a follow-up call (template lives in
 *   src/lib/pdf-templates/customer-facture.tsx); the row holds pdf_url=null
 *   until rendered.
 */
export async function generateCustomerInvoiceFromEvent(
    supabase: SupabaseClient,
    event: LsPaymentSuccessEvent,
): Promise<{ id: string; invoice_number: string } | null> {
    const a = event.data.attributes as Record<string, string | number>
    const providerSubscriptionId = String(event.data.id)

    const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, workspace_id, current_period_start, current_period_end')
        .eq('provider_subscription_id', providerSubscriptionId)
        .single<{
            id: string
            workspace_id: string
            current_period_start: string
            current_period_end: string
        }>()

    if (!sub) {
        console.error('[customer-invoice] no subscription for', providerSubscriptionId)
        return null
    }

    const lsEventId = String((a.id ?? a.order_id ?? `${providerSubscriptionId}-${a.created_at ?? Date.now()}`))

    // Bail out if a facture already exists for this LS event (defence in depth;
    // primary idempotency is the webhook_events table).
    const { data: existing } = await supabase
        .from('customer_invoices')
        .select('id, invoice_number')
        .eq('ls_event_id', lsEventId)
        .maybeSingle<{ id: string; invoice_number: string }>()
    if (existing) return existing

    const amountCents = Number(a.total ?? a.subtotal ?? 0)  // LS amounts are in cents
    const amountPaid = amountCents / 100
    const paidCurrency = String(a.currency ?? 'USD')

    // For MAD-charged subscriptions, amount_mad === amount_paid.
    // For USD-charged (fallback path), the bookkeeping facture still needs an MAD
    // value — captured here from custom data if present, else 0 (back-fill manually).
    const amountMad = paidCurrency === 'MAD'
        ? amountPaid
        : Number((a.custom_amount_mad as number | undefined) ?? amountPaid)

    const invoiceNumber = await generateNextInvoiceNumber(supabase)

    const { data: inserted, error } = await supabase
        .from('customer_invoices')
        .insert({
            workspace_id: sub.workspace_id,
            subscription_id: sub.id,
            ls_event_id: lsEventId,
            invoice_number: invoiceNumber,
            amount_mad: amountMad,
            amount_paid_currency: paidCurrency,
            amount_paid: amountPaid,
            period_start: sub.current_period_start,
            period_end: sub.current_period_end,
        })
        .select('id, invoice_number')
        .single<{ id: string; invoice_number: string }>()

    if (error) {
        throw new Error(`customer_invoice insert failed: ${error.message}`)
    }
    return inserted
}

export function formatMad(amount: number): string {
    return new Intl.NumberFormat('fr-MA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount) + ' MAD'
}

export type { MoneyLike }
