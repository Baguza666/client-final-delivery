// ─── Static fallback rates: 1 foreign unit = X MAD ───────────────────────────
// Used when the live fetch has not yet resolved, fails, or there is no API key.
const STATIC_RATES: Record<string, number> = {
    MAD: 1,
    EUR: 10.8,
    USD: 9.85,
    GBP: 12.45,
    AED: 2.68,
}

// ─── Live rate cache ──────────────────────────────────────────────────────────
interface RateCache {
    rates: Record<string, number>
    fetchedAt: number
}

const CACHE_TTL_MS = 60 * 60 * 1_000   // 1 hour — stay within free-tier request limits
const FETCH_TIMEOUT_MS = 5_000          // abort if the API doesn't respond in 5 s

let cache: RateCache | null = null
let inflight: Promise<void> | null = null  // deduplicate concurrent callers

// ─── Core fetch ───────────────────────────────────────────────────────────────
async function fetchLiveRates(): Promise<void> {
    const apiKey = process.env.NEXT_PUBLIC_CURRENCY_API_KEY
    if (!apiKey) return   // no key → stay on static rates

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
        // ExchangeRate-API v6: returns "1 MAD = X <foreign>" ratios
        const res = await fetch(
            `https://v6.exchangerate-api.com/v6/${apiKey}/latest/MAD`,
            { signal: controller.signal }
        )
        clearTimeout(timeout)

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json() as {
            result: string
            conversion_rates: Record<string, number>
        }

        if (data.result !== 'success' || !data.conversion_rates) {
            throw new Error('Unexpected API shape')
        }

        // Invert: "1 MAD = X foreign" → "1 foreign = Y MAD"
        const live: Record<string, number> = { MAD: 1 }
        for (const [code, madRate] of Object.entries(data.conversion_rates)) {
            if (code !== 'MAD' && madRate > 0) live[code] = 1 / madRate
        }

        cache = { rates: live, fetchedAt: Date.now() }

    } catch (err) {
        clearTimeout(timeout)
        // Keep any previously-fetched cache if available; callers fall back to
        // STATIC_RATES when cache is null. Never throw — invoice creation must
        // never be blocked by a rate-fetch failure.
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[exchangeRates] Live fetch failed, using fallback:', err)
        }
    } finally {
        inflight = null
    }
}

// ─── Stale-while-revalidate helper ───────────────────────────────────────────
// Starts a background refresh if the cache is absent or older than CACHE_TTL_MS.
// Returns immediately so callers are never blocked.
function ensureFresh(): void {
    if (inflight) return                                              // already fetching
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return // still fresh
    inflight = fetchLiveRates()
}

// Eagerly prime the cache as soon as this module is first imported on the client.
// By the time the user picks a currency or selects a product, the live rates are
// almost certainly ready.
if (typeof window !== 'undefined') {
    inflight = fetchLiveRates()
}

// ─── Active rate map (live if available, static otherwise) ───────────────────
function activeRates(): Record<string, number> {
    ensureFresh()             // kick off a background refresh if stale
    return cache?.rates ?? STATIC_RATES
}

// ─── Public API (signatures unchanged — no callers need updating) ─────────────

/** How many MAD equal one unit of `currency`. Falls back to 1 for unknown codes. */
export function getDefaultRate(currency: string): number {
    return activeRates()[currency] ?? 1
}

/**
 * Convert `amount` from one currency to another, pivoting through MAD.
 * e.g. convertAmount(1000, 'MAD', 'EUR') → ~92.59
 */
export function convertAmount(amount: number, from: string, to: string): number {
    if (from === to) return amount
    const rates = activeRates()
    const inMAD = amount * (rates[from] ?? 1)
    return inMAD / (rates[to] ?? 1)
}

/** Human-readable rate label, e.g. "1 EUR = 10.80 MAD". Empty for MAD. */
export function getRateLabel(currency: string): string {
    if (currency === 'MAD') return ''
    return `1 ${currency} = ${getDefaultRate(currency).toFixed(2)} MAD`
}

/**
 * Explicit async initialiser — await this if you need the live rate to be
 * guaranteed-fresh before the first synchronous call (e.g. a test, or a
 * server-side use-case where the auto-init IIFE does not run).
 */
export async function initExchangeRates(): Promise<void> {
    if (inflight) return inflight
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return
    inflight = fetchLiveRates()
    return inflight
}

export const SUPPORTED_CURRENCIES = ['MAD', 'EUR', 'USD', 'GBP', 'AED'] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]
