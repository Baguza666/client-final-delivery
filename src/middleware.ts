import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         * - /auth/callback (OAuth return route - CRITICAL!)
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - Static assets
         */
        '/((?!auth/callback|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}