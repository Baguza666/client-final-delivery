'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function createClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(c) {
                    try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { }
                },
            },
        },
    )
}

// Prevent open-redirect: only allow relative paths.
function safeRedirect(next: string | null | undefined): string {
    if (!next || !next.startsWith('/') || next.startsWith('//')) return '/'
    return next
}

// ─── Sign In ─────────────────────────────────────────────────────────────────
export async function login(formData: FormData) {
    const supabase = await createClient()
    const email    = formData.get('email')    as string
    const password = formData.get('password') as string
    const next     = safeRedirect(formData.get('next') as string)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
        return { error: 'Identifiants invalides. Vérifiez votre email et mot de passe.' }
    }

    revalidatePath('/', 'layout')
    redirect(next)
}

// ─── Sign Up ─────────────────────────────────────────────────────────────────
export async function signup(formData: FormData) {
    const supabase = await createClient()
    const email    = formData.get('email')    as string
    const password = formData.get('password') as string
    const name     = formData.get('name')     as string
    const next     = safeRedirect(formData.get('next') as string)

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
    })

    if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
            return { error: 'Un compte avec cet email existe déjà.' }
        }
        return { error: error.message }
    }

    // If email confirmation is disabled, Supabase sets a session immediately.
    if (data.session) {
        revalidatePath('/', 'layout')
        redirect(next)
    }

    // Email confirmation required — show success message.
    return {
        success: true,
        message: 'Compte créé ! Vérifiez votre boîte email pour confirmer votre adresse.',
    }
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

// ─── Forgot Password ──────────────────────────────────────────────────────────
export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()
    const email    = formData.get('email') as string

    // Resolve the app origin from the request headers (works in dev + prod).
    const headerStore = await headers()
    const origin =
        headerStore.get('origin') ??
        headerStore.get('referer')?.split('/').slice(0, 3).join('/') ??
        'http://localhost:3000'

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
    })

    if (error) return { error: error.message }
    return { success: true }
}

// ─── Reset Password ───────────────────────────────────────────────────────────
export async function resetPassword(formData: FormData) {
    const supabase = await createClient()
    const password  = formData.get('password')  as string
    const confirm   = formData.get('confirm')   as string

    if (password !== confirm) {
        return { error: 'Les mots de passe ne correspondent pas.' }
    }
    if (password.length < 8) {
        return { error: 'Le mot de passe doit contenir au moins 8 caractères.' }
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: error.message }

    revalidatePath('/', 'layout')
    redirect('/')
}
