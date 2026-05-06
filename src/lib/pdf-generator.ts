import { TEMPLATES, type Template } from '@/lib/document-templates'
import { formatAmount } from '@/utils/format'

export type { Template }

function fmt(n: number): string {
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const fmtAmt = formatAmount

function hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
}

// ── Security helpers ──────────────────────────────────────────────────────────

/** Escape all HTML-special characters in a user-supplied string. */
function escHtml(s: string | null | undefined): string {
    if (!s) return ''
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

/** Accept only a 6-digit hex color; return the fallback for anything else. */
function safeHexColor(color: string | null | undefined, fallback = '#2563EB'): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback
}

/** Resolved at module load so request interception can reference it. */
const SUPABASE_HOST = (() => {
    try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname } catch { return '' }
})()

/**
 * Return the URL only when it is safe to embed in a Puppeteer page:
 * inline data URIs and URLs whose host is the app's own Supabase project.
 * Anything else (attacker-controlled hosts) is rejected.
 */
function safeImgUrl(url: string | null | undefined): string | null {
    if (!url) return null
    if (url.startsWith('data:image/')) return url
    try {
        const { hostname } = new URL(url)
        if (
            hostname === SUPABASE_HOST ||
            hostname.endsWith('.supabase.co') ||
            hostname.endsWith('.supabase.in')
        ) return url
    } catch { /* fall through */ }
    return null
}

// ── End security helpers ──────────────────────────────────────────────────────

