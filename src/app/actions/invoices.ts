'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendEmail } from './sendEmail'
import { getOrCreateWorkspace } from '@/lib/workspace'

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
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) return { error: 'Vous devez être connecté pour créer une facture.' }

    let workspaceId: string
    try {
        workspaceId = await getOrCreateWorkspace(supabase, user.id)
    } catch (e: any) {
        return { error: e.message }
    }

    const clientId = formData.get('client_id')
    const rawDate = formData.get('date') as string | null
    const rawDueDate = formData.get('due_date') as string | null
    const date = rawDate?.trim() || new Date().toISOString().split('T')[0]
    const dueDate = rawDueDate?.trim() || null
    const status = formData.get('status') || 'draft'
    let number = formData.get('number') as string

    // ✅ Extract Discount + Recurring + Currency
    const discount = Number(formData.get('discount')) || 0
    const is_recurring = formData.get('is_recurring') === 'true'
    const frequency = formData.get('frequency') as string | null
    const currency = (formData.get('currency') as string) || 'MAD'
    const exchange_rate = Number(formData.get('exchange_rate')) || 1

    if (!number || number.trim() === '') {
        number = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    }

    const itemsJson = formData.get('items') as string
    const items = itemsJson ? JSON.parse(itemsJson) : []

    // Items are stored in document currency; multiply by exchange_rate for MAD-based reporting totals
    const totalHT_Gross = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
    const discountRatio = totalHT_Gross > 0 ? (1 - discount / 100) : 1
    const totalHT_Net = totalHT_Gross * discountRatio
    const totalTVA = items.reduce((sum: number, item: any) => {
        const lineHT = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0) * discountRatio
        return sum + lineHT * ((item.tva_rate != null ? Number(item.tva_rate) : 20) / 100)
    }, 0)
    const totalTTC = totalHT_Net + totalTVA
    // MAD-equivalent totals for reports (exchange_rate = 1 for MAD invoices, so no-op)
    const totalTTC_MAD = totalTTC * exchange_rate

    const insertPayload: any = {
        workspace_id: workspaceId,
        client_id: clientId,
        invoice_number: number,
        date: date,
        issue_date: date,
        due_date: dueDate,
        status: status,
        discount: discount,
        total_ht: totalHT_Gross * exchange_rate,
        total_tva: totalTVA * exchange_rate,
        total_ttc: totalTTC_MAD,
        is_recurring,
        frequency: is_recurring ? frequency : null,
        currency,
        exchange_rate,
    }

    // Only attach owner_id if a real user is present to satisfy DB schema
    if (user) insertPayload.owner_id = user.id

    const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(insertPayload)
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
                tva_rate: item.tva_rate != null ? Number(item.tva_rate) : 20,
                total: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
                // Conversion metadata — null for manually typed lines
                original_price: item.original_price != null ? Number(item.original_price) : null,
                base_currency: item.base_currency ?? null,
                rate_snapshot: item.rate_snapshot != null ? Number(item.rate_snapshot) : null,
            }))
        )
        if (itemsError) {
            // Roll back the orphaned invoice header so data stays consistent
            await supabase.from('invoices').delete().eq('id', invoice.id)
            return { error: `Erreur lignes de facture: ${itemsError.message}` }
        }
    }

    revalidatePath('/invoices')
    redirect(`/invoices/${invoice.id}`)
}

