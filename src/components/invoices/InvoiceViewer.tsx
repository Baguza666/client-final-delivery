'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import PrintButton from './PrintButton'
import DocumentActions from '@/components/ui/DocumentActions'
import DocumentActionBar from '@/components/ui/DocumentActionBar'
import StampSigToggles from '@/components/ui/StampSigToggles'
import { type Template, TEMPLATE_META } from '@/lib/document-templates'
import { sendInvoiceEmail } from '@/app/actions/email'
import { generateShareLink } from '@/app/actions/shareLinks'
import { convertInvoiceToDeliveryNote } from '@/app/actions/convert'
import DocumentPage, { type DocumentTotals } from '@/components/documents/DocumentPage'

function toFrenchWords(n: number): string {
    if (!n || n === 0) return 'Zéro'
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

const ITEMS_PER_PAGE = 4
function chunkItems(items: any[]) {
    const chunks = []
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) chunks.push(items.slice(i, i + ITEMS_PER_PAGE))
    return chunks.length > 0 ? chunks : [[]]
}

interface InvoiceViewerProps { invoice: any; client: any; ws: any }

export default function InvoiceViewer({ invoice, client, ws }: InvoiceViewerProps) {
    const [showStamp, setShowStamp] = useState(true)
    const [showSignature, setShowSignature] = useState(true)
    const [template, setTemplate] = useState<Template>((ws?.document_template as Template) || 'classic')
    const [emailModal, setEmailModal] = useState(false)
    const [emailTo, setEmailTo] = useState(client?.email || '')
    const [emailSending, setEmailSending] = useState(false)
    const [emailResult, setEmailResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [shareUrl, setShareUrl] = useState<string | null>(null)
    const [shareLoading, setShareLoading] = useState(false)
    const [shareCopied, setShareCopied] = useState(false)
    const [convertingBL, setConvertingBL] = useState(false)
    const [convertMsg, setConvertMsg] = useState<string | null>(null)

    const handleConvertToBL = async () => {
        setConvertingBL(true)
        const result = await convertInvoiceToDeliveryNote(invoice.id)
        setConvertingBL(false)
        setConvertMsg(result.success ? 'BL créé avec succès' : (result.error || 'Erreur de conversion'))
        setTimeout(() => setConvertMsg(null), 3000)
    }

    const handleShare = async () => {
        setShareLoading(true)
        const result = await generateShareLink(invoice.id)
        setShareLoading(false)
        if (result.url) {
            const fullUrl = window.location.origin + result.url
            setShareUrl(fullUrl)
            await navigator.clipboard.writeText(fullUrl).catch(() => {})
            setShareCopied(true)
            setTimeout(() => setShareCopied(false), 3000)
        }
    }

    const handleSendEmail = async () => {
        if (!emailTo.trim()) return
        setEmailSending(true)
        setEmailResult(null)
        const result = await sendInvoiceEmail(invoice.id, emailTo.trim())
        setEmailSending(false)
        if (result?.success) {
            setEmailResult({ type: 'success', message: 'Email envoyé avec succès !' })
            setTimeout(() => { setEmailModal(false); setEmailResult(null) }, 2000)
        } else {
            setEmailResult({ type: 'error', message: result?.message || "Erreur d'envoi." })
        }
    }

    const brandColor = ws?.brand_color || '#2563EB'
    const items = invoice.invoice_items || []

    // Compute totals
    const totalHT = items.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0)
    const discountPercent = Number(invoice.discount) || 0
    const discountAmount = totalHT * (discountPercent / 100)
    const netHT = totalHT - discountAmount
    const currency = invoice.currency || 'MAD'
    const exchangeRate = Number(invoice.exchange_rate) || 1
    const discountRatio = totalHT > 0 ? netHT / totalHT : 1
    const tvaByRate: Record<number, number> = {}
    items.forEach((item: any) => {
        const rate = Number(item.tva_rate ?? 20)
        const lineHT = (Number(item.total) || 0) * discountRatio
        tvaByRate[rate] = (tvaByRate[rate] || 0) + lineHT * (rate / 100)
    })
    const totalTVA = Object.values(tvaByRate).reduce((s, v) => s + v, 0) || netHT * 0.20
    const totalTTC = netHT + totalTVA

    const totals: DocumentTotals = {
        totalHT, discountPercent, discountAmount, netHT,
        tvaByRate, totalTVA, totalTTC,
        totalInWords: toFrenchWords(totalTTC),
        currency, exchangeRate,
    }

    const paginatedItems = chunkItems(items)

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-6 md:py-8 w-full flex flex-col items-center relative print:p-0 print:m-0 print:w-full print:block print:bg-white">
            <DocumentActionBar
                left={
                    <>
                        <Link href="/invoices" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                            Retour
                        </Link>
                        <DocumentActions table="invoices" id={invoice.id} currentStatus={invoice.status} redirectAfterDelete="/invoices" />
                    </>
                }
                center={
                    <>
                        <StampSigToggles showStamp={showStamp} showSignature={showSignature} onStampChange={setShowStamp} onSigChange={setShowSignature} />
                        <div className="w-px h-4 bg-zinc-700" />
                        <div className="flex items-center gap-0.5">
                            {(Object.keys(TEMPLATE_META) as Template[]).map((t) => (
                                <button key={t} type="button" onClick={() => setTemplate(t)}
                                    className={"px-2.5 py-1 rounded-md text-xs font-bold transition-all " + (template === t ? "bg-primary/20 text-primary" : "text-zinc-500 hover:text-zinc-300")}>
                                    {TEMPLATE_META[t]}
                                </button>
                            ))}
                        </div>
                    </>
                }
                right={
                    <>
                        {convertMsg && <span className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300">{convertMsg}</span>}
                        <button onClick={handleConvertToBL} disabled={convertingBL}
                            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold disabled:opacity-50"
                            title="Créer un Bon de Livraison depuis cette facture">
                            <span className="material-symbols-outlined text-[16px]">{convertingBL ? 'progress_activity' : 'local_shipping'}</span>
                            Créer BL
                        </button>
                        <button onClick={handleShare} disabled={shareLoading}
                            className={"flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-semibold border " + (shareCopied ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-white/10')}>
                            <span className="material-symbols-outlined text-[16px]">{shareCopied ? 'check' : 'link'}</span>
                            {shareLoading ? 'Génération…' : shareCopied ? 'Copié !' : 'Lien'}
                        </button>
                        <button onClick={() => { setEmailTo(client?.email || ''); setEmailResult(null); setEmailModal(true) }}
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold">
                            <span className="material-symbols-outlined text-[16px]">send</span>
                            Envoyer
                        </button>
                        <PrintButton invoiceNumber={invoice.invoice_number} clientName={client?.name} invoiceId={invoice.id} template={template} />
                    </>
                }
            />

            <div className="flex flex-col gap-8 print:block print:gap-0 print:bg-white">
                {paginatedItems.map((pageItems, pageIndex) => (
                    <DocumentPage
                        key={pageIndex}
                        docTitle="Facture"
                        docNumber={invoice.invoice_number}
                        date={invoice.date}
                        notes={invoice.notes}
                        ws={ws}
                        client={client}
                        template={template}
                        brandColor={brandColor}
                        pageItems={pageItems}
                        pageIndex={pageIndex}
                        totalPages={paginatedItems.length}
                        isLastPage={pageIndex === paginatedItems.length - 1}
                        showPrices={true}
                        totals={totals}
                        showStamp={showStamp}
                        showSignature={showSignature}
                    />
                ))}
            </div>

            {emailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-lg font-bold text-white mb-1">Envoyer par email</h2>
                        <p className="text-zinc-500 text-sm mb-5">Facture N° {invoice.invoice_number} · {client?.name}</p>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Adresse email du destinataire</label>
                        <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)}
                            placeholder="client@example.com"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none transition-all text-sm mb-4"
                            onKeyDown={e => e.key === 'Enter' && handleSendEmail()} />
                        {emailResult && (
                            <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg mb-4 ${emailResult.type === 'success' ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'}`}>
                                <span className="material-symbols-outlined text-[18px]">{emailResult.type === 'success' ? 'check_circle' : 'error'}</span>
                                {emailResult.message}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => { setEmailModal(false); setEmailResult(null) }}
                                className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 font-semibold px-4 py-3 rounded-xl transition-all text-sm">
                                Annuler
                            </button>
                            <button onClick={handleSendEmail} disabled={emailSending || !emailTo.trim()}
                                className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold px-4 py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                                {emailSending
                                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Envoi…</>
                                    : <><span className="material-symbols-outlined text-[18px]">send</span>Envoyer</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
