import Image from 'next/image'

type LogoProps = {
    variant?: 'full' | 'mark';
    className?: string;
    /** Unused — kept for API compatibility with any existing callers */
    monochrome?: boolean;
};

export default function Logo({ variant = 'full', className }: LogoProps) {
    if (variant === 'mark') {
        return (
            <Image
                src="/invoicify-favicon.png"
                alt="Invoicify"
                width={32}
                height={32}
                className={className ?? 'h-8 w-8 object-contain'}
                priority
            />
        )
    }

    return (
        <Image
            src="/invoicify-logo.png"
            alt="Invoicify"
            width={160}
            height={32}
            className={className ?? 'h-8 w-auto object-contain'}
            priority
        />
    )
}
