import Link from 'next/link';
import type { ReactNode } from 'react';

interface EmptyStateProps {
    icon: string;
    title: string;
    description?: string;
    ctaHref?: string;
    ctaLabel?: string;
    children?: ReactNode;
}

export default function EmptyState({ icon, title, description, ctaHref, ctaLabel, children }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                <span className="material-symbols-outlined text-3xl">{icon}</span>
            </div>
            <h3 className="text-white font-semibold text-base">{title}</h3>
            {description && <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">{description}</p>}
            {ctaHref && ctaLabel && (
                <Link
                    href={ctaHref}
                    className="mt-2 bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-5 rounded-lg text-sm transition-colors inline-flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-base">add</span>
                    {ctaLabel}
                </Link>
            )}
            {children}
        </div>
    );
}
