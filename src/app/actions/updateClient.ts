'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function updateClient(formData: FormData) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    // Server actions are usually POST, cookies are read-only here unless middleware handles response
                },
            },
        }
    )

    const id = formData.get('id') as string
    if (!id) return { success: false, message: "ID manquant" }

    const updates = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        address: formData.get('address') as string,
        ice: formData.get('ice') as string,
    }

    const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)

    if (error) {
        console.error("Update Error:", error)
        return { success: false, message: error.message }
    }

    return { success: true }
}