// --- 2. UPDATE INVOICE ---
export async function updateInvoice(invoiceId: string, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }
    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }

    const clientId = formData.get('client_id')
    const rawDate = formData.get('date') as string | null
    const rawDueDate = formData.get('due_date') as string | null
    const date = rawDate?.trim() || new Date().toISOString().split('T')[0]
    const dueDate = rawDueDate?.trim() || null
    const status = formData.get('status')
    const number = formData.get('number') as string
    const discount = Number(formData.get('discount')) || 0

    const itemsJson = formData.get('items') as string
    const items = itemsJson ? JSON.parse(itemsJson) : []
    const currency = (formData.get('currency') as string) || 'MAD'
    const exchange_rate = Number(formData.get('exchange_rate')) || 1

    // Items in document currency; multiply by exchange_rate for MAD-based reporting totals
    const totalHT_Gross = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
    const discountRatio = totalHT_Gross > 0 ? (1 - discount / 100) : 1
    const totalHT_Net = totalHT_Gross * discountRatio
    const totalTVA = items.reduce((sum: number, item: any) => {
        const lineHT = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0) * discountRatio
        return sum + lineHT * ((item.tva_rate != null ? Number(item.tva_rate) : 20) / 100)
    }, 0)
    const totalTTC = totalHT_Net + totalTVA
    const totalTTC_MAD = totalTTC * exchange_rate

    const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
            client_id: clientId,
            invoice_number: number,
            date: date,
            issue_date: date,
            due_date: dueDate,
            status: status,
            discount: discount,
            total_ht: totalHT_Gross * exchange_rate,
            total_tva: totalTVA * exchange_rate,
            total_ttc: totalTTC_MAD,
            currency,
            exchange_rate,
        })
        .eq('id', invoiceId)
        .eq('workspace_id', workspaceId) // IDOR guard

    if (invoiceError) return { error: invoiceError.message }

    await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)

    if (items.length > 0) {
        const { error: itemsError } = await supabase.from('invoice_items').insert(
            items.map((item: any) => ({
                invoice_id: invoiceId,
                description: item.description,
                unit: item.unit || null,
                quantity: Number(item.quantity) || 0,
                unit_price: Number(item.unit_price) || 0,
                tva_rate: item.tva_rate != null ? Number(item.tva_rate) : 20,
                total: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
                original_price: item.original_price != null ? Number(item.original_price) : null,
                base_currency: item.base_currency ?? null,
                rate_snapshot: item.rate_snapshot != null ? Number(item.rate_snapshot) : null,
            }))
        )
        if (itemsError) return { error: `Erreur lignes de facture: ${itemsError.message}` }
    }

    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath('/invoices')
    redirect(`/invoices/${invoiceId}`)
}

// --- 3. DELETE INVOICE ---
export async function deleteInvoice(invoiceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }
    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }

    // Clean up items first (scoped through invoice ownership)
    await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)

    // Delete invoice — workspace_id check prevents deleting another user's invoice
    const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('workspace_id', workspaceId) // IDOR guard

    if (error) return { error: error.message }

    revalidatePath('/invoices')
    redirect('/invoices')
}

// --- 4. MARK AS PAID ---
export async function markInvoiceAsPaid(invoiceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }
    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }

    const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoiceId)
        .eq('workspace_id', workspaceId) // IDOR guard

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
    if (!user) return { error: 'Non authentifié.' }
    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }

    const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId)
        .eq('workspace_id', workspaceId) // IDOR guard

    if (error) return { error: "Erreur mise à jour statut" }

    revalidatePath('/invoices')
    return { success: true }
}

