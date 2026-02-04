'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// 1. CREATE NEW CLIENT
export async function createNewClient(formData: FormData) {
    const cookieStore = await cookies()

    // Connect to Supabase
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                }
            }
        }
    )

    // Get Current User (The Owner)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, message: "Vous devez être connecté." }
    }

    // Prepare Data
    const newClient = {
        owner_id: user.id, // 👈 CRITICAL: Links client to YOU
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        address: formData.get('address') as string,
        city: formData.get('city') as string,
        ice: formData.get('ice') as string,
        // workspace_id is optional now, so we can omit it
    }

    // Insert into DB
    const { error } = await supabase.from('clients').insert(newClient)

    if (error) {
        console.error("Supabase Create Error:", error)
        return { success: false, message: error.message }
    }

    // Refresh the page data
    revalidatePath('/clients')
    return { success: true, message: "Client créé avec succès !" }
}

// 2. UPDATE CLIENT
export async function updateClient(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    )

    const id = formData.get('id') as string

    const updates = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        city: formData.get('city'),
        ice: formData.get('ice'),
    }

    const { error } = await supabase.from('clients').update(updates).eq('id', id)

    if (error) return { success: false, message: error.message }

    revalidatePath('/clients')
    return { success: true }
}

// 3. DELETE CLIENT
export async function deleteClient(id: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    )

    await supabase.from('clients').delete().eq('id', id)
    revalidatePath('/clients')
}