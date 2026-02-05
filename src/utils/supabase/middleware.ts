import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    // Debug log
    console.log('=== MIDDLEWARE ===')
    console.log('Path:', request.nextUrl.pathname)

    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Refresh the auth token
    const {
        data: { user },
    } = await supabase.auth.getUser()

    console.log('User:', user?.email ?? 'NOT AUTHENTICATED')

    // Skip protection for auth routes
    if (request.nextUrl.pathname.startsWith('/auth')) {
        console.log('Skipping protection for /auth route')
        return supabaseResponse
    }

    // Redirect to login if not authenticated
    if (!user && !request.nextUrl.pathname.startsWith('/login')) {
        console.log('Redirecting to /login (not authenticated)')
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Redirect away from login if already authenticated
    if (user && request.nextUrl.pathname === '/login') {
        console.log('Redirecting to / (already authenticated)')
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}