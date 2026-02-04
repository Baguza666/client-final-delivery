'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// --- HELPER: Create Supabase Client ---
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

// --- 1. CREATE INVOICE ---
export async function createInvoice(formData: FormData) {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    const user = authData?.user

    if (authError || !user) return { error: "Non connecté" }

    const { data: workspace } = await supabase.from('workspaces').select('id').eq('owner_id', user.id).single()
    if (!workspace) return { error: "Espace de travail introuvable" }

    const clientId = formData.get('client_id')
    const date = formData.get('date')
    const dueDate = formData.get('due_date')
    const status = formData.get('status') || 'draft'
    let number = formData.get('number') as string

    // ✅ Extract Discount
    const discount = Number(formData.get('discount')) || 0

    if (!number || number.trim() === '') {
        number = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    }

    const itemsJson = formData.get('items') as string
    const items = itemsJson ? JSON.parse(itemsJson) : []

    // 🧮 CALCULATIONS
    const totalHT_Gross = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
    const discountAmount = totalHT_Gross * (discount / 100)
    const totalHT_Net = totalHT_Gross - discountAmount
    const totalTVA = totalHT_Net * 0.20
    const totalTTC = totalHT_Net + totalTVA

    const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
            workspace_id: workspace.id,
            client_id: clientId,
            owner_id: user.id,
            number: number,
            invoice_number: number,
            date: date,
            issue_date: date,
            due_date: dueDate,
            status: status,
            discount: discount, // ✅ Save Discount
            total_ht: totalHT_Gross, // We store Gross here, logic handles Net
            total_tva: totalTVA,
            total_ttc: totalTTC,
            total: totalTTC,
            total_amount: totalTTC
        })
        .select()
        .single()

    if (invoiceError) return { error: `Erreur DB: ${invoiceError.message}` }

    if (items.length > 0) {
        const { error: itemsError } = await supabase.from('invoice_items').insert(
            items.map((item: any) => ({
                invoice_id: invoice.id,
                description: item.description,
                unit: item.unit || null,
                quantity: Number(item.quantity) || 0,
                unit_price: Number(item.unit_price) || 0,
                total: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
            }))
        )
        if (itemsError) console.error("Item Insert Error:", itemsError)
    }

    revalidatePath('/invoices')
    redirect(`/invoices/${invoice.id}`)
}

// --- 2. UPDATE INVOICE ---
export async function updateInvoice(invoiceId: string, formData: FormData) {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    const user = authData?.user

    if (authError || !user) return { error: "Non connecté" }

    const clientId = formData.get('client_id')
    const date = formData.get('date')
    const dueDate = formData.get('due_date')
    const status = formData.get('status')
    const number = formData.get('number') as string
    const discount = Number(formData.get('discount')) || 0 // ✅ Extract Discount

    const itemsJson = formData.get('items') as string
    const items = itemsJson ? JSON.parse(itemsJson) : []

    // 🧮 CALCULATIONS
    const totalHT_Gross = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
    const discountAmount = totalHT_Gross * (discount / 100)
    const totalHT_Net = totalHT_Gross - discountAmount
    const totalTVA = totalHT_Net * 0.20
    const totalTTC = totalHT_Net + totalTVA

    const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
            client_id: clientId,
            number: number,
            invoice_number: number,
            date: date,
            issue_date: date,
            due_date: dueDate,
            status: status,
            discount: discount, // ✅ Update Discount
            total_ht: totalHT_Gross,
            total_tva: totalTVA,
            total_ttc: totalTTC,
            total: totalTTC,
            total_amount: totalTTC
        })
        .eq('id', invoiceId)

    if (invoiceError) return { error: invoiceError.message }

    await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)

    if (items.length > 0) {
        await supabase.from('invoice_items').insert(
            items.map((item: any) => ({
                invoice_id: invoiceId,
                description: item.description,
                unit: item.unit || null,
                quantity: Number(item.quantity) || 0,
                unit_price: Number(item.unit_price) || 0,
                total: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
            }))
        )
    }

    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath('/invoices')
    redirect(`/invoices/${invoiceId}`)
}

// --- 3. DELETE INVOICE ---
export async function deleteInvoice(invoiceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Non connecté" }

    // Clean up items first
    await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)

    // Delete invoice
    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)

    if (error) return { error: error.message }

    revalidatePath('/invoices')
    redirect('/invoices')
}

// --- 4. MARK AS PAID ---
export async function markInvoiceAsPaid(invoiceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Non connecté" }

    const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoiceId)

    if (error) return { error: error.message }

    revalidatePath('/invoices')
    revalidatePath('/dashboard')
    revalidatePath(`/invoices/${invoiceId}`)

    return { success: true }
}

// --- 5. UPDATE STATUS (Dropdown Action) ---
export async function updateInvoiceStatus(invoiceId: string, newStatus: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Non connecté" }

    const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId)

    if (error) return { error: "Erreur mise à jour statut" }

    revalidatePath('/invoices')
    return { success: true }
}