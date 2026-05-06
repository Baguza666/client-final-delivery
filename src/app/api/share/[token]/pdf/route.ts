import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer'
import { buildPdfHtml, type Template } from '@/lib/pdf-generator'
import { pdfRatelimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params

    // IP-based rate limit: 5 PDF downloads per minute per IP
    if (pdfRatelimit) {
        const ip =
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
            request.headers.get('x-real-ip') ??
            '127.0.0.1'
        const { success } = await pdfRatelimit.limit(ip)
        if (!success) {
            return new NextResponse('Trop de requêtes. Veuillez réessayer dans une minute.', { status: 429 })
        }
    }

    // Strict token format: exactly 32 lowercase hex characters — anything else is rejected
    // before the service-role client ever touches the database
    if (!/^[0-9a-f]{32}$/.test(token)) {
        return new NextResponse('Token invalide', { status: 400 })
    }

    const rawTpl = request.nextUrl.searchParams.get('template') || 'classic'
    const VALID: Template[] = ['classic', 'minimal', 'modern', 'elegant', 'bold', 'stripe', 'bureau', 'ligne']
    const template: Template = VALID.includes(rawTpl as Template) ? (rawTpl as Template) : 'classic'

    // Service-role client to bypass RLS for public share-link PDF generation
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: link } = await supabase
        .from('invoice_share_links')
        .select('invoice_id')
        .eq('token', token)
        .single()

    if (!link?.invoice_id) {
        return new NextResponse('Lien invalide ou expiré', { status: 404 })
    }

    const { data: invoice } = await supabase
        .from('invoices')
        .select('*, invoice_items(*), client:clients(*), workspace:workspaces(*)')
        .eq('id', link.invoice_id)
        .single()

    if (!invoice) {
        return new NextResponse('Facture introuvable', { status: 404 })
    }

    const items  = invoice.invoice_items || []
    const client = invoice.client
    let ws: any  = invoice.workspace

    if (!ws && invoice.workspace_id) {
        const { data } = await supabase.from('workspaces').select('*').eq('id', invoice.workspace_id).single()
        ws = data
    }

    const html = buildPdfHtml(invoice, items, ws ?? {}, client, template)

    let browser
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        })
        const page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'networkidle0' })
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
        })
        await browser.close()

        const filename = `Facture_${invoice.invoice_number}_${client?.name || 'client'}.pdf`.replace(/\s+/g, '_')

        return new NextResponse(pdfBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (err: any) {
        if (browser) await browser.close().catch(() => {})
        console.error('Share PDF generation error:', err)
        return new NextResponse('PDF generation failed: ' + err.message, { status: 500 })
    }
}
