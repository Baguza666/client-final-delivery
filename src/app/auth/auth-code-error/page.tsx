'use client';
import Link from 'next/link';

export default function AuthErrorPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-surface-app text-center">
            <h1 className="text-4xl font-heading font-bold text-red-500 mb-4">
                Login Failed
            </h1>
            <p className="text-text-muted mb-8 max-w-md font-mono text-sm">
                No login code was found. This usually happens if:
                <br />1. You refreshed the page.
                <br />2. You clicked an expired link.
                <br />3. You opened the link in a different browser.
            </p>
            <Link
                href="/"
                className="px-8 py-3 bg-brand-gold text-surface-app font-bold rounded-sm hover:bg-white transition-colors uppercase tracking-wider"
            >
                Try Again
            </Link>
        </div>
    );
}