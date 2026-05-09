'use server'

import { z } from 'zod'
import { Resend } from 'resend'
import { createClient } from '@/utils/supabase/server'
import { daysUntilLaunch, formattedLaunchDate } from '@/lib/launch-date'
import WishlistConfirmation from '@/../emails/WishlistConfirmation'

const InputSchema = z.object({
    email: z.string().email().max(254).transform(s => s.trim().toLowerCase()),
    name: z
        .string()
        .max(64)
        .transform(s => s.trim())
        .optional(),
    honeypot: z.string().max(0, 'bot'),
    turnstileToken: z.string().min(1, 'turnstile required'),
    source: z.string().max(64).optional(),
})

export type WishlistResult =
    | { ok: true }
    | { ok: false; error: string }

async function verifyTurnstile(token: string): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY
    if (!secret) {
        console.warn('[wishlist] TURNSTILE_SECRET_KEY missing — bypassing in dev')
        return process.env.NODE_ENV !== 'production'
    }
    try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret, response: token }).toString(),
            cache: 'no-store',
        })
        const json = (await res.json()) as { success?: boolean }
        return Boolean(json.success)
    } catch (e) {
        console.warn('[wishlist] turnstile verify threw', e)
        return false
    }
}

async function sendConfirmationEmail(args: {
    email: string
    firstName?: string
    position: number
}): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
        console.warn('[wishlist] RESEND_API_KEY missing — skipping confirmation email')
        return
    }
    const resend = new Resend(apiKey)
    const launchDateLabel = formattedLaunchDate()
    const days = daysUntilLaunch()
    const greeting = args.firstName ? `Bonjour ${args.firstName},` : 'Bonjour,'
    const plaintext = [
        greeting,
        '',
        `Merci de rejoindre la liste Invoicify. Le ${launchDateLabel} (dans ${days} jours), vous recevez votre lien d'accès — 48h avant tout le monde — et votre tarif fondateur reste figé : 50% de réduction sur le tarif Pro, tant que votre abonnement reste actif.`,
        '',
        `Vous êtes le ${args.position}e inscrit dans la file.`,
        '',
        "Une question rapide : qu'est-ce qui vous fait perdre le plus de temps dans votre facturation aujourd'hui ?",
        'Répondez directement à cet email — je lis chaque réponse personnellement.',
        '',
        'À très vite,',
        'Hicham — Fondateur, Invoicify',
        '',
        '—',
        'Vous recevez cet email car vous vous êtes inscrit à la liste d\'attente d\'Invoicify.',
        `Pour vous désinscrire, répondez "STOP" à cet email ou écrivez à hello@invoicify.ma.`,
        'Mentions légales : https://invoicify.ma/mentions-legales',
    ].join('\n')

    try {
        await resend.emails.send({
            from: 'Hicham — Invoicify <hello@invoicify.ma>',
            replyTo: 'hello@invoicify.ma',
            to: args.email,
            subject: 'Vous êtes inscrit. Votre tarif est gelé.',
            text: plaintext,
            react: WishlistConfirmation({
                firstName: args.firstName,
                position: args.position,
                daysUntilLaunch: days,
                launchDateLabel,
            }),
            headers: {
                'List-Unsubscribe': '<mailto:hello@invoicify.ma?subject=unsubscribe>',
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
        })
    } catch (e) {
        console.warn('[wishlist] confirmation email send failed', e)
    }
}

export async function createWishlistSignup(formData: FormData): Promise<WishlistResult> {
    const rawEmail = formData.get('email')
    const rawName = formData.get('name') ?? undefined
    const rawHoneypot = formData.get('company_url') ?? ''
    const rawToken = formData.get('cf-turnstile-response') ?? ''

    console.log('[wishlist] submit', {
        email: typeof rawEmail === 'string' ? rawEmail : '(non-string)',
        nameLen: typeof rawName === 'string' ? rawName.length : 0,
        honeypotLen: typeof rawHoneypot === 'string' ? rawHoneypot.length : -1,
        tokenLen: typeof rawToken === 'string' ? rawToken.length : -1,
    })

    const parsed = InputSchema.safeParse({
        email: rawEmail,
        name: typeof rawName === 'string' && rawName.length > 0 ? rawName : undefined,
        honeypot: rawHoneypot,
        turnstileToken: rawToken,
        source: formData.get('source') ?? undefined,
    })
    if (!parsed.success) {
        const issues = parsed.error.issues
        console.warn('[wishlist] parse failed', issues)
        const firstField = issues[0]?.path[0]
        let error = 'Email invalide.'
        if (firstField === 'turnstileToken') error = 'Vérification anti-spam non chargée. Rechargez la page.'
        else if (firstField === 'honeypot') error = 'Soumission rejetée.'
        else if (firstField === 'email') error = 'Adresse email invalide.'
        return { ok: false, error }
    }

    const { email, name, turnstileToken, source } = parsed.data

    const turnstileOk = await verifyTurnstile(turnstileToken)
    if (!turnstileOk) {
        console.warn('[wishlist] turnstile verify rejected')
        return { ok: false, error: 'Vérification anti-spam échouée. Réessayez.' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('upsert_wishlist_signup', {
        p_email: email,
        p_name: name ?? null,
        p_source: source ?? null,
    })
    if (error) {
        console.warn('[wishlist] upsert failed', error)
        return { ok: false, error: 'Une erreur est survenue. Réessayez dans un instant.' }
    }

    const row = Array.isArray(data) ? data[0] : data
    const position: number = Number(row?.queue_position ?? 0)
    const wasNew: boolean = Boolean(row?.was_new)

    if (wasNew) {
        await sendConfirmationEmail({ email, firstName: name, position })
    } else {
        console.log('[wishlist] duplicate signup — skipping email', { email, position })
    }

    return { ok: true }
}
