'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// --- UPDATE STATUS ---
export async function updateStatus(table: string, id: string, status: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const { error } = await supabase
        .from(table)
        .update({ status })
        .eq('id', id)

    if (error) throw new Error(error.message)

    // Refresh the page data
    revalidatePath(`/${table.replace('_', '-')}`)
    revalidatePath(`/${table.replace('_', '-')}/${id}`)
}

// --- DELETE DOCUMENT ---
export async function deleteDocument(table: string, id: string, redirectPath: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)

    redirect(redirectPath)
}