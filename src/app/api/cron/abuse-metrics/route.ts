import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Weekly abuse-signal aggregation. Surfaces:
// - workspaces sharing a single signup_ip
// - signup_email_domain clusters (gmail aliases used to farm free tier)
// - "ghost" workspaces created with no invoice in 14 days
//
// Trigger threshold (Phase 9 phone-gate decision): >10% abuse rate.

interface IpRow { signup_ip: string | null; count: number }
interface DomainRow { signup_email_domain: string | null; count: number }

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

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id, signup_ip, signup_email_domain, created_at')
        .gte('created_at', sevenDaysAgo) as {
            data: { id: string; signup_ip: string | null; signup_email_domain: string | null; created_at: string }[] | null
        }

    const ipMap = new Map<string, number>()
    const domainMap = new Map<string, number>()
    for (const w of workspaces ?? []) {
        if (w.signup_ip) ipMap.set(w.signup_ip, (ipMap.get(w.signup_ip) ?? 0) + 1)
        if (w.signup_email_domain) {
            domainMap.set(w.signup_email_domain, (domainMap.get(w.signup_email_domain) ?? 0) + 1)
        }
    }

    const ipClusters: IpRow[] = Array.from(ipMap.entries())
        .map(([signup_ip, count]) => ({ signup_ip, count }))
        .filter((row) => row.count >= 3)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)

    const domainClusters: DomainRow[] = Array.from(domainMap.entries())
        .map(([signup_email_domain, count]) => ({ signup_email_domain, count }))
        .filter((row) => row.count >= 3)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const { count: ghostCount } = await supabase
        .from('workspaces')
        .select('id', { count: 'exact', head: true })
        .lte('created_at', fourteenDaysAgo)
        .not('id', 'in', `(select workspace_id from invoices)`) // best-effort; relies on RLS service-role bypass

    const summary = {
        windowDays: 7,
        totalWorkspacesInWindow: workspaces?.length ?? 0,
        ipClusters,
        domainClusters,
        ghostWorkspaces14d: ghostCount ?? 0,
    }

    // TODO: send summary email to founder via Resend.
    return NextResponse.json(summary)
}
