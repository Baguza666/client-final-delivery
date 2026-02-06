import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: { headers: request.headers },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({ request: { headers: request.headers } })
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
                },
            },
        }
    )

    // Refresh session
    const { data: { user } } = await supabase.auth.getUser()

    // EXCLUSION LIST: Add '/clients' here so Middleware doesn't block it
    const excludedPaths = ['/login', '/auth', '/clients'];
    const isExcluded = excludedPaths.some(path => request.nextUrl.pathname.startsWith(path));

    // PROTECTED ROUTES LOGIC
    if (!user && !isExcluded) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return response
}

export const config = {
    matcher: [
        // Exclude static files, images, etc.
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}