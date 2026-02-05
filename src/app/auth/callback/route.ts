import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

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
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // Cookie setting failed in Route Handler context
                        }
                    },
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Force a hard redirect to the dashboard after successful auth
            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'

            if (isLocalEnv) {
                // In development, use the origin from the URL
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                // In production (Vercel), use the forwarded host for proper domain
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                // Fallback to origin
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    // Error fallback: redirect to login with error param
    return NextResponse.redirect(`${origin}/login?error=callback_failed`)
}