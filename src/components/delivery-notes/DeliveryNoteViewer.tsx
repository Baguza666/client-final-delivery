'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import PrintButton from '@/components/invoices/PrintButton'
import DocumentActions from '@/components/ui/DocumentActions'
import DocumentActionBar from '@/components/ui/DocumentActionBar'
import StampSigToggles from '@/components/ui/StampSigToggles'
import { type Template, TEMPLATE_META } from '@/lib/document-templates'
import DocumentPage from '@/components/documents/DocumentPage'

const ITEMS_PER_PAGE = 8
function chunkItems(items: any[]) {
    const chunks = []
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) chunks.push(items.slice(i, i + ITEMS_PER_PAGE))
    return chunks.length > 0 ? chunks : [[]]
}

interface DocumentViewerProps { document: any; client: any; ws: any }

export default function DeliveryNoteViewer({ document, client, ws }: DocumentViewerProps) {
    const [showStamp, setShowStamp] = useState(true)
    const [showSignature, setShowSignature] = useState(true)
    const [template, setTemplate] = useState<Template>((ws?.document_template as Template) || 'classic')

    const brandColor = ws?.brand_color || '#2563EB'
    const items = document.delivery_note_items || []
    const paginatedItems = chunkItems(items)

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col items-center relative min-h-screen print:p-0 print:m-0 print:w-full print:block print:bg-white print:min-h-0">
            <DocumentActionBar
                left={
                    <>
                        <Link href="/delivery-notes" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                            Retour
                        </Link>
                        <Link href={`/delivery-notes/${document.id}/edit`} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition border border-white/10">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            Modifier
                        </Link>
                        <DocumentActions table="delivery_notes" id={document.id} currentStatus={document.status} redirectAfterDelete="/delivery-notes" />
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
                        docTitle={'Bon de\nLivraison'}
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
                        showPrices={false}
                        stampLabel="REÇU CONFORME"
                        showStamp={showStamp}
                        showSignature={showSignature}
                        clientLabel="Destinataire"
                    />
                ))}
            </div>
        </main>
    )
}
