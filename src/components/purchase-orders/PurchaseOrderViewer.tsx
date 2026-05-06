'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import PrintButton from '@/components/invoices/PrintButton'
import DocumentActions from '@/components/ui/DocumentActions'
import DocumentActionBar from '@/components/ui/DocumentActionBar'
import StampSigToggles from '@/components/ui/StampSigToggles'
import { type Template, TEMPLATE_META } from '@/lib/document-templates'
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

const ITEMS_PER_PAGE = 5
function chunkItems(items: any[]) {
    const chunks = []
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) chunks.push(items.slice(i, i + ITEMS_PER_PAGE))
    return chunks.length > 0 ? chunks : [[]]
}

interface DocumentViewerProps { document: any; client: any; ws: any }

export default function PurchaseOrderViewer({ document, client, ws }: DocumentViewerProps) {
    const [showStamp, setShowStamp] = useState(true)
    const [showSignature, setShowSignature] = useState(true)
    const [template, setTemplate] = useState<Template>((ws?.document_template as Template) || 'classic')

    const brandColor = ws?.brand_color || '#2563EB'
    const items = document.purchase_order_items || []

    const totalHT = Number(document.total_ht) || 0
    const totalTVA = Number(document.total_tva) || 0
    const totalTTC = Number(document.total_ttc) || 0

    const totals: DocumentTotals = {
        totalHT,
        discountPercent: 0,
        discountAmount: 0,
        netHT: totalHT,
        tvaByRate: {},
        totalTVA,
        totalTTC,
        totalInWords: toFrenchWords(totalTTC),
        currency: 'MAD',
        exchangeRate: 1,
    }

    const paginatedItems = chunkItems(items)

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col items-center relative min-h-screen print:p-0 print:m-0 print:w-full print:block print:bg-white print:min-h-0">
            <DocumentActionBar
                left={
                    <>
                        <Link href="/purchase-orders" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                            Retour
                        </Link>
                        <Link href={`/purchase-orders/${document.id}/edit`} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition border border-white/10">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            Modifier
                        </Link>
                        <DocumentActions table="purchase_orders" id={document.id} currentStatus={document.status} redirectAfterDelete="/purchase-orders" />
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
                right={<PrintButton invoiceNumber={document.number} clientName={client?.name} />}
            />

            <div className="flex flex-col gap-8 print:block print:gap-0 print:bg-white">
                {paginatedItems.map((pageItems, pageIndex) => (
                    <DocumentPage
                        key={pageIndex}
                        docTitle={'Bon de\nCommande'}
                        docNumber={document.number}
                        date={document.date}
                        ws={ws}
                        client={client}
                        template={template}
                        brandColor={brandColor}
                        pageItems={pageItems}
                        pageIndex={pageIndex}
                        totalPages={paginatedItems.length}
                        isLastPage={pageIndex === paginatedItems.length - 1}
                        showPrices={true}
                        stampLabel="COMMANDE VALIDÉE"
                        totals={totals}
                        showStamp={showStamp}
                        showSignature={showSignature}
                        clientLabel="Fournisseur"
                    />
                ))}
            </div>
        </main>
    )
}
