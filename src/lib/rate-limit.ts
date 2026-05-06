import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Bypass gracefully when Upstash env vars are absent (local dev without keys)
const url   = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

let pdfRatelimit: Ratelimit | null = null

if (url && token) {
    const redis = new Redis({ url, token })
    pdfRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        prefix:  'rl:pdf',
    })
} else {
    console.warn('[rate-limit] UPSTASH_REDIS_REST_URL / TOKEN not set — rate limiting disabled')
}

export { pdfRatelimit }
