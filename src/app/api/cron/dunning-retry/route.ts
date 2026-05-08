import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { recordRetryAttempt } from '@/lib/billing/dunning'
import type { SubscriptionRow } from '@/lib/billing/subscription'

// Vercel cron: configured in vercel.json to run daily at 02:00 UTC.
// Loops through subscriptions in dunning state whose next_retry_at has passed.

export async function GET(req: Request) {
    // Vercel cron sends an Authorization: Bearer <CRON_SECRET> header.
    const authHeader = req.headers.get('authorization') ?? ''
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } },
    )

    const now = new Date().toISOString()
    const { data: dueSubs, error } = await supabase
        .from('subscriptions')
        .select('*')
        .not('dunning_state', 'is', null)
        .neq('dunning_state', 'expired')
        .lte('next_retry_at', now) as { data: SubscriptionRow[] | null; error: { message: string } | null }

    if (error) {
        return new NextResponse(`Query error: ${error.message}`, { status: 500 })
    }

    const subs = dueSubs ?? []
    let processed = 0
    let exhausted = 0

    for (const sub of subs) {
        // Calling LS retry endpoint goes here once we have the API key + endpoint
        // confirmed. For now, just advance the local state machine — Lemon Squeezy
        // also retries internally based on its own dunning settings.
        const result = await recordRetryAttempt(supabase, sub)
        processed += 1
        if (result.exhausted) exhausted += 1
    }

    return NextResponse.json({ processed, exhausted })
}
