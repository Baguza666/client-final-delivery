import { createHmac, timingSafeEqual } from 'crypto'
import type { Tier } from '@/lib/tiers'

// Variant ID lookup is configured at deploy time via env vars. Each tier ×
// cadence combination needs a Lemon Squeezy product variant.
//
// Required env vars (Vercel + .env.local):
//   LEMONSQUEEZY_API_KEY               — Lemon Squeezy v1 API key
//   LEMONSQUEEZY_STORE_ID              — store ID
//   LEMONSQUEEZY_WEBHOOK_SECRET        — for signature verification
//   LEMONSQUEEZY_VARIANT_PRO_MONTHLY   — variant ID for Pro / monthly
//   LEMONSQUEEZY_VARIANT_PRO_ANNUAL    — variant ID for Pro / annual
//   LEMONSQUEEZY_VARIANT_BUSINESS_MONTHLY
//   LEMONSQUEEZY_VARIANT_BUSINESS_ANNUAL

export type Cadence = 'monthly' | 'annual'

export interface CheckoutOptions {
    workspaceId: string
    tier: Exclude<Tier, 'free'>
    cadence: Cadence
    /** Email pre-fill on the LS checkout. */
    customerEmail?: string
    /** Discount code applied via the LS discount column (e.g. FOUNDER30). */
    discountCode?: string
}

function variantIdFor(tier: Exclude<Tier, 'free'>, cadence: Cadence): string {
    const key = `LEMONSQUEEZY_VARIANT_${tier.toUpperCase()}_${cadence.toUpperCase()}`
    const id = process.env[key]
    if (!id) throw new Error(`Missing env var ${key}`)
    return id
}

const LS_API = 'https://api.lemonsqueezy.com/v1'

function authHeader(): Record<string, string> {
    const key = process.env.LEMONSQUEEZY_API_KEY
    if (!key) throw new Error('Missing LEMONSQUEEZY_API_KEY')
    return {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${key}`,
    }
}

export async function createCheckout(opts: CheckoutOptions): Promise<{ url: string }> {
    const variantId = variantIdFor(opts.tier, opts.cadence)
    const storeId = process.env.LEMONSQUEEZY_STORE_ID
    if (!storeId) throw new Error('Missing LEMONSQUEEZY_STORE_ID')

    const body = {
        data: {
            type: 'checkouts',
            attributes: {
                checkout_data: {
                    email: opts.customerEmail,
                    discount_code: opts.discountCode,
                    custom: {
                        workspace_id: opts.workspaceId,
                        tier: opts.tier,
                        cadence: opts.cadence,
                    },
                },
                checkout_options: {
                    embed: false,
                    media: false,
                    logo: true,
                },
            },
            relationships: {
                store: { data: { type: 'stores', id: storeId } },
                variant: { data: { type: 'variants', id: variantId } },
            },
        },
    }

    const res = await fetch(`${LS_API}/checkouts`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`LS checkout failed: ${res.status} ${text}`)
    }
    const json = await res.json() as { data: { attributes: { url: string } } }
    return { url: json.data.attributes.url }
}

export async function cancelSubscription(providerSubscriptionId: string): Promise<void> {
    const res = await fetch(`${LS_API}/subscriptions/${providerSubscriptionId}`, {
        method: 'DELETE',
        headers: authHeader(),
    })
    if (!res.ok && res.status !== 204) {
        const text = await res.text()
        throw new Error(`LS cancel failed: ${res.status} ${text}`)
    }
}

export async function refundSubscription(providerSubscriptionId: string): Promise<void> {
    // Lemon Squeezy: refund is initiated via the latest order on the subscription.
    // The full procedure requires fetching order_id then POSTing /orders/:id/refund.
    // Implemented as a placeholder; production wiring lands once the LS account is live.
    const res = await fetch(`${LS_API}/subscriptions/${providerSubscriptionId}`, {
        method: 'GET',
        headers: authHeader(),
    })
    if (!res.ok) throw new Error(`LS subscription fetch failed: ${res.status}`)
    const sub = await res.json() as {
        data: { attributes: { order_id: string } }
    }
    const orderId = sub.data.attributes.order_id
    const refundRes = await fetch(`${LS_API}/orders/${orderId}/refund`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ data: { type: 'order-refunds' } }),
    })
    if (!refundRes.ok) {
        const text = await refundRes.text()
        throw new Error(`LS refund failed: ${refundRes.status} ${text}`)
    }
}

/**
 * HMAC-SHA256 signature verification for Lemon Squeezy webhooks.
 * Constant-time comparison.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
    if (!secret) return false
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    const sigBuf = Buffer.from(signature, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    return timingSafeEqual(sigBuf, expBuf)
}
