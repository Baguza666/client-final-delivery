'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Helper to create Supabase client with proper cookie handling
async function createClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } }
            }
        }
    )
}

export async function login(formData: FormData) {
    const supabase = await createClient()

    // 1. Get data from form
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // 2. Sign In
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: 'Identifiants invalides.' }
    }

    // 3. Redirect to Home (Dashboard)
    revalidatePath('/', 'layout')
    redirect('/') // 👈 FIX: Changed from '/dashboard' to '/'
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string

    // 1. Sign Up
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            // Save user's name immediately in metadata
            data: { full_name: name }
        }
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true, message: "Compte créé ! Vérifiez vos emails." }
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}