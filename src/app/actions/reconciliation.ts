'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { gateTier } from '@/lib/action-wrapper'

export async function markInvoicePaid(invoiceId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Non authentifié.' }

    const lock = await gateTier(supabase, user.id, 'pro', 'reconciliation')
    if (lock) return { success: false, error: lock.error }

    const { error } = await supabase.rpc('mark_invoice_paid', { invoice_id: invoiceId })

    if (error) return { success: false, error: error.message }

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath('/')
    return { success: true }
}
