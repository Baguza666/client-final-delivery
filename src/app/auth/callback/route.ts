import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getOrCreateWorkspace } from '@/lib/workspace'

function safeNext(raw: string | null): string {
    if (!raw) return '/dashboard'
    if (raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('://')) {
        return raw
    }
    return '/dashboard'
}

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = safeNext(requestUrl.searchParams.get('next'))

    if (code) {
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set(name, value, options)
                            })
                        } catch { }
                    },
                },
            }
        )

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.user) {
            // Ensure workspace exists before first dashboard load.
            try {
                await getOrCreateWorkspace(supabase, data.user.id)
            } catch (e) {
                console.error('getOrCreateWorkspace failed in callback:', e)
            }

            const origin = requestUrl.origin
            const forwardedHost = request.headers.get('x-forwarded-host')
            const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

            let redirectUrl: string
            if (process.env.NODE_ENV === 'development') {
                redirectUrl = `${origin}${next}`
            } else if (forwardedHost) {
                redirectUrl = `${forwardedProto}://${forwardedHost}${next}`
            } else {
                redirectUrl = `${origin}${next}`
            }

            return NextResponse.redirect(redirectUrl)
        }
    }

    const errorUrl = new URL('/auth/auth-code-error', requestUrl.origin)
    return NextResponse.redirect(errorUrl.toString())
}
