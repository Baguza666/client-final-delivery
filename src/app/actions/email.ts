'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buildPdfHtml, generatePdfBuffer } from '@/lib/pdf-generator'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { formatAmount } from '@/utils/format'
import { sendEmail } from '@/app/actions/sendEmail'

function buildEmailHtml({
    invNumber,
    wsName,
    clientName,
    formattedTotal,
    viewUrl,
    wsAddress,
    wsEmail,
    invoiceDate,
}: {
    invNumber: string
    wsName: string
    clientName: string
    formattedTotal: string
    viewUrl: string | null
    wsAddress?: string
    wsEmail?: string
    invoiceDate?: string
}): string {
    const dateStr = invoiceDate
        ? new Date(invoiceDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Facture ${invNumber}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- Header bar -->
        <tr><td style="background:#3b82f6;border-radius:12px 12px 0 0;padding:28px 32px">
          <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">${wsName}</p>
          <p style="margin:6px 0 0;font-size:13px;color:#bfdbfe">Facture N° ${invNumber} · ${dateStr}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px">
          <p style="margin:0 0 8px;font-size:15px;color:#374151">Bonjour <strong>${clientName}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6">
            Veuillez trouver ci-joint votre facture N°&nbsp;<strong>${invNumber}</strong>.
            Vous trouverez le détail complet de cette facture en pièce jointe (PDF).
          </p>

          <!-- Amount card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr><td style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:20px 24px">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0ea5e9">Montant Total TTC</p>
              <p style="margin:0;font-size:28px;font-weight:800;color:#0c4a6e;font-variant-numeric:tabular-nums">${formattedTotal}</p>
            </td></tr>
          </table>

          ${viewUrl ? `
          <!-- CTA button -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr><td style="background:#3b82f6;border-radius:8px;padding:14px 28px">
              <a href="${viewUrl}" style="color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;display:block;white-space:nowrap">
                Voir la facture en ligne →
              </a>
            </td></tr>
          </table>
          ` : ''}

          <p style="margin:0 0 6px;font-size:14px;color:#374151">
            En cas de question, n'hésitez pas à nous contacter${wsEmail ? ` à <a href="mailto:${wsEmail}" style="color:#3b82f6">${wsEmail}</a>` : ''}.
          </p>
          <p style="margin:0;font-size:14px;color:#374151">Cordialement,</p>
          <p style="margin:6px 0 0;font-size:14px;font-weight:700;color:#111827">${wsName}</p>
          ${wsAddress ? `<p style="margin:4px 0 0;font-size:12px;color:#9ca3af">${wsAddress}</p>` : ''}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center">
          <p style="margin:0;font-size:11px;color:#9ca3af">
            Ce message a été envoyé automatiquement via Invoicify. Merci de ne pas répondre directement à cet email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendInvoiceEmail(
    invoiceId: string,
    recipientEmail: string,
): Promise<{ success: boolean; message: string }> {
    const trimmedEmail = recipientEmail.trim()
    if (!trimmedEmail) {
        return { success: false, message: "Adresse email du destinataire manquante." }
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } },
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Non authentifié.' }

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { success: false, message: 'Espace de travail introuvable.' }

    const { data: invoice } = await supabase
        .from('invoices')
        .select('*, invoice_items(*), client:clients(*), workspace:workspaces(*)')
        .eq('id', invoiceId)
        .eq('workspace_id', workspaceId) // IDOR guard
        .single()

    if (!invoice) return { success: false, message: 'Facture introuvable.' }

    const items = invoice.invoice_items || []
    let ws: any = invoice.workspace
    if (!ws && invoice.workspace_id) {
        const { data } = await supabase.from('workspaces').select('*').eq('id', invoice.workspace_id).single()
        ws = data
    }
    const client = invoice.client

    // Get or create share token (so the email always includes a view link)
    let token: string | null = null
    const { data: existingLink } = await supabase
        .from('invoice_share_links')
        .select('token')
        .eq('invoice_id', invoiceId)
        .single()

    if (existingLink?.token) {
        token = existingLink.token
    } else {
        const newToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
        const { error: linkErr } = await supabase.from('invoice_share_links').insert({
            invoice_id: invoiceId,
            token: newToken,
            created_by: user.id,
        })
        if (!linkErr) token = newToken
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
    const viewUrl = token ? `${appUrl}/view/${token}` : null

    // Generate PDF buffer
    let pdfBuffer: Buffer
    try {
        const pdfHtml = buildPdfHtml(invoice, items, ws ?? {}, client, 'classic')
        pdfBuffer = await generatePdfBuffer(pdfHtml)
    } catch (err: any) {
        console.error('PDF generation error:', err)
        return { success: false, message: 'Erreur lors de la génération du PDF.' }
    }

    // Compose email
    const invNumber = invoice.invoice_number || invoiceId
    const wsName = ws?.name || 'Votre fournisseur'
    const clientName = client?.name || 'Client'
    const docTotal = (Number(invoice.total_ttc) || 0) / (Number(invoice.exchange_rate) || 1)

    const emailHtml = buildEmailHtml({
        invNumber,
        wsName,
        clientName,
        formattedTotal: formatAmount(docTotal, invoice.currency || 'MAD'),
        viewUrl,
        wsAddress: [ws?.address, ws?.city].filter(Boolean).join(', ') || undefined,
        wsEmail: ws?.email || undefined,
        invoiceDate: invoice.date || undefined,
    })

    const result = await sendEmail({
        to: trimmedEmail,
        subject: `Nouvelle facture ${invNumber} de ${wsName}`,
        html: emailHtml,
        attachments: [
            {
                filename: `Facture_${invNumber}.pdf`.replace(/[\s/\\]/g, '_'),
                content: pdfBuffer,
            },
        ],
        senderName: wsName,
    })

    if (!result.success) return result
    return { success: true, message: `Email envoyé à ${trimmedEmail} avec succès !` }
}
