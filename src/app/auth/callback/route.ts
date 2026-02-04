import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    // 👇 FIX: Force the redirect to your PRODUCTION URL.
    // This ensures the cookie and the user land on the exact same domain.
    const host = 'https://app.imsalservices.ma'

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
                        } catch { }
                    },
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // ✅ SUCCESS: Redirect explicitly to https://app.imsalservices.ma
            return NextResponse.redirect(`${host}${next}`)
        }
    }

    // ❌ FAILURE: Redirect explicitly to login
    return NextResponse.redirect(`${host}/login?error=callback_failed`)
}