import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 👇 DEFINE YOUR ALLOWED EMAILS HERE
const ALLOWED_EMAILS = [
    'hichamzineddine2@gmail.com',
    'nom@imsal.ma',
]

export async function middleware(request: NextRequest) {
    // 1. Initialize Response
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    try {
        // 2. SAFETY WRAPPER: Try to refresh the session
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                        response = NextResponse.next({ request: { headers: request.headers } })
                        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
                    },
                },
            }
        )

        // 3. Check Session
        const { data: { user }, error } = await supabase.auth.getUser()

        // If an error occurred (like missing keys), just stop checking and let the site load.
        if (error) {
            console.log("Middleware Auth Warning:", error.message)
            return response
        }

        // --- RULE 1: PROTECTED ROUTES ---
        if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/auth')) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // --- RULE 2: ALREADY LOGGED IN ---
        if (user && request.nextUrl.pathname.startsWith('/login')) {
            return NextResponse.redirect(new URL('/', request.url))
        }

        // --- RULE 3: SECURITY WHITELIST ---
        if (user && user.email && !ALLOWED_EMAILS.includes(user.email) && request.nextUrl.pathname !== '/unauthorized') {
            return NextResponse.redirect(new URL('/unauthorized', request.url))
        }

    } catch (e) {
        // ⚠️ CRASH PREVENTED
        // If anything above fails, we just log it and let the user proceed.
        // This stops the "500 Internal Server Error" screen.
        console.error("Middleware Crash Prevented:", e)
        return response
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}