'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { z } from 'zod'

const AddPaymentSchema = z.object({
    amount:       z.coerce.number().positive('Montant invalide'),
    payment_date: z.string().min(1, 'Date requise').regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),
    method:       z.string().max(50).optional().default('virement'),
    notes:        z.string().max(500).optional().nullable(),
})

async function createClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } }
            }
        }
    )
}

export async function addPayment(invoiceId: string, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    let workspaceId: string
    try {
        workspaceId = await getOrCreateWorkspace(supabase, user.id)
    } catch (e: unknown) {
        return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
    }

    const parsed = AddPaymentSchema.safeParse({
        amount:       formData.get('amount'),
        payment_date: formData.get('payment_date'),
        method:       formData.get('method') || 'virement',
        notes:        formData.get('notes') || null,
    })
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const { amount, payment_date, method, notes } = parsed.data

    // Return the inserted row so the client stores the real database id
    const { data: inserted, error: insertError } = await supabase
        .from('payments')
        .insert({ invoice_id: invoiceId, workspace_id: workspaceId, amount, payment_date, method, notes })
        .select('id, amount, payment_date, method, notes, created_at')
        .single()

    if (insertError || !inserted) return { error: insertError?.message ?? 'Erreur lors de l\'enregistrement' }

    // Recalculate invoice status based on all payments
    const { data: allPayments } = await supabase.from('payments').select('amount').eq('invoice_id', invoiceId)
    const totalPaid = (allPayments || []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0)

    const { data: invoice } = await supabase.from('invoices').select('total_ttc').eq('id', invoiceId).single()
    const totalTTC = Number(invoice?.total_ttc) || 0

    if (totalPaid >= totalTTC && totalTTC > 0) {
        await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoiceId)
    } else if (totalPaid > 0) {
        await supabase.from('invoices').update({ status: 'partial' }).eq('id', invoiceId)
    }

    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath('/invoices')
    return { payment: inserted }
}

export async function deletePayment(paymentId: string, invoiceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    let workspaceId: string
    try {
        workspaceId = await getOrCreateWorkspace(supabase, user.id)
    } catch (e: unknown) {
        return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
    }

    // Fetch the payment's real invoice_id from the database (workspace-scoped IDOR guard).
    // The client-supplied invoiceId parameter is intentionally NOT used for any write
    // operation — only the server-fetched value below is trusted.
    const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('invoice_id')
        .eq('id', paymentId)
        .eq('workspace_id', workspaceId)
        .single()

    if (fetchError || !payment) return { error: 'Paiement introuvable ou déjà supprimé' }

    const realInvoiceId = payment.invoice_id as string

    const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId)
        .eq('workspace_id', workspaceId)

    if (deleteError) return { error: deleteError.message }

    // Recalculate status using the server-fetched invoice id.
    const { data: allPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', realInvoiceId)

    const totalPaid = (allPayments || []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0)

    const { data: invoice } = await supabase
        .from('invoices')
        .select('total_ttc')
        .eq('id', realInvoiceId)
        .single()

    const totalTTC = Number(invoice?.total_ttc) || 0

    let newStatus = 'sent'
    if (totalPaid >= totalTTC && totalTTC > 0) newStatus = 'paid'
    else if (totalPaid > 0) newStatus = 'partial'

    await supabase.from('invoices').update({ status: newStatus }).eq('id', realInvoiceId)

    // Revalidate both the correct invoice page and any stale client-side path.
    revalidatePath(`/invoices/${realInvoiceId}`)
    if (invoiceId !== realInvoiceId) revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath('/invoices')
    return { success: true }
}
