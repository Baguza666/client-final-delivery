import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getOrCreateWorkspace } from '@/lib/workspace'

async function createSupabaseClient() {
    const cookieStore = await cookies()
    return createServerClient(
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
                },
            },
        }
    )
}

// --- Invoice schemas ---

export const InvoiceItemSchema = z.object({
    description: z.string().min(1, 'La description est requise'),
    quantity: z.number().positive('La quantité doit être positive'),
    unit_price: z.number().nonnegative('Le prix unitaire ne peut pas être négatif'),
    tva_rate: z.number().min(0).max(100).default(20),
})

export type InvoiceItem = z.infer<typeof InvoiceItemSchema>

export const CreateInvoiceInputSchema = z.object({
    client_id: z.string().uuid('ID client invalide'),
    items: z.array(InvoiceItemSchema).min(1, 'Au moins un article est requis'),
    due_date: z.string().nullable().optional(),
    currency: z.string().default('MAD'),
    discount: z.number().min(0).max(100).default(0),
})

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>

function calculateInvoiceTotals(items: InvoiceItem[], discount: number) {
    const totalHT_Gross = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const discountRatio = totalHT_Gross > 0 ? (1 - discount / 100) : 1
    const totalHT_Net = totalHT_Gross * discountRatio
    const totalTVA = items.reduce((sum, item) => {
        const lineHT = item.quantity * item.unit_price * discountRatio
        return sum + lineHT * (item.tva_rate / 100)
    }, 0)
    const totalTTC = totalHT_Net + totalTVA
    return { totalHT_Gross, totalHT_Net, totalTVA, totalTTC }
}

// --- Client schemas ---

export const CreateClientInputSchema = z.object({
    name: z.string().min(1, 'Le nom est requis'),
    email: z.string().email('Email invalide').nullable().optional(),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    ice: z.string().nullable().optional(),
})

export type CreateClientInput = z.infer<typeof CreateClientInputSchema>

export async function createClientFromAI(
    raw: CreateClientInput
): Promise<{ clientId: string; name: string } | { error: string }> {
    const parsed = CreateClientInputSchema.safeParse(raw)
    if (!parsed.success) {
        return { error: parsed.error.issues.map((i) => i.message).join(', ') }
    }
    const data = parsed.data

    const supabase = await createSupabaseClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) return { error: 'Non authentifié.' }

    let workspaceId: string
    try {
        workspaceId = await getOrCreateWorkspace(supabase, authData.user.id)
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Espace de travail introuvable.' }
    }

    const { data: client, error } = await supabase
        .from('clients')
        .insert({
            workspace_id: workspaceId,
            name: data.name,
            email: data.email ?? null,
            phone: data.phone ?? null,
            address: data.address ?? null,
            city: data.city ?? null,
            ice: data.ice ?? null,
            type: 'client',
        })
        .select('id, name')
        .single()

    if (error) return { error: error.message }
    return { clientId: client.id, name: client.name }
}

export async function markInvoicePaidFromAI(
    invoiceId: string
): Promise<{ success: true; invoiceNumber: string } | { error: string }> {
    if (!invoiceId?.trim()) return { error: 'ID de facture manquant.' }

    const supabase = await createSupabaseClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) return { error: 'Non authentifié.' }

    let workspaceId: string
    try {
        workspaceId = await getOrCreateWorkspace(supabase, authData.user.id)
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Espace de travail introuvable.' }
    }

    const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('id, invoice_number, status')
        .eq('id', invoiceId)
        .eq('workspace_id', workspaceId) // IDOR guard
        .single()

    if (fetchError || !invoice) return { error: 'Facture introuvable ou accès refusé.' }
    if (invoice.status === 'paid') {
        return { error: `La facture ${invoice.invoice_number} est déjà marquée comme payée.` }
    }

    const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoiceId)
        .eq('workspace_id', workspaceId)

    if (updateError) return { error: updateError.message }

    revalidatePath('/invoices')
    revalidatePath('/dashboard')
    revalidatePath(`/invoices/${invoiceId}`)

    return { success: true, invoiceNumber: invoice.invoice_number }
}

export async function createInvoiceFromAI(
    raw: CreateInvoiceInput
): Promise<{ invoiceId: string; invoiceNumber: string } | { error: string }> {
    const parsed = CreateInvoiceInputSchema.safeParse(raw)
    if (!parsed.success) {
        return { error: parsed.error.issues.map((i) => i.message).join(', ') }
    }
    const data = parsed.data

    const supabase = await createSupabaseClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) return { error: 'Non authentifié.' }

    let workspaceId: string
    try {
        workspaceId = await getOrCreateWorkspace(supabase, authData.user.id)
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Espace de travail introuvable.' }
    }

    // Verify client belongs to this workspace (IDOR guard)
    const { data: clientCheck, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', data.client_id)
        .eq('workspace_id', workspaceId)
        .single()

    if (clientError || !clientCheck) return { error: 'Client introuvable ou accès refusé.' }

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    const today = new Date().toISOString().split('T')[0]
    const { totalHT_Gross, totalHT_Net, totalTVA, totalTTC } = calculateInvoiceTotals(data.items, data.discount)

    const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
            workspace_id: workspaceId,
            owner_id: authData.user.id,
            client_id: data.client_id,
            invoice_number: invoiceNumber,
            date: today,
            issue_date: today,
            due_date: data.due_date ?? null,
            status: 'draft',
            discount: data.discount,
            total_ht: totalHT_Gross,   // pre-discount HT, matches existing app convention
            total_tva: totalTVA,
            total_ttc: totalTTC,
            is_recurring: false,
            frequency: null,
            currency: data.currency,
            exchange_rate: 1,
        })
        .select('id, invoice_number')
        .single()

    if (invoiceError) return { error: `Erreur création facture: ${invoiceError.message}` }

    const { error: itemsError } = await supabase.from('invoice_items').insert(
        data.items.map((item) => ({
            invoice_id: invoice.id,
            description: item.description,
            unit: null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tva_rate: item.tva_rate,
            total: item.quantity * item.unit_price,
            original_price: null,
            base_currency: null,
            rate_snapshot: null,
        }))
    )

    if (itemsError) {
        // Roll back the orphaned invoice header so data stays consistent
        await supabase.from('invoices').delete().eq('id', invoice.id)
        return { error: `Erreur lignes de facture: ${itemsError.message}` }
    }

    revalidatePath('/invoices')
    revalidatePath('/dashboard')

    return { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number }
}
