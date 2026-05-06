// ─── Static fallback rates: 1 foreign unit = X MAD ───────────────────────────
// Used whenever the live fetch has not yet resolved, fails, or there is no key.
export const STATIC_RATES: Record<string, number> = {
    MAD: 1,
    EUR: 10.8,
    USD: 9.85,
    GBP: 12.45,
    AED: 2.68,
}

export const SUPPORTED_CURRENCIES = ['MAD', 'EUR', 'USD', 'GBP', 'AED'] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

// ─── Live rate cache ──────────────────────────────────────────────────────────
let liveRates: Record<string, number> | null = null
let fetchedAt = 0
let inflight: Promise<void> | null = null

// Matches the Next.js revalidate window so the in-memory and data-cache clocks
// stay in sync (both expire after 24 hours).
const CACHE_MS    = 86_400_000
const TIMEOUT_MS  = 5_000

async function fetchLiveRates(): Promise<void> {
    const apiKey = process.env.NEXT_PUBLIC_CURRENCY_API_KEY
    if (!apiKey) return   // no key → stay on static rates silently

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
        // `next: { revalidate }` is a Next.js extension to the fetch API.
        // On the server, Next.js stores the response in its Data Cache for 24 h
        // so subsequent server renders never hit the network again within that window.
        // On the client, the browser's fetch ignores the unknown `next` property.
        const res = await fetch(
            `https://v6.exchangerate-api.com/v6/${apiKey}/latest/MAD`,
            {
                signal: controller.signal,
                next: { revalidate: 86400 },
            } as RequestInit,
        )
        clearTimeout(timeout)

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json() as {
            result: string
            conversion_rates: Record<string, number>
        }

        if (data.result !== 'success' || !data.conversion_rates) {
            throw new Error('Unexpected API response shape')
        }

        // API returns "1 MAD = X foreign". Invert to "1 foreign = Y MAD".
        const rates: Record<string, number> = { MAD: 1 }
        for (const [code, madRate] of Object.entries(data.conversion_rates)) {
            if (code !== 'MAD' && madRate > 0) rates[code] = 1 / madRate
        }

        liveRates = rates
        fetchedAt = Date.now()
    } catch {
        // Strict fallback: never throw, never block document creation.
        // STATIC_RATES are returned by activeRates() whenever liveRates is null.
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[currency] Live rate fetch failed — using static fallback.')
        }
    } finally {
        clearTimeout(timeout)
        inflight = null
    }
}

// ─── Stale-while-revalidate ───────────────────────────────────────────────────
function ensureFresh(): void {
    if (inflight) return                                              // already fetching
    if (liveRates && Date.now() - fetchedAt < CACHE_MS) return       // still fresh
    inflight = fetchLiveRates()
}

// Eagerly prime the cache as soon as this module is first imported on the client.
// By the time the user selects a product the live rates are almost certainly ready.
if (typeof window !== 'undefined') {
    inflight = fetchLiveRates()
}

// ─── Best-available rate map ──────────────────────────────────────────────────
// Returns live rates if already fetched; STATIC_RATES otherwise.
// Also kicks off a background refresh if the cache has gone stale.
function activeRates(): Record<string, number> {
    ensureFresh()
    return liveRates ?? STATIC_RATES
}

// ─── Public API ───────────────────────────────────────────────────────────────
// All functions remain synchronous — React event handlers are never awaited.
// On the very first call (before the background fetch completes) STATIC_RATES
// are used; on all subsequent calls the live rates are already in the cache.

/** How many MAD equal one unit of `currency`. Returns 1 for unknown codes. */
export function getStaticRate(currency: string): number {
    return activeRates()[currency] ?? 1
}

/**
 * Convert `amount` from one currency to another, pivoting through MAD.
 * Uses live rates when available; STATIC_RATES as fallback.
 * e.g. convertStatic(100, 'EUR', 'MAD') → ~1 078 (live) or 1 080 (static)
 */
export function convertStatic(amount: number, from: string, to: string): number {
    if (from === to) return amount
    const rates = activeRates()
    return (amount * (rates[from] ?? 1)) / (rates[to] ?? 1)
}

/**
 * Returns true when a product and document are in different currencies
 * and a price conversion must be applied. Pure logic — no rate lookup needed.
 */
export function needsConversion(
    productCurrency: string | null | undefined,
    docCurrency: string,
): boolean {
    return (productCurrency || 'MAD') !== (docCurrency || 'MAD')
}

/**
 * The multiplier applied when converting 1 unit of `prodCurrency` into
 * `docCurrency`. Frozen into `rate_snapshot` on the invoice item at selection
 * time so historical documents are never affected by future rate changes.
 * Uses live rates when available.
 * e.g. EUR → MAD ≈ 10.78 (live) or 10.80 (static)
 */
export function conversionRate(prodCurrency: string, docCurrency: string): number {
    return getStaticRate(prodCurrency) / getStaticRate(docCurrency)
}

/**
 * Explicit async initialiser — await this on the server when you need a
 * guaranteed-fresh rate before the first synchronous call (e.g. a server
 * action or page that displays the current rate). Client code never needs this.
 */
export async function initCurrency(): Promise<void> {
    if (inflight) return inflight
    if (liveRates && Date.now() - fetchedAt < CACHE_MS) return
    inflight = fetchLiveRates()
    return inflight
}
