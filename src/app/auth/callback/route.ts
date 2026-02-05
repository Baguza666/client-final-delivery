import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/'

    // Debug logging
    console.log('=== AUTH CALLBACK ===')
    console.log('Code received:', code ? 'YES' : 'NO')
    console.log('Next path:', next)
    console.log('Request URL:', requestUrl.toString())

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
                                console.log('Setting cookie:', name)
                                cookieStore.set(name, value, options)
                            })
                        } catch (error) {
                            console.error('Cookie set error:', error)
                        }
                    },
                },
            }
        )

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        console.log('Exchange result:', error ? `ERROR: ${error.message}` : 'SUCCESS')
        console.log('Session user:', data?.user?.email ?? 'none')

        if (!error) {
            // Determine correct redirect URL
            const origin = requestUrl.origin
            const forwardedHost = request.headers.get('x-forwarded-host')
            const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

            let redirectUrl: string

            if (process.env.NODE_ENV === 'development') {
                redirectUrl = `${origin}${next}`
            } else if (forwardedHost) {
                // Production on Vercel
                redirectUrl = `${forwardedProto}://${forwardedHost}${next}`
            } else {
                redirectUrl = `${origin}${next}`
            }

            console.log('Redirecting to:', redirectUrl)

            return NextResponse.redirect(redirectUrl)
        } else {
            console.error('Auth exchange failed:', error.message)
        }
    } else {
        console.log('No code in URL')
    }

    // Fallback: redirect to login with error
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', 'callback_failed')
    return NextResponse.redirect(errorUrl.toString())
}