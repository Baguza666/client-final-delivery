'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getSupabase() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } },
    )
}

export async function markInvoicePaid(invoiceId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await getSupabase()

    const { error } = await supabase.rpc('mark_invoice_paid', { invoice_id: invoiceId })

    if (error) return { success: false, error: error.message }

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath('/')
    return { success: true }
}
