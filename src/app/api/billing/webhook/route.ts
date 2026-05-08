import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { verifyWebhookSignature } from '@/lib/billing/lemonsqueezy'
import { enterDunning } from '@/lib/billing/dunning'
import type { SubscriptionRow } from '@/lib/billing/subscription'
import type { Tier } from '@/lib/tiers'

interface LsWebhookEvent {
    meta: {
        event_name: string
        custom_data?: {
            workspace_id?: string
            tier?: Tier
            cadence?: 'monthly' | 'annual'
        }
    }
    data: {
        id: string                  // event id (provider's own)
        type: string                // 'subscriptions' or 'orders'
        attributes: Record<string, unknown>
    }
}

async function svcClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        // SERVICE_ROLE bypasses RLS — webhook must update tables that
        // restrict authenticated writes.
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } },
    )
}

export async function POST(req: Request) {
    const rawBody = await req.text()
    const signature = req.headers.get('x-signature') ?? ''

    if (!verifyWebhookSignature(rawBody, signature)) {
        return new NextResponse('Invalid signature', { status: 401 })
    }

    let event: LsWebhookEvent
    try {
        event = JSON.parse(rawBody) as LsWebhookEvent
    } catch {
        return new NextResponse('Invalid JSON', { status: 400 })
    }

    const supabase = await svcClient()
    const eventId = signatureBasedEventId(rawBody, signature)
    const eventName = event.meta.event_name

    // Idempotency: try to insert; on conflict, this is a duplicate delivery.
    const { error: insertErr } = await supabase
        .from('webhook_events')
        .insert({
            event_id: eventId,
            event_type: eventName,
            payload: event,
        })
    if (insertErr) {
        // duplicate key violation = already processed
        if (insertErr.code === '23505') {
            return NextResponse.json({ status: 'duplicate' })
        }
        return new NextResponse(`DB error: ${insertErr.message}`, { status: 500 })
    }

    try {
        switch (eventName) {
            case 'subscription_created':
                await handleSubscriptionCreated(supabase, event)
                break
            case 'subscription_updated':
                await handleSubscriptionUpdated(supabase, event)
                break
            case 'subscription_cancelled':
                await handleSubscriptionCancelled(supabase, event)
                break
            case 'subscription_expired':
                await handleSubscriptionExpired(supabase, event)
                break
            case 'subscription_payment_failed':
                await handleSubscriptionPaymentFailed(supabase, event)
                break
            case 'subscription_payment_success':
                await handleSubscriptionPaymentSuccess(supabase, event)
                break
            default:
                console.log(`[ls-webhook] unhandled event: ${eventName}`)
        }

        await supabase
            .from('webhook_events')
            .update({ processed_at: new Date().toISOString() })
            .eq('event_id', eventId)
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[ls-webhook] handler error for ${eventName}:`, msg)
        return new NextResponse(`Handler error: ${msg}`, { status: 500 })
    }

    revalidatePath('/billing')
    revalidatePath('/', 'layout')
    return NextResponse.json({ status: 'ok' })
}

function signatureBasedEventId(_body: string, signature: string): string {
    // LS does not put the event UUID in the body; the signature itself is unique
    // per-delivery and is what we use as the idempotency key. If LS later starts
    // including a header like X-Event-Id, prefer that.
    return signature
}

type AnyClient = Awaited<ReturnType<typeof svcClient>>

async function handleSubscriptionCreated(supabase: AnyClient, event: LsWebhookEvent) {
    const workspaceId = event.meta.custom_data?.workspace_id
    const tier = event.meta.custom_data?.tier
    const cadence = event.meta.custom_data?.cadence
    if (!workspaceId || !tier || !cadence) {
        throw new Error('subscription_created missing custom_data')
    }
    const a = event.data.attributes as Record<string, string>
    const now = new Date().toISOString()

    const { data: existing } = await supabase
        .from('workspaces')
        .select('tier_at_peak')
        .eq('id', workspaceId)
        .single<{ tier_at_peak: Tier }>()

    const { data: sub, error } = await supabase
        .from('subscriptions')
        .insert({
            workspace_id: workspaceId,
            tier,
            status: 'active',
            provider: 'lemonsqueezy',
            provider_subscription_id: String(event.data.id),
            provider_customer_id: a.customer_id ? String(a.customer_id) : null,
            cadence,
            first_paid_at: a.created_at ?? now,
            current_period_start: a.renews_at ? new Date(a.renews_at).toISOString() : now,
            current_period_end: a.renews_at ? new Date(a.renews_at).toISOString() : now,
        })
        .select()
        .single()
    if (error) throw new Error(error.message)

    const peak = peakTier(existing?.tier_at_peak, tier)
    await supabase.from('workspaces').update({
        tier,
        tier_at_peak: peak,
        subscription_id: sub.id,
    }).eq('id', workspaceId)
}

async function handleSubscriptionUpdated(supabase: AnyClient, event: LsWebhookEvent) {
    const a = event.data.attributes as Record<string, string>
    await supabase.from('subscriptions').update({
        status: mapLsStatus(a.status),
        current_period_start: a.renews_at ? new Date(a.renews_at).toISOString() : undefined,
        current_period_end: a.renews_at ? new Date(a.renews_at).toISOString() : undefined,
    }).eq('provider_subscription_id', String(event.data.id))
}

async function handleSubscriptionCancelled(supabase: AnyClient, event: LsWebhookEvent) {
    await supabase.from('subscriptions').update({
        cancel_at_period_end: true,
    }).eq('provider_subscription_id', String(event.data.id))
}

async function handleSubscriptionExpired(supabase: AnyClient, event: LsWebhookEvent) {
    const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, workspace_id')
        .eq('provider_subscription_id', String(event.data.id))
        .single<{ id: string; workspace_id: string }>()
    if (!sub) return
    await supabase.from('subscriptions').update({
        status: 'expired',
        dunning_state: 'expired',
    }).eq('id', sub.id)
    // tier_at_peak intentionally preserved → user retains read-only history.
    await supabase.from('workspaces').update({
        tier: 'free',
        subscription_id: null,
    }).eq('id', sub.workspace_id)
}

async function handleSubscriptionPaymentFailed(supabase: AnyClient, event: LsWebhookEvent) {
    const a = event.data.attributes as Record<string, string>
    const declineReason = a.failure_reason ?? null
    const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('provider_subscription_id', String(event.data.id))
        .single<SubscriptionRow>()
    if (!sub) return
    await enterDunning(supabase, sub, declineReason)
}

async function handleSubscriptionPaymentSuccess(supabase: AnyClient, event: LsWebhookEvent) {
    // Phase 6 hook — generate a customer-facing facture for this paid event.
    // Implementation lands in Phase 6; here we just clear dunning state if any.
    await supabase.from('subscriptions').update({
        status: 'active',
        decline_reason: null,
        dunning_state: null,
        next_retry_at: null,
        retry_attempts: 0,
    }).eq('provider_subscription_id', String(event.data.id))

    // Phase 6 generation step happens here.
    try {
        const { generateCustomerInvoiceFromEvent } = await import('@/lib/billing/customer-invoice')
        await generateCustomerInvoiceFromEvent(supabase, event)
    } catch (err) {
        console.error('[ls-webhook] customer invoice generation failed:', err)
        // Don't fail the webhook — facture generation is recoverable later.
    }
}

function peakTier(prev: Tier | undefined, next: Tier): Tier {
    const rank: Record<Tier, number> = { free: 0, pro: 1, business: 2 }
    if (!prev) return next
    return rank[next] >= rank[prev] ? next : prev
}

function mapLsStatus(s: string): 'active' | 'past_due' | 'cancelled' | 'expired' {
    switch (s) {
        case 'active':       return 'active'
        case 'past_due':
        case 'unpaid':       return 'past_due'
        case 'cancelled':    return 'cancelled'
        case 'expired':      return 'expired'
        default:             return 'active'
    }
}
