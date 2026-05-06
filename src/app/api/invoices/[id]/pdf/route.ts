import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import puppeteer from 'puppeteer'
import { buildPdfHtml, type Template } from '@/lib/pdf-generator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const rawTpl = request.nextUrl.searchParams.get('template') || 'classic'
    const VALID_TEMPLATES: Template[] = ['classic', 'minimal', 'modern', 'elegant', 'bold', 'stripe', 'bureau', 'ligne'] as const
    const template: Template = VALID_TEMPLATES.includes(rawTpl as Template)
        ? (rawTpl as Template)
        : 'classic'

    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const { data: invoice } = await supabase
        .from('invoices')
        .select('*, invoice_items(*), client:clients(*), workspace:workspaces(*)')
        .eq('id', id)
        .single()

    if (!invoice) {
        return new NextResponse('Invoice not found', { status: 404 })
    }

    const items  = invoice.invoice_items || []
    const client = invoice.client

    let ws: any = invoice.workspace
    if (!ws) {
        if (invoice.workspace_id) {
            const { data } = await supabase.from('workspaces').select('*').eq('id', invoice.workspace_id).single()
            ws = data
        }
        if (!ws) {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase.from('workspaces').select('*').eq('owner_id', user.id).single()
                ws = data
            }
        }
    }

    const html = buildPdfHtml(invoice, items, ws ?? {}, client, template, ws?.brand_color)

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
        console.error('PDF generation error:', err)
        return new NextResponse('PDF generation failed: ' + err.message, { status: 500 })
    }
}