// --- 6. SEND INVOICE BY EMAIL ---
function formatAmt(n: number) { return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') }

function buildInvoiceEmailHtml(invoice: any, items: any[], ws: any, client: any) {
    const totalHT = items.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0)
    const discount = invoice.discount || 0
    const discountRatio = totalHT > 0 ? (1 - discount / 100) : 1
    const discountAmt = totalHT * (discount / 100)
    const netHT = totalHT - discountAmt
    const tva = items.reduce((s: number, i: any) => {
        const lineHT = (Number(i.total) || 0) * discountRatio
        const rate = i.tva_rate != null ? Number(i.tva_rate) : 20
        return s + lineHT * (rate / 100)
    }, 0)
    const ttc = netHT + tva

    const itemRows = items.map((i: any) => `
        <tr>
            <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827">${i.description || ''}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;text-align:center">${i.unit || '-'}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;text-align:center">${i.quantity}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;text-align:right;font-family:monospace">${formatAmt(Number(i.unit_price))} DH</td>
            <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:700;color:#111827;text-align:right;font-family:monospace">${formatAmt(Number(i.total))} DH</td>
        </tr>`).join('')

    const discountRow = discount > 0 ? `
        <tr><td colspan="2" style="padding:6px 8px;font-size:12px;color:#dc2626;text-align:right">Remise (${discount}%)</td>
        <td style="padding:6px 8px;font-size:12px;color:#dc2626;text-align:right;font-family:monospace">- ${formatAmt(discountAmt)} DH</td></tr>
        <tr><td colspan="2" style="padding:6px 8px;font-size:12px;color:#374151;text-align:right">Net HT</td>
        <td style="padding:6px 8px;font-size:12px;color:#374151;text-align:right;font-family:monospace">${formatAmt(netHT)} DH</td></tr>` : ''

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <!-- Header -->
  <tr><td style="background:#3B82F6;padding:24px 32px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px">${ws?.name || 'Facture'}</div></td>
      <td align="right"><div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-1px">FACTURE</div>
        <div style="font-size:13px;color:#bfdbfe;margin-top:2px">N° ${invoice.invoice_number}</div></td>
    </tr></table>
  </td></tr>
  <!-- Info Row -->
  <tr><td style="padding:24px 32px;border-bottom:1px solid #f0f0f0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="50%" style="vertical-align:top">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:8px">Émetteur</div>
        <div style="font-size:14px;font-weight:700;color:#111827">${ws?.name || ''}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:2px">${ws?.address || ''}</div>
        <div style="font-size:13px;color:#6b7280">${[ws?.city, ws?.country].filter(Boolean).join(', ')}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px">${ws?.email || ''}</div>
      </td>
      <td width="50%" style="vertical-align:top;text-align:right">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:8px">Facturé à</div>
        <div style="font-size:14px;font-weight:700;color:#111827">${client?.name || ''}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:2px">${client?.address || ''}</div>
        <div style="font-size:13px;color:#6b7280">${[client?.city, client?.country].filter(Boolean).join(', ')}</div>
        ${client?.ice ? `<div style="font-size:12px;color:#9ca3af;margin-top:4px;font-family:monospace">ICE: ${client.ice}</div>` : ''}
      </td>
    </tr></table>
  </td></tr>
  <!-- Date -->
  <tr><td style="padding:12px 32px;background:#f9fafb;border-bottom:1px solid #f0f0f0">
    <span style="font-size:12px;color:#6b7280">Date d'émission : </span>
    <span style="font-size:12px;font-weight:600;color:#111827">${new Date(invoice.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
  </td></tr>
  <!-- Items Table -->
  <tr><td style="padding:24px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <thead><tr style="border-bottom:2px solid #111827">
        <th style="padding:8px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;text-align:left;font-weight:700">Description</th>
        <th style="padding:8px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;text-align:center;font-weight:700">Unité</th>
        <th style="padding:8px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;text-align:center;font-weight:700">Qté</th>
        <th style="padding:8px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;text-align:right;font-weight:700">Prix Unit.</th>
        <th style="padding:8px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;text-align:right;font-weight:700">Total HT</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
  </td></tr>
  <!-- Totals -->
  <tr><td style="padding:0 32px 24px">
    <table cellpadding="0" cellspacing="0" align="right" style="min-width:280px">
      <tr><td style="padding:6px 8px;font-size:12px;color:#374151;text-align:right">${discount > 0 ? 'Total HT Brut' : 'Total HT'}</td>
          <td style="padding:6px 8px;font-size:12px;color:#374151;text-align:right;font-family:monospace">${formatAmt(totalHT)} DH</td></tr>
      ${discountRow}
      <tr><td style="padding:6px 8px;font-size:12px;color:#374151;text-align:right;border-top:1px solid #e5e7eb">TVA</td>
          <td style="padding:6px 8px;font-size:12px;color:#374151;text-align:right;font-family:monospace;border-top:1px solid #e5e7eb">${formatAmt(tva)} DH</td></tr>
      <tr><td colspan="2" style="padding:12px 8px 0">
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280">Total TTC</span>
          <span style="font-size:20px;font-weight:800;color:#3B82F6;font-family:monospace">${formatAmt(ttc)} DH</span>
        </div>
      </td></tr>
    </table>
  </td></tr>
  ${invoice.notes ? `<tr><td style="padding:0 32px 24px"><div style="background:#f9fafb;border-radius:8px;padding:16px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:6px">Conditions de règlement</div><div style="font-size:13px;color:#374151;white-space:pre-wrap">${invoice.notes}</div></div></td></tr>` : ''}
  <!-- Footer -->
  <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <div style="font-size:11px;color:#9ca3af;text-align:center">
      ${ws?.name || ''} ${ws?.address ? '• ' + ws.address : ''} ${ws?.city ? '• ' + ws.city : ''}<br>
      ${ws?.tax_id ? 'IF: ' + ws.tax_id : ''} ${ws?.ice ? '• ICE: ' + ws.ice : ''} ${ws?.bank_name ? '• Banque: ' + ws.bank_name : ''} ${ws?.rib ? '• RIB: ' + ws.rib : ''}
    </div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

export async function sendInvoiceEmail(invoiceId: string, recipientEmail: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Non authentifié.' }

    const { data: invoice } = await supabase
        .from('invoices')
        .select('*, invoice_items(*), client:clients(*), workspace:workspaces(*)')
        .eq('id', invoiceId)
        .single()

    if (!invoice) return { success: false, message: 'Facture introuvable.' }

    const items = invoice.invoice_items || []
    const ws = invoice.workspace
    const client = invoice.client

    const html = buildInvoiceEmailHtml(invoice, items, ws, client)

    return sendEmail({
        to: recipientEmail,
        subject: `Facture N° ${invoice.invoice_number}${ws?.name ? ' — ' + ws.name : ''}`,
        html,
    })
}

// --- 7. GENERATE RECURRING INVOICES ---
function addMonths(date: Date, months: number): Date {
    const d = new Date(date)
    d.setMonth(d.getMonth() + months)
    return d
}

function nextDueDate(baseDate: Date, freq: string): Date {
    switch (freq) {
        case 'quarterly': return addMonths(baseDate, 3)
        case 'biannual': return addMonths(baseDate, 6)
        case 'annual': return addMonths(baseDate, 12)
        default: return addMonths(baseDate, 1) // monthly
    }
}

export async function generateRecurringInvoices() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié', generated: 0 }

    let wsId: string
    try {
        wsId = await getOrCreateWorkspace(supabase, user.id)
    } catch (e: any) {
        return { error: e.message, generated: 0 }
    }

    const { data: templates } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('workspace_id', wsId)
        .eq('is_recurring', true)

    if (!templates?.length) return { success: true, generated: 0, message: 'Aucune facture récurrente configurée.' }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let generated = 0

    for (const tpl of templates) {
        const baseDate = new Date(tpl.last_generated_at || tpl.date)
        const due = nextDueDate(baseDate, tpl.frequency || 'monthly')
        if (due > today) continue

        const newDate = due.toISOString().split('T')[0]
        const newNumber = `${tpl.invoice_number}-R-${newDate}`

        const { data: newInvoice, error: invErr } = await supabase
            .from('invoices')
            .insert({
                workspace_id: wsId,
                client_id: tpl.client_id,
                invoice_number: newNumber,
                date: newDate,
                issue_date: newDate,
                status: 'draft',
                discount: tpl.discount || 0,
                total_ht: tpl.total_ht,
                total_tva: tpl.total_tva,
                total_ttc: tpl.total_ttc,
                notes: tpl.notes,
                is_recurring: false,
            })
            .select()
            .single()

        if (invErr || !newInvoice) continue

        const items = tpl.invoice_items || []
        if (items.length > 0) {
            await supabase.from('invoice_items').insert(
                items.map((i: any) => ({
                    invoice_id: newInvoice.id,
                    description: i.description,
                    unit: i.unit,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    total: i.total,
                }))
            )
        }

        await supabase.from('invoices').update({ last_generated_at: newDate }).eq('id', tpl.id)
        generated++
    }

    revalidatePath('/invoices')
    return { success: true, generated, message: `${generated} facture(s) générée(s).` }
}

// --- 8. SEND OVERDUE REMINDERS ---
function buildReminderEmailHtml(invoice: any, ws: any, client: any, daysOverdue: number) {
    const ttc = Number(invoice.total_ttc) || 0
    const dueDateStr = invoice.due_date
        ? new Date(invoice.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'non précisée'

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <tr><td style="background:#dc2626;padding:20px 32px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><div style="font-size:18px;font-weight:800;color:#fff">${ws?.name || 'Votre fournisseur'}</div></td>
      <td align="right"><div style="font-size:13px;color:#fca5a5;font-weight:700;text-transform:uppercase;letter-spacing:1px">RAPPEL DE PAIEMENT</div></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <div style="font-size:15px;color:#111827;margin-bottom:16px">Bonjour <strong>${client?.name || ''}</strong>,</div>
    <div style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:20px">
      Nous vous contactons au sujet de la facture <strong>N° ${invoice.invoice_number}</strong>, dont le règlement est en attente depuis <strong>${daysOverdue} jour${daysOverdue > 1 ? 's' : ''}</strong>.
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px">
      <tr style="background:#f9fafb">
        <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px">Facture</td>
        <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px">Échéance</td>
        <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;text-align:right">Montant dû</td>
      </tr>
      <tr>
        <td style="padding:14px 16px;font-size:14px;color:#111827;font-family:monospace;font-weight:700">${invoice.invoice_number}</td>
        <td style="padding:14px 16px;font-size:14px;color:#dc2626;font-weight:600">${dueDateStr}</td>
        <td style="padding:14px 16px;font-size:20px;color:#dc2626;font-family:monospace;font-weight:800;text-align:right">${ttc.toFixed(2)} DH</td>
      </tr>
    </table>
    <div style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:20px">
      Si ce paiement a déjà été effectué, veuillez ignorer ce message. Dans le cas contraire, nous vous remercions de bien vouloir procéder au règlement dans les plus brefs délais.
    </div>
    <div style="font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:16px;margin-top:8px">
      Pour toute question, n'hésitez pas à nous contacter.
    </div>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <div style="font-size:11px;color:#9ca3af;text-align:center">
      ${ws?.name || ''} ${ws?.address ? '· ' + ws.address : ''} ${ws?.city ? '· ' + ws.city : ''}<br>
      ${ws?.tax_id ? 'IF: ' + ws.tax_id : ''} ${ws?.ice ? '· ICE: ' + ws.ice : ''}
    </div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

export async function sendOverdueReminders(): Promise<{
    sent: number
    skipped: number
    errors: number
    message: string
}> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { sent: 0, skipped: 0, errors: 0, message: 'Non authentifié.' }

    const wsId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!wsId) return { sent: 0, skipped: 0, errors: 0, message: 'Espace de travail introuvable.' }

    const { data: workspace } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', wsId)
        .single()
    if (!workspace) return { sent: 0, skipped: 0, errors: 0, message: 'Espace de travail introuvable.' }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('*, client:clients(*)')
        .eq('workspace_id', wsId)
        .in('status', ['sent', 'partial', 'pending', 'en_attente'])
        .not('due_date', 'is', null)
        .lt('due_date', today.toISOString().split('T')[0])

    if (!overdueInvoices?.length) {
        return { sent: 0, skipped: 0, errors: 0, message: 'Aucune facture en retard de paiement.' }
    }

    let sent = 0, skipped = 0, errors = 0

    for (const invoice of overdueInvoices) {
        const clientEmail = invoice.client?.email
        if (!clientEmail) { skipped++; continue }

        const dueDate = new Date(invoice.due_date)
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000)
        const html = buildReminderEmailHtml(invoice, workspace, invoice.client, daysOverdue)

        const result = await sendEmail({
            to: clientEmail,
            subject: `Rappel de paiement — Facture N° ${invoice.invoice_number}`,
            html,
        })

        if (result.success) sent++
        else errors++
    }

    revalidatePath('/invoices')
    const parts = []
    if (sent > 0) parts.push(`${sent} rappel(s) envoyé(s)`)
    if (skipped > 0) parts.push(`${skipped} ignoré(s) (pas d'email)`)
    if (errors > 0) parts.push(`${errors} échec(s)`)
    return { sent, skipped, errors, message: parts.join(', ') || 'Aucun rappel envoyé.' }
}

export async function getOverdueInvoicesCount(): Promise<number> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0
    const wsId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!wsId) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', wsId)
        .in('status', ['sent', 'partial', 'pending', 'en_attente'])
        .not('due_date', 'is', null)
        .lt('due_date', today.toISOString().split('T')[0])
    return count || 0
}

