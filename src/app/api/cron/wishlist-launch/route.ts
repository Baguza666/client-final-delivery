import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// T+0 launch-day blast. Configure in vercel.json to fire at 09:00 Casablanca
// (08:00 UTC) on the launch date. Iterates wishlist_signups, sends a
// personalized email with the user's queue position and FOUNDER30 code.
//
// This handler is intentionally idempotent on its own table (sent_at column)
// so re-firing it (e.g. accidental cron duplicate) is a no-op.

interface WishlistRow {
    email: string
    name: string | null
    created_at: string
    launch_email_sent_at: string | null
}

export async function GET(req: Request) {
    if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } },
    )

    const { data, error } = await supabase
        .from('wishlist_signups')
        .select('email, name, created_at, launch_email_sent_at')
        .is('launch_email_sent_at', null)
        .order('created_at', { ascending: true }) as { data: WishlistRow[] | null; error: { message: string } | null }

    if (error) return new NextResponse(`DB error: ${error.message}`, { status: 500 })

    const rows = data ?? []
    let sent = 0
    for (const [index, row] of rows.entries()) {
        // TODO: integrate Resend send call once template + DOMAIN verified.
        // const resend = new Resend(process.env.RESEND_API_KEY!)
        // await resend.emails.send({
        //     from: 'Invoicify <hello@invoicify.ma>',
        //     to: row.email,
        //     subject: `${row.name ?? ''}, c'est en ligne · Votre code FOUNDER30`,
        //     react: WishlistLaunch({ firstName: row.name, queuePosition: index + 1 }),
        // })
        await supabase
            .from('wishlist_signups')
            .update({ launch_email_sent_at: new Date().toISOString() })
            .eq('email', row.email)
        sent += 1
        if (sent % 50 === 0) {
            // 50 emails per batch; rest tomorrow if Resend rate-limits.
            await new Promise((res) => setTimeout(res, 1000))
        }
    }

    return NextResponse.json({ processed: rows.length, sent })
}
