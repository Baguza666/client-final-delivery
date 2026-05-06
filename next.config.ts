import type { NextConfig } from "next";

const securityHeaders = [
    { key: 'X-Content-Type-Options',    value: 'nosniff' },
    { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
    { key: 'X-XSS-Protection',          value: '1; mode=block' },
    { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
        key: 'Content-Security-Policy',
        // 'unsafe-inline' is required by Next.js for its inline scripts/styles.
        // 'unsafe-eval' is required by Puppeteer's headless Chrome when running server-side.
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; '),
    },
]

const nextConfig: NextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '5mb',
        },
    },
    async headers() {
        return [
            {
                // Apply to all routes except the public share PDF route
                // (browsers need to render PDFs inline, frame-ancestors 'none' would block that)
                source: '/((?!api/share).*)',
                headers: securityHeaders,
            },
        ]
    },
}

export default nextConfig;