export async function bulkMarkInvoicesPaid(ids: string[]): Promise<{ updated: number; error?: string }> {
    if (!ids.length) return { updated: 0 }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { updated: 0, error: 'Non authentifié.' }
    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { updated: 0, error: 'Espace de travail introuvable.' }
    const { error, count } = await supabase
        .from('invoices')
        .update({ status: 'paid' }, { count: 'exact' })
        .in('id', ids)
        .eq('workspace_id', workspaceId) // IDOR guard
    if (error) return { updated: 0, error: error.message }
    revalidatePath('/invoices')
    revalidatePath('/dashboard')
    return { updated: count || ids.length }
}

export async function bulkDeleteInvoices(ids: string[]): Promise<{ deleted: number; error?: string }> {
    if (!ids.length) return { deleted: 0 }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { deleted: 0, error: 'Non authentifié.' }
    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { deleted: 0, error: 'Espace de travail introuvable.' }
    const { error, count } = await supabase
        .from('invoices')
        .delete({ count: 'exact' })
        .in('id', ids)
        .eq('workspace_id', workspaceId) // IDOR guard
    if (error) return { deleted: 0, error: error.message }
    revalidatePath('/invoices')
    revalidatePath('/dashboard')
    return { deleted: count || ids.length }
}