function toWords(n: number): string {
    if (!n) return 'Zéro'
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix']
    function cvt(n: number): string {
        let s = ''
        if (n >= 100) { const h = Math.floor(n / 100); s += (h === 1 ? 'cent ' : units[h] + ' cent '); n = n % 100 }
        if (n >= 20) { const t = Math.floor(n / 10); const r = n % 10; if (t === 7 || t === 9) { s += tens[t - 1] + '-'; s += teens[r] } else { s += tens[t]; if (r === 1 && t < 8) s += ' et '; else if (r > 0) s += '-'; if (r > 0) s += units[r] } }
        else if (n >= 10) s += teens[n - 10]; else if (n > 0) s += units[n]
        return s.trim()
    }
    const chunks: number[] = []; let t = Math.floor(n); while (t > 0) { chunks.push(t % 1000); t = Math.floor(t / 1000) }
    const scales = ['', 'mille', 'million', 'milliard']; let res = ''
    for (let i = chunks.length - 1; i >= 0; i--) {
        const c = chunks[i]; if (!c) continue
        let ct = cvt(c); if (i === 1 && c === 1) ct = ''
        res += ct + ' '; if (scales[i]) { res += scales[i]; if (c > 1 && i > 1) res += 's'; res += ' ' }
    }
    const trimmed = res.trim()
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function formatDateFr(input: string | null | undefined): string {
    if (!input) return '—'
    const d = new Date(input)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function buildPdfHtml(
    invoice: any,
    items: any[],
    ws: any,
    client: any,
    template: Template,
    brandColor?: string,
): string {
    const cfg = TEMPLATES[template]
    const brand = safeHexColor(brandColor || ws?.brand_color)
    const rgba = (alpha: number) => hexToRgba(brand, alpha)

    // Sanitize every user-controlled text field up front so the rest of the
    // template can interpolate these variables without risk of XSS.
    const wsName     = escHtml(ws?.name)
    const wsAddress  = escHtml(ws?.address)
    const wsCity     = escHtml(ws?.city)
    const wsCountry  = escHtml(ws?.country)
    const wsPhone    = escHtml(ws?.phone)
    const wsEmail    = escHtml(ws?.email)
    const wsBankName = escHtml(ws?.bank_name)
    const wsRib      = escHtml(ws?.rib)
    const wsIce      = escHtml(ws?.ice)
    const wsRc       = escHtml(ws?.rc)
    const wsTaxId    = escHtml(ws?.tax_id)
    const wsCnss     = escHtml(ws?.cnss)
    const wsTp       = escHtml(ws?.tp)

    const clientName    = escHtml(client?.name)
    const clientAddress = escHtml(client?.address)
    const clientCity    = escHtml(client?.city)
    const clientCountry = escHtml(client?.country)
    const clientIce     = escHtml(client?.ice)

    const invoiceNumber = escHtml(invoice.invoice_number)
    const invoiceNotes  = escHtml(invoice.notes)

    // Restrict currency to a valid ISO 4217-style code (2-4 uppercase letters).
    const safeCurrency: string = /^[A-Z]{2,4}$/.test(invoice.currency || '')
        ? (invoice.currency as string)
        : 'MAD'

    // Only allow images from our Supabase project or inline data URIs.
    const safeLogoUrl = safeImgUrl(ws?.logo_url)
    const safeSigUrl  = safeImgUrl(ws?.signature_url)

    // ── Totals ──────────────────────────────────────────────────────
    const totalHT    = items.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0)
    const discount   = Number(invoice.discount) || 0
    const discountAmt = totalHT * (discount / 100)
    const netHT      = totalHT - discountAmt
    const discountRatio = totalHT > 0 ? netHT / totalHT : 1

    const tvaByRate: Record<number, number> = {}
    items.forEach((item: any) => {
        const rate   = Number(item.tva_rate ?? 20)
        const lineHT = (Number(item.total) || 0) * discountRatio
        tvaByRate[rate] = (tvaByRate[rate] || 0) + lineHT * (rate / 100)
    })
    const totalTVA = Object.values(tvaByRate).reduce((s, v) => s + v, 0) || netHT * 0.20
    const ttc      = netHT + totalTVA
    const dateStr  = formatDateFr(invoice.date)

    // ── Title style ─────────────────────────────────────────────────
    const titleCss = [
        `font-family:${cfg.titleFontFamily}`,
        `font-size:${cfg.titleFontSize}`,
        `font-weight:${cfg.titleFontWeight}`,
        `letter-spacing:${cfg.titleLetterSpacing}`,
        `font-style:${cfg.titleItalic ? 'italic' : 'normal'}`,
        `text-transform:${cfg.titleUppercase ? 'uppercase' : 'none'}`,
        'line-height:1',
        'margin:0',
    ].join(';')

    // ── Section label style ─────────────────────────────────────────
    const labelColor  = cfg.sectionLabelBranded ? brand : '#9ca3af'
    const labelBorder = cfg.sectionLabelBranded ? `1px solid ${rgba(0.35)}` : '1px solid #e5e7eb'
    const labelCss    = `font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;padding-bottom:4px;margin-bottom:8px;border-bottom:${labelBorder};color:${labelColor}`

    // ── TTC box ─────────────────────────────────────────────────────
    const ttcBoxCss = cfg.accentMode === 'solid'
        ? `background:${brand};border-radius:6px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:24px`
        : cfg.accentMode === 'tint'
        ? `background:${rgba(0.08)};border:1px solid ${rgba(0.25)};border-radius:6px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:24px`
        : cfg.accentMode === 'rule'
        ? `border-left:4px solid ${brand};padding-left:12px;padding-top:8px;padding-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:24px`
        : `border-top:1px solid ${rgba(0.2)};padding-top:8px;display:flex;justify-content:space-between;align-items:center;gap:24px`

    const ttcAmountColor = cfg.accentMode === 'solid' ? 'white' : brand

    // ── Logo tags ───────────────────────────────────────────────────
    const logoWhite = safeLogoUrl
        ? `<img src="${safeLogoUrl}" style="max-height:56px;max-width:160px;object-fit:contain;filter:brightness(100)" />`
        : `<span style="font-family:${cfg.titleFontFamily};font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;color:white">${wsName}</span>`

    const logoNormal = safeLogoUrl
        ? `<img src="${safeLogoUrl}" style="max-height:64px;max-width:160px;object-fit:contain" />`
        : `<span style="font-family:${cfg.titleFontFamily};font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;color:#111">${wsName}</span>`

    // ── Header HTML ─────────────────────────────────────────────────
    const darkHeader = cfg.headerType === 'dark' ? `
        <div style="background:#1e293b;padding:6mm 10mm;display:flex;justify-content:space-between;align-items:center">
            ${logoWhite}
            <div style="text-align:right">
                <div style="${titleCss};color:white">Facture</div>
                <div style="font-weight:700;margin-top:6px;font-size:11px;letter-spacing:3px;color:rgba(255,255,255,0.6)">N° ${invoiceNumber}</div>
            </div>
        </div>` : ''

    const bureauHeader = cfg.headerType === 'bureau' ? `
        <div style="background:${brand};padding:6mm 10mm;display:flex;justify-content:space-between;align-items:center">
            ${logoWhite}
            <div style="text-align:right">
                <div style="${titleCss};color:white">Facture</div>
                <div style="font-weight:700;margin-top:6px;font-size:11px;letter-spacing:3px;color:rgba(255,255,255,0.6)">N° ${invoiceNumber}</div>
            </div>
        </div>` : ''

    const stripeHeader = cfg.headerType === 'stripe' ? `
        <div style="display:flex;align-items:stretch;min-height:22mm">
            <div style="width:48mm;background:${brand};display:flex;flex-direction:column;justify-content:center;padding:6mm 8mm;flex-shrink:0">
                ${logoWhite}
            </div>
            <div style="flex:1;display:flex;justify-content:flex-end;align-items:center;padding:6mm 10mm;background:white">
                <div style="text-align:right">
                    <div style="${titleCss};color:#111111">Facture</div>
                    <div style="font-weight:700;margin-top:6px;font-size:11px;letter-spacing:3px;color:#9ca3af">N° ${invoiceNumber}</div>
                </div>
            </div>
        </div>` : ''

    const isOutsideHeader = cfg.headerType === 'dark' || cfg.headerType === 'bureau' || cfg.headerType === 'stripe'
    const topPad = isOutsideHeader ? '6mm' : '10mm'

    const standardHeader = (cfg.headerType === 'standard' || cfg.headerType === 'ligne') ? `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:${cfg.headerType === 'ligne' ? '4mm' : '8mm'}">
            ${logoNormal}
            <div style="text-align:right">
                <div style="${titleCss};color:#111111">Facture</div>
                <div style="font-weight:700;font-size:12px;letter-spacing:2px;color:#6b7280;margin-top:4px">N° ${invoiceNumber}</div>
            </div>
        </div>` : ''

    const ligneRule = cfg.headerType === 'ligne'
        ? `<div style="height:3px;background:${brand};margin-bottom:6mm"></div>` : ''

    const centeredHeader = cfg.headerType === 'centered' ? `
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:8mm;padding-bottom:5mm;border-bottom:1px solid #e2e8f0">
            ${logoNormal}
            <div style="${titleCss};color:#334155;margin-top:5mm">Facture</div>
            <div style="font-size:11px;font-weight:600;letter-spacing:2px;color:#64748b;margin-top:4px">N° ${invoiceNumber}</div>
        </div>` : ''

    // ── Item rows ───────────────────────────────────────────────────
    const itemRows = items.map((i: any, idx: number) => {
        const isLast = idx === items.length - 1
        const zebraStyle = cfg.tableZebra && idx % 2 === 0 ? `background:${rgba(0.04)};` : ''
        return `
        <tr style="border-bottom:${isLast ? cfg.lastRowBorder : cfg.rowBorder};${zebraStyle}page-break-inside:avoid">
            <td style="padding:8px 6px 8px 0;font-size:11px;color:#111;font-weight:600;white-space:pre-wrap">${escHtml(i.description) || ''}</td>
            <td style="padding:8px 6px;font-size:11px;color:#555;text-align:center;font-family:monospace;text-transform:uppercase">${escHtml(i.unit) || '—'}</td>
            <td style="padding:8px 6px;font-size:11px;color:#555;text-align:center;font-family:monospace">${i.quantity}</td>
            <td style="padding:8px 6px;font-size:11px;color:#555;text-align:right;font-family:monospace">${fmt(Number(i.unit_price))}</td>
            <td style="padding:8px 6px;font-size:11px;font-weight:700;color:#111;text-align:right;font-family:monospace">${fmt(Number(i.total))}</td>
        </tr>`
    }).join('')

    // ── TVA rows ────────────────────────────────────────────────────
    const tvaRows = Object.entries(tvaByRate).filter(([, v]) => v > 0).sort(([a], [b]) => Number(a) - Number(b))
        .map(([rate, amt]) => `
        <tr>
            <td style="padding:4px 6px;font-size:11px;color:#555;text-align:right">TVA (${rate}%)</td>
            <td style="padding:4px 6px;font-size:11px;color:#111;text-align:right;font-family:monospace;white-space:nowrap">${fmtAmt(amt, safeCurrency)}</td>
        </tr>`).join('') || `
        <tr>
            <td style="padding:4px 6px;font-size:11px;color:#555;text-align:right">TVA (20%)</td>
            <td style="padding:4px 6px;font-size:11px;color:#111;text-align:right;font-family:monospace;white-space:nowrap">${fmtAmt(totalTVA, safeCurrency)}</td>
        </tr>`

    const discountRows = discount > 0 ? `
        <tr>
            <td style="padding:4px 6px;font-size:11px;color:#dc2626;text-align:right">Remise (${discount}%)</td>
            <td style="padding:4px 6px;font-size:11px;color:#dc2626;text-align:right;font-family:monospace;white-space:nowrap">− ${fmtAmt(discountAmt, safeCurrency)}</td>
        </tr>
        <tr>
            <td style="padding:4px 6px;font-size:11px;color:#555;text-align:right;border-top:1px solid #e5e7eb">Net HT</td>
            <td style="padding:4px 6px;font-size:11px;color:#111;text-align:right;font-family:monospace;border-top:1px solid #e5e7eb;white-space:nowrap">${fmtAmt(netHT, safeCurrency)}</td>
        </tr>` : ''

    // ── Bank + footer ───────────────────────────────────────────────
    const bankHtml = `
        <div style="text-align:right">
            <div style="font-weight:700;color:#111;margin-bottom:3px">Coordonnées Bancaires</div>
            ${wsBankName ? `<div>Banque: ${wsBankName}</div>` : ''}
            ${wsRib ? `<div style="font-family:monospace;font-weight:700;color:#374151">RIB: ${wsRib}</div>` : '<div style="color:#9ca3af">—</div>'}
        </div>`

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Facture N° ${invoiceNumber}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
* { box-sizing:border-box; margin:0; padding:0 }
body { font-family:'Inter',sans-serif; background:white; color:#111; font-size:12px; -webkit-print-color-adjust:exact; print-color-adjust:exact }
@page { size:A4; margin:10mm 0 }
</style>
</head>
<body>
<div style="width:210mm;min-height:297mm;background:white;display:flex;flex-direction:column;position:relative">

    ${darkHeader}
    ${bureauHeader}
    ${stripeHeader}

    <div style="padding:${topPad} 10mm 38mm;display:flex;flex-direction:column;flex:1">

        ${centeredHeader}
        ${standardHeader}
        ${ligneRule}

        <div style="display:flex;justify-content:space-between;gap:16mm;margin-bottom:6mm">
            <div style="width:50%">
                ${cfg.sectionLabelHidden
                    ? `<div style="border-bottom:1px solid #e5e7eb;margin-bottom:8px"></div>`
                    : `<div style="${labelCss}">Émetteur</div>`
                }
                <div style="font-size:13px;font-weight:700;color:#111">${wsName}</div>
                <div style="font-size:11px;color:#555;margin-top:2px">${wsAddress}</div>
                <div style="font-size:11px;color:#555">${[wsCity, wsCountry].filter(Boolean).join(', ')}</div>
                <div style="margin-top:6px;font-size:10px;color:#555">
                    ${wsPhone ? `<div>Tél: ${wsPhone}</div>` : ''}
                    ${wsEmail ? `<div>${wsEmail}</div>` : ''}
                </div>
            </div>
            <div style="width:50%">
                ${cfg.sectionLabelHidden
                    ? `<div style="border-bottom:1px solid #e5e7eb;margin-bottom:8px"></div>`
                    : `<div style="${labelCss}">Facturé à</div>`
                }
                <div style="font-size:15px;font-weight:700;color:#111">${clientName}</div>
                <div style="font-size:11px;color:#555;margin-top:2px">${clientAddress}</div>
                <div style="font-size:11px;color:#555">${[clientCity, clientCountry].filter(Boolean).join(', ')}</div>
                ${clientIce ? `<div style="font-size:10px;color:#9ca3af;margin-top:3px;font-family:monospace">ICE: ${clientIce}</div>` : ''}
                <div style="margin-top:8px">
                    <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af">Date d'émission</div>
                    <div style="font-size:12px;font-weight:600;color:#111;margin-top:2px">${dateStr}</div>
                </div>
            </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:6mm">
            <thead>
                <tr style="${cfg.tableTopBorder !== 'none' ? `border-top:${cfg.tableTopBorder}` : ''}">
                    <th style="padding:6px 6px 6px 0;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;text-align:left">Description</th>
                    <th style="padding:6px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;text-align:center;width:10%">Unité</th>
                    <th style="padding:6px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;text-align:center;width:10%">Qté</th>
                    <th style="padding:6px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;text-align:right;width:18%">Prix Unit.</th>
                    <th style="padding:6px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;text-align:right;width:18%">Total HT</th>
                </tr>
            </thead>
            <tbody>${itemRows}</tbody>
        </table>

        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:6mm;page-break-inside:avoid">
            <div style="width:48%;font-size:10px;color:#555;line-height:1.6">
                <div style="margin-bottom:4px">Arrêté la présente facture à la somme de :</div>
                <div style="font-weight:700;color:#111;text-transform:uppercase;line-height:1.4">${toWords(ttc)} Dirhams TTC</div>
                ${invoiceNotes ? `
                <div style="margin-top:10px;padding-top:8px;border-top:1px solid #e5e7eb">
                    <div style="font-weight:700;color:#111;margin-bottom:4px">Conditions de règlement :</div>
                    <div style="color:#555;white-space:pre-wrap">${invoiceNotes}</div>
                </div>` : ''}
            </div>
            <div style="width:45%">
                <table style="width:100%;border-collapse:collapse">
                    <tr>
                        <td style="padding:4px 6px;font-size:11px;color:#555;text-align:right">${discount > 0 ? 'Total HT Brut' : 'Total HT'}</td>
                        <td style="padding:4px 6px;font-size:11px;color:#111;text-align:right;font-family:monospace;white-space:nowrap">${fmtAmt(totalHT, safeCurrency)}</td>
                    </tr>
                    ${discountRows}
                    ${tvaRows}
                    <tr>
                        <td colspan="2" style="padding:8px 0 0">
                            <div style="${ttcBoxCss}">
                                <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280">Total TTC</span>
                                <span style="font-size:18px;font-weight:900;color:${ttcAmountColor};font-family:monospace">${fmtAmt(ttc, safeCurrency)}</span>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
        </div>

        <div style="display:flex;justify-content:flex-end;align-items:flex-end;gap:16px;height:72px;margin-bottom:4mm;page-break-inside:avoid">
            ${safeSigUrl ? `<img src="${safeSigUrl}" style="max-height:64px;max-width:140px;object-fit:contain;opacity:0.9;transform:rotate(-6deg)" alt="Signature" />` : ''}
            <div style="border:3px double ${brand};padding:6px 12px;text-align:center;transform:rotate(-2deg);opacity:0.85;min-width:200px;display:flex;flex-direction:column;justify-content:center">
                <div style="font-size:11px;font-weight:900;color:${brand};text-transform:uppercase;letter-spacing:1px">${wsName}</div>
                <div style="font-size:8px;color:${brand};margin-top:2px">${[wsAddress, wsCity].filter(Boolean).join(', ')}</div>
                <div style="font-size:7px;color:${brand};margin-top:2px">ICE: ${wsIce || '—'} • RC: ${wsRc || '—'} • IF: ${wsTaxId || '—'}</div>
                <div style="font-size:7px;color:${brand};margin-top:1px">CNSS: ${wsCnss || '—'} • TP: ${wsTp || '—'}</div>
            </div>
        </div>

    </div>

    <div style="position:absolute;bottom:8mm;left:10mm;right:10mm;border-top:${cfg.footerTopBorder};padding-top:5px;display:flex;justify-content:space-between;align-items:flex-end">
        <div style="font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;line-height:1.7;width:60%">
            <div style="font-weight:700;color:#111;font-size:9px;margin-bottom:2px">
                ${[wsName, [wsAddress, wsCity].filter(Boolean).join(', ')].filter(Boolean).join(' | ')}
            </div>
            ${wsPhone || wsEmail ? `<div style="text-transform:none;letter-spacing:normal">${[wsPhone && `Tél: ${wsPhone}`, wsEmail].filter(Boolean).join(' • ')}</div>` : ''}
            <div style="font-family:monospace">
                ${[wsIce && `ICE: ${wsIce}`, wsRc && `RC: ${wsRc}`, wsTaxId && `IF: ${wsTaxId}`, wsCnss && `CNSS: ${wsCnss}`, wsTp && `TP: ${wsTp}`].filter(Boolean).join(' • ')}
            </div>
        </div>
        <div style="font-size:8px;color:#9ca3af;line-height:1.7;text-align:right">
            ${bankHtml}
        </div>
    </div>

</div>
</body>
</html>`
}

export async function generatePdfBuffer(html: string): Promise<Buffer> {
    const puppeteer = (await import('puppeteer')).default
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
    const page = await browser.newPage()
    try {
        await page.setRequestInterception(true)
        page.on('request', (req) => {
            const url = req.url()
            if (
                url.startsWith('data:') ||
                url.includes('fonts.googleapis.com') ||
                url.includes('fonts.gstatic.com') ||
                (SUPABASE_HOST && url.includes(SUPABASE_HOST))
            ) {
                req.continue()
            } else {
                req.abort()
            }
        })
        await page.setContent(html, { waitUntil: 'networkidle0' })
        const buffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } })
        return buffer as unknown as Buffer
    } finally {
        await browser.close()
    }
}
