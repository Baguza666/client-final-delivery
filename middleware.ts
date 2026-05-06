import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that never require a session.
// Every other path (including /) is protected.
const PUBLIC_PATHS = [
    '/',                           // public marketing landing page
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
    '/auth/auth-code-error',
    '/view',                      // public share-link viewer
    '/unauthorized',
    '/api/share',                  // Public token-based PDF downloads
]

function isPublic(pathname: string): boolean {
    return PUBLIC_PATHS.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
}

export async function middleware(request: NextRequest) {
    // ── 1. Build a mutable response so we can forward refreshed cookies ──────
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // Write refreshed cookies into both the request (for
                    // downstream handlers) and the response (for the browser).
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value),
                    )
                    response = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options),
                    )
                },
            },
        },
    )

    // ── 2. Validate the session server-side ──────────────────────────────────
    // getUser() hits Supabase's /auth/v1/user endpoint and cryptographically
    // validates the JWT — safer than getSession() which only reads the cookie.
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl

    // ── 3. Routing rules ─────────────────────────────────────────────────────

    // Authenticated user on a public auth page → send home
    if (user && (pathname === '/login' || pathname === '/register')) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // Unauthenticated user on a protected page → send to login
    if (!user && !isPublic(pathname)) {
        const loginUrl = new URL('/login', request.url)
        // Preserve the intended destination so the callback can restore it
        loginUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // ── 4. Return response (with refreshed session cookies attached) ─────────
    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         *  - _next/static  (static files)
         *  - _next/image   (Next.js image optimiser)
         *  - favicon.ico
         *  - public folder files (svg, png, jpg, etc.)
         */
        '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
    ],
}