// ─── RECURRING MANAGEMENT ───────────────────────────────────────────────────

export interface RecurringTemplate {
    id: string
    invoice_number: string
    client_id: string | null
    clientName: string
    frequency: string
    last_generated_at: string | null
    date: string
    total_ttc: number
    notes: string | null
    generatedCount: number
    nextDueDate: string
    paused: boolean
}

function addMonthsUtil(date: Date, months: number): Date {
    const d = new Date(date)
    d.setMonth(d.getMonth() + months)
    return d
}

function computeNextDue(baseDate: Date, freq: string): Date {
    switch (freq) {
        case 'quarterly': return addMonthsUtil(baseDate, 3)
        case 'biannual': return addMonthsUtil(baseDate, 6)
        case 'annual': return addMonthsUtil(baseDate, 12)
        default: return addMonthsUtil(baseDate, 1)
    }
}

export async function getRecurringTemplates(): Promise<RecurringTemplate[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const wsId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!wsId) return []

    const { data: templates } = await supabase
        .from('invoices')
        .select('*, client:clients(name)')
        .eq('workspace_id', wsId)
        .eq('is_recurring', true)
        .order('date', { ascending: false })

    const { data: paused } = await supabase
        .from('invoices')
        .select('*, client:clients(name)')
        .eq('workspace_id', wsId)
        .eq('is_recurring', false)
        .not('frequency', 'is', null)
        .neq('frequency', '')
        .order('date', { ascending: false })

    const all = [
        ...(templates || []).map((t: any) => ({ ...t, paused: false })),
        ...(paused || []).map((t: any) => ({ ...t, paused: true })),
    ]

    return all.map((tpl: any) => {
        const baseDate = new Date(tpl.last_generated_at || tpl.date)
        const nextDue = computeNextDue(baseDate, tpl.frequency || 'monthly')
        return {
            id: tpl.id,
            invoice_number: tpl.invoice_number || '',
            client_id: tpl.client_id,
            clientName: tpl.client?.name || 'Client inconnu',
            frequency: tpl.frequency || 'monthly',
            last_generated_at: tpl.last_generated_at || null,
            date: tpl.date,
            total_ttc: Number(tpl.total_ttc) || 0,
            notes: tpl.notes || null,
            generatedCount: 0,
            nextDueDate: nextDue.toISOString().split('T')[0],
            paused: tpl.paused,
        }
    })
}

