'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PrintButton from '@/components/invoices/PrintButton'
import { convertQuoteToDocuments } from '@/app/actions/convert'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
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

const ITEMS_PER_PAGE = 4
function chunkItems(items: any[]) {
    const chunks = []
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) chunks.push(items.slice(i, i + ITEMS_PER_PAGE))
    return chunks.length > 0 ? chunks : [[]]
}

interface DocumentViewerProps { document: any; client: any; ws: any }

export default function QuoteViewer({ document, client, ws }: DocumentViewerProps) {
    const router = useRouter()
    const [showStamp, setShowStamp] = useState(true)
    const [showSignature, setShowSignature] = useState(true)
    const [template, setTemplate] = useState<Template>((ws?.document_template as Template) || 'classic')
    const [isPending, startTransition] = useTransition()
    const [isModalOpen, setIsModalOpen] = useState(false)

    const brandColor = ws?.brand_color || '#2563EB'
    const items = document.quote_items || []

    // Compute totals
    const totalHT = items.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0)
    const discountPercent = Number(document.discount) || 0
    const discountAmount = totalHT * (discountPercent / 100)
    const netHT = totalHT - discountAmount
    const totalTVA = netHT * 0.20
    const totalTTC = netHT + totalTVA
    const tvaByRate: Record<number, number> = {}

    const totals: DocumentTotals = {
        totalHT, discountPercent, discountAmount, netHT,
        tvaByRate, totalTVA, totalTTC,
        totalInWords: toFrenchWords(totalTTC),
        currency: 'MAD', exchangeRate: 1,
    }

    const confirmConversion = () => {
        startTransition(async () => {
            try {
                const response = await convertQuoteToDocuments(document.id)
                if (response.success && response.invoiceId) {
                    setIsModalOpen(false)
                    router.push(`/invoices/${response.invoiceId}`)
                } else {
                    alert(`Échec: ${response.error}`)
                    setIsModalOpen(false)
                }
            } catch (error: any) {
                alert(`Erreur inattendue: ${error.message}`)
                setIsModalOpen(false)
            }
        })
    }

    const paginatedItems = chunkItems(items)

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col items-center relative min-h-screen print:p-0 print:m-0 print:w-full print:block print:bg-white print:min-h-0">
            <ConfirmationModal
                isOpen={isModalOpen}
                title="Transformer en Facture ?"
                message="Cette action va générer automatiquement la Facture associée. Voulez-vous continuer ?"
                onConfirm={confirmConversion}
                onCancel={() => setIsModalOpen(false)}
                isLoading={isPending}
            />

            <DocumentActionBar
                left={
                    <>
                        <Link href="/quotes" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                            Retour
                        </Link>
                        <DocumentActions table="quotes" id={document.id} currentStatus={document.status} redirectAfterDelete="/quotes" />
                        <div className="h-6 w-px bg-zinc-800" />
                        <button onClick={() => setIsModalOpen(true)} disabled={isPending || document.status === 'accepted'}
                            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20">
                            <span className="material-symbols-outlined text-[15px]">rocket_launch</span>
                            {document.status === 'accepted' ? 'Déjà Facturé' : 'Valider & Facturer'}
                        </button>
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
                        docTitle="Devis"
                        docNumber={document.number}
                        date={document.date || new Date().toISOString()}
                        notes={document.notes}
                        ws={ws}
                        client={client}
                        template={template}
                        brandColor={brandColor}
                        pageItems={pageItems}
                        pageIndex={pageIndex}
                        totalPages={paginatedItems.length}
                        isLastPage={pageIndex === paginatedItems.length - 1}
                        showPrices={true}
                        stampLabel="BON POUR ACCORD"
                        totals={totals}
                        showStamp={showStamp}
                        showSignature={showSignature}
                        clientLabel="Client"
                    />
                ))}
            </div>
        </main>
    )
}
