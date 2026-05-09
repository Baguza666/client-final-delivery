'use client'

import { useState } from 'react'
import Script from 'next/script'
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { createWishlistSignup } from '@/app/actions/createWishlistSignup'

type Props = {
    source: 'hero' | 'final-cta'
    variant?: 'default' | 'final'
}

export default function WishlistForm({ source, variant = 'default' }: Props) {
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (status === 'submitting') return
        setStatus('submitting')
        setErrorMsg('')
        const form = e.currentTarget
        const formData = new FormData(form)
        formData.set('source', source)
        const result = await createWishlistSignup(formData)
        if (result.ok) {
            setStatus('success')
        } else {
            setStatus('error')
            setErrorMsg(result.error)
            const w = (window as unknown as { turnstile?: { reset: () => void } }).turnstile
            if (w?.reset) w.reset()
        }
    }

    if (status === 'success') {
        return (
            <div
                role="status"
                className={`flex items-start gap-3 rounded-2xl border border-status-paid/30 bg-status-paid/[0.06] px-5 py-4 text-left ${variant === 'final' ? 'mx-auto max-w-md' : ''}`}
            >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-paid" />
                <p className="text-sm text-white/80">
                    Vous êtes inscrit. Votre tarif fondateur est gelé. On vous envoie votre lien d&apos;accès le jour du lancement.
                </p>
            </div>
        )
    }

    const inputsRowClass =
        variant === 'final'
            ? 'flex flex-col gap-3'
            : 'flex flex-col gap-3 sm:flex-row sm:gap-2'

    return (
        <>
            {siteKey ? (
                <Script
                    id="cf-turnstile-script"
                    src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                    strategy="afterInteractive"
                    async
                    defer
                />
            ) : null}

            <form
                onSubmit={handleSubmit}
                className={`flex w-full flex-col gap-3 ${variant === 'final' ? 'mx-auto max-w-md' : ''}`}
                noValidate
            >
                <input
                    type="text"
                    name="company_url"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="hidden"
                />

                <input
                    type="text"
                    name="name"
                    autoComplete="given-name"
                    maxLength={64}
                    placeholder="Prénom (optionnel)"
                    disabled={status === 'submitting'}
                    className="rounded-2xl border border-white/[0.10] bg-white/[0.04] px-5 py-3 text-base text-white placeholder:text-white/30 outline-none transition-colors focus:border-primary/60 focus:bg-white/[0.06] disabled:opacity-50"
                />

                <div className={inputsRowClass}>
                    <input
                        type="email"
                        name="email"
                        required
                        autoComplete="email"
                        placeholder="vous@entreprise.ma"
                        disabled={status === 'submitting'}
                        className="flex-1 rounded-2xl border border-white/[0.10] bg-white/[0.04] px-5 py-3.5 text-base text-white placeholder:text-white/30 outline-none transition-colors focus:border-primary/60 focus:bg-white/[0.06] disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3.5 text-base font-bold text-white shadow-glow transition-all duration-200 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {status === 'submitting' ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Envoi…
                            </>
                        ) : (
                            <>
                                {variant === 'final' ? 'Je réserve mon tarif' : 'Réserver mon tarif'}
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </>
                        )}
                    </button>
                </div>

                {siteKey ? (
                    <div
                        className="cf-turnstile flex justify-center"
                        data-sitekey={siteKey}
                        data-theme="dark"
                        data-size="flexible"
                    />
                ) : null}
            </form>

            {status === 'error' ? (
                <p role="alert" className="mt-2 text-sm text-status-overdue">
                    {errorMsg}
                </p>
            ) : null}
        </>
    )
}