export async function pauseRecurringTemplate(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Non authentifié.' }
    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { success: false, error: 'Espace de travail introuvable.' }
    const { error } = await supabase.from('invoices').update({ is_recurring: false }).eq('id', id).eq('workspace_id', workspaceId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/invoices/recurring')
    return { success: true }
}

export async function resumeRecurringTemplate(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Non authentifié.' }
    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { success: false, error: 'Espace de travail introuvable.' }
    const { error } = await supabase.from('invoices').update({ is_recurring: true }).eq('id', id).eq('workspace_id', workspaceId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/invoices/recurring')
    return { success: true }
}

export async function updateRecurringFrequency(id: string, frequency: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Non authentifié.' }
    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { success: false, error: 'Espace de travail introuvable.' }
    const { error } = await supabase.from('invoices').update({ frequency }).eq('id', id).eq('workspace_id', workspaceId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/invoices/recurring')
    return { success: true }
}

export async function generateSingleTemplate(id: string): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Non authentifie' }

    let wsId2: string
    try {
        wsId2 = await getOrCreateWorkspace(supabase, user.id)
    } catch (e: any) {
        return { success: false, error: e.message }
    }

    const { data: tpl } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('id', id)
        .eq('workspace_id', wsId2)
        .single()

    if (!tpl) return { success: false, error: 'Modele introuvable' }

    const today = new Date()
    const newDate = today.toISOString().split('T')[0]
    const newNumber = `${tpl.invoice_number}-R-${newDate}`

    const { data: newInvoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
            workspace_id: wsId2,
            client_id: tpl.client_id,
            invoice_number: newNumber,
            date: newDate,
            issue_date: newDate,
            status: 'draft',
            discount: tpl.discount || 0,
            total_ht: tpl.total_ht,
            total_tva: tpl.total_tva,
            total_ttc: tpl.total_ttc,
            notes: tpl.notes,
            is_recurring: false,
        })
        .select()
        .single()

    if (invErr || !newInvoice) return { success: false, error: invErr?.message || 'Erreur creation' }

    const items = tpl.invoice_items || []
    if (items.length > 0) {
        await supabase.from('invoice_items').insert(
            items.map((i: any) => ({
                invoice_id: newInvoice.id,
                description: i.description,
                unit: i.unit,
                quantity: i.quantity,
                unit_price: i.unit_price,
                total: i.total,
            }))
        )
    }

    await supabase.from('invoices').update({ last_generated_at: newDate }).eq('id', id).eq('workspace_id', wsId2)
    revalidatePath('/invoices')
    revalidatePath('/invoices/recurring')
    return { success: true, invoiceId: newInvoice.id }
}

export async function deleteRecurringTemplate(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Non authentifié.' }
    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { success: false, error: 'Espace de travail introuvable.' }
    await supabase.from('invoice_items').delete().eq('invoice_id', id)
    const { error } = await supabase.from('invoices').delete().eq('id', id).eq('workspace_id', workspaceId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/invoices/recurring')
    return { success: true }
}