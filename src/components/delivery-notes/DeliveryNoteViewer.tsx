'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PrintButton from '@/components/invoices/PrintButton'
import watermarkImg from '@/assets/imsal-watermark.png'
import DocumentActions from '@/components/ui/DocumentActions'

const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

interface DocumentViewerProps { document: any; client: any; ws: any; }

export default function DeliveryNoteViewer({ document, client, ws }: DocumentViewerProps) {
    const [showStamp, setShowStamp] = useState(true);
    const [showSignature, setShowSignature] = useState(true);

    return (
        // ✅ LAYOUT FIX: 'ml-72' pushes content, flex centers the A4 page in remaining space.
        <main className="ml-72 p-8 print:ml-0 print:p-0 flex flex-col items-center relative min-h-screen">

            <div className="w-full max-w-[210mm] flex justify-between items-center mb-6 no-print">
                <div className="flex items-center gap-4">
                    <Link href="/delivery-notes" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        Retour
                    </Link>
                    <DocumentActions table="delivery_notes" id={document.id} currentStatus={document.status} redirectAfterDelete="/delivery-notes" />
                </div>
                <div className="flex items-center gap-6 bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-white select-none"><input type="checkbox" checked={showStamp} onChange={(e) => setShowStamp(e.target.checked)} className="accent-[#EAB308] w-4 h-4 cursor-pointer" /> Cachet</label>
                    <div className="w-px h-4 bg-zinc-700"></div>
                    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-white select-none"><input type="checkbox" checked={showSignature} onChange={(e) => setShowSignature(e.target.checked)} className="accent-[#EAB308] w-4 h-4 cursor-pointer" /> Signature</label>
                </div>
                <PrintButton invoiceNumber={document.number} clientName={client?.name} />
            </div>

            <div className="print-container bg-white text-zinc-900 shadow-2xl w-[210mm] min-h-[297mm] relative flex flex-col font-['Inter']">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                    <div className="relative w-[75%] aspect-square opacity-5">
                        <Image src={watermarkImg} alt="Watermark" fill className="object-contain" placeholder="blur" />
                    </div>
                </div>
                <div className="h-2 w-full bg-[#EAB308] relative z-10"></div>

                <div className="p-[10mm] pb-8 flex-1 flex flex-col relative z-10">
                    {/* Header - HARDCODED LOGO */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-1/2"><img src="/logo.png" alt="IMSAL Services" width={150} className="object-contain" /></div>
                        <div className="w-1/2 text-right"><h1 className="text-4xl font-[800] tracking-tighter text-zinc-900 uppercase">Bon de<br />Livraison</h1><p className="text-zinc-600 font-bold mt-1 text-base tracking-widest">N° {document.number}</p></div>
                    </div>

                    <div className="flex justify-between items-start mb-6 gap-12">
                        {/* Sender - HARDCODED */}
                        <div className="w-1/2 text-sm leading-relaxed">
                            <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2 border-b border-zinc-200 pb-1 w-20">Émetteur</h3>
                            <p className="font-bold text-zinc-900 text-base">IMSAL SERVICES</p>
                            <p className="text-zinc-600">7 Lotis Najmat El Janoub</p>
                            <p className="text-zinc-600">El Jadida, Maroc</p>
                            <div className="mt-2 pt-2 border-t border-zinc-100 text-xs text-zinc-600 space-y-1">
                                <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[12px]">call</span> +212(0)6 61 43 52 83</p>
                                <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[12px]">mail</span> i.assal@imsalservices.com</p>
                            </div>
                        </div>
                        <div className="w-1/2 text-left flex flex-col items-start">
                            <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2 border-b border-zinc-200 pb-1 w-20 text-left">Destinataire</h3>
                            <p className="font-bold text-zinc-900 text-xl">{client?.name}</p>
                            <p className="text-zinc-600">{client?.address}</p>
                            <p className="text-zinc-600">{client?.city} {client?.country}</p>
                            {(client?.ice || client?.email) && (<div className="mt-1 text-xs text-zinc-500 font-mono">{client?.ice && <span>ICE: {client.ice}</span>}</div>)}
                            <div className="mt-4 flex gap-8 text-left">
                                <div><p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Date de livraison</p><p className="font-semibold text-zinc-900">{formatDate(document.date)}</p></div>
                                <div><p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Mode</p><p className="font-semibold text-zinc-900">Transporteur / Main Propre</p></div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-2">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-zinc-800">
                                    <th className="text-left text-[10px] uppercase font-bold text-zinc-600 pb-2 w-[60%] tracking-widest">Description</th>
                                    {/* ✅ UNIT COLUMN */}
                                    <th className="text-center text-[10px] uppercase font-bold text-zinc-600 pb-2 w-[20%] tracking-widest">Unité</th>
                                    <th className="text-center text-[10px] uppercase font-bold text-zinc-600 pb-2 w-[20%] tracking-widest">Qté</th>
                                </tr>
                            </thead>
                            <tbody className="text-[12px]">
                                {document.delivery_note_items?.map((item: any, idx: number) => (
                                    <tr key={item.id} className={`border-b ${idx === document.delivery_note_items.length - 1 ? 'border-zinc-800' : 'border-zinc-200'}`}>
                                        <td className="py-3 font-semibold text-zinc-900">{item.description}</td>
                                        <td className="py-3 text-center text-zinc-500 font-mono text-[11px] uppercase">{item.unit || '-'}</td>
                                        <td className="py-3 text-center text-zinc-600 font-mono">{item.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="break-inside-avoid font-['Inter'] mt-8 mb-6"><p className="text-xs text-zinc-500 italic border-l-2 border-[#EAB308] pl-3">Marchandise reçue en bon état et conforme à la commande.<br /><span className="not-italic font-bold text-zinc-800 mt-1 block">Réf. Commande: {document.number?.replace('BL', 'CMD') || 'N/A'}</span></p></div>

                    <div className="flex justify-end pr-8 pb-4 h-28 relative select-none mt-auto">
                        <div className="relative w-72 h-28">
                            {showStamp && (<div className="absolute bottom-4 right-10 z-20 pointer-events-none"><div className="w-64 h-28 border-4 border-double border-blue-900 opacity-90 mix-blend-multiply flex flex-col items-center justify-center p-2 text-center rotate-[-2deg] bg-blue-50/10"><div className="w-full text-[12px] font-[900] text-blue-900 uppercase tracking-widest leading-none mb-1">{ws?.name || 'IMSAL SARL'}</div><div className="text-[8px] font-semibold text-blue-900 uppercase leading-tight px-4">{ws?.address}, {ws?.city}</div><div className="text-[7px] font-medium text-blue-900 mt-1 leading-tight px-2">ICE: {ws?.ice || '-'} • RC: {ws?.rc || '-'} • IF: {ws?.tax_id || '-'}<br />CNSS: 5249290 • TP: 43003134</div><div className="text-[8px] font-bold text-blue-900 uppercase mt-1 border-t border-blue-900 w-full pt-0.5">REÇU CONFORME</div></div></div>)}
                            {showSignature && (<div className="absolute bottom-8 right-12 z-30 pointer-events-none transform -rotate-12"><div className="text-6xl text-blue-900 opacity-90 drop-shadow-sm" style={{ fontFamily: "'Ballet', cursive", textShadow: '2px 2px 2px rgba(0,0,0,0.1)' }}>Assal</div></div>)}
                        </div>
                    </div>

                    {/* Footer - HARDCODED LEGAL IDS */}
                    <div className="mt-auto border-t border-zinc-200 pt-4 text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed">
                        <div className="flex justify-between items-end">
                            <div className="w-2/3">
                                <p className="font-bold text-zinc-900 mb-1 text-xs">IMSAL SERVICES | 7 Lotis Najmat El Janoub, El Jadida</p>
                                <p className="text-zinc-500 normal-case tracking-normal mb-1">Tél: +212(0)6 61 43 52 83 • Email: i.assal@imsalservices.com • Web: imsalservices.ma</p>
                                <p className="text-zinc-400 font-mono">ICE: 002972127000089 • RC: 19215 • IF: 000081196000005 • CNSS: 5249290 • TP: 43003134</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-zinc-900 mb-1">Coordonnées Bancaires</p>
                                <p>Banque: BANK OF AFRICA</p>
                                <p>RIB: <span className="font-mono font-bold text-zinc-800">011170000008210000137110</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}