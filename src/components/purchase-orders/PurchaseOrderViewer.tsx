'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PrintButton from '@/components/invoices/PrintButton'
import watermarkImg from '@/assets/imsal-watermark.png'
import DocumentActions from '@/components/ui/DocumentActions'

function numberToFrenchWords(n: number): string {
    if (!n || n === 0) return 'zéro';
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
    function convertHundreds(num: number): string { let str = ''; if (num >= 100) { const h = Math.floor(num / 100); str += (h === 1 ? 'cent ' : units[h] + ' cent '); num %= 100; } if (num >= 20) { const t = Math.floor(num / 10); const r = num % 10; str += tens[t] + (r ? '-' + (r === 1 && t === 7 ? 'et-' : '') + units[r] : ''); } else if (num >= 10) { str += teens[num - 10]; } else if (num > 0) { str += units[num]; } return str.trim(); }
    const chunks = []; let temp = Math.floor(n); while (temp > 0) { chunks.push(temp % 1000); temp = Math.floor(temp / 1000); }
    let result = ''; const scales = ['', 'mille', 'million', 'milliard'];
    for (let i = chunks.length - 1; i >= 0; i--) { const chunk = chunks[i]; if (chunk) result += convertHundreds(chunk) + ' ' + (scales[i] ? scales[i] + ' ' : ''); }
    return result.trim().charAt(0).toUpperCase() + result.trim().slice(1);
}
const formatNumber = (amount: number) => { if (amount === undefined || amount === null) return '0.00'; return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); }
const formatDate = (dateStr: string) => { try { const d = dateStr ? new Date(dateStr) : new Date(); if (isNaN(d.getTime())) return '-'; return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return '-'; } }

interface DocumentViewerProps { document: any; client: any; ws: any; }

export default function PurchaseOrderViewer({ document, client, ws }: DocumentViewerProps) {
    const [showStamp, setShowStamp] = useState(true);
    const [showSignature, setShowSignature] = useState(true);
    const totalInWords = numberToFrenchWords(document.total_ttc || 0);
    const deliveryDate = new Date(document.date); deliveryDate.setDate(deliveryDate.getDate() + 14);

    return (
        // ✅ LAYOUT FIX: ml-72 + relative (no w-full)
        <main className="ml-72 p-8 print:ml-0 print:p-0 flex flex-col items-center relative min-h-screen">

            <div className="w-full max-w-[210mm] flex justify-between items-center mb-6 no-print">
                <div className="flex items-center gap-4">
                    <Link href="/purchase-orders" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"><span className="material-symbols-outlined text-lg">arrow_back</span> Retour</Link>
                    <DocumentActions table="purchase_orders" id={document.id} currentStatus={document.status} redirectAfterDelete="/purchase-orders" />
                </div>
                <div className="flex items-center gap-6 bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-white select-none"><input type="checkbox" checked={showStamp} onChange={(e) => setShowStamp(e.target.checked)} className="accent-[#EAB308] w-4 h-4 cursor-pointer" /> Cachet</label>
                    <div className="w-px h-4 bg-zinc-700"></div>
                    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-white select-none"><input type="checkbox" checked={showSignature} onChange={(e) => setShowSignature(e.target.checked)} className="accent-[#EAB308] w-4 h-4 cursor-pointer" /> Signature</label>
                </div>
                <PrintButton invoiceNumber={document.number} clientName={client?.name} />
            </div>

            <div className="print-container bg-white text-zinc-900 shadow-2xl w-[210mm] min-h-[297mm] relative flex flex-col font-['Inter']">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden"><div className="relative w-[75%] aspect-square opacity-5"><Image src={watermarkImg} alt="Watermark" fill className="object-contain" placeholder="blur" /></div></div>
                <div className="h-2 w-full bg-[#EAB308] relative z-10"></div>

                <div className="p-[10mm] pb-8 flex-1 flex flex-col relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-1/2">{ws?.logo_url ? (<div className="relative w-64 h-24"><Image src={ws.logo_url} alt="Logo" fill className="object-contain object-left" unoptimized /></div>) : (<h1 className="text-2xl font-bold uppercase tracking-tight">{ws?.name}</h1>)}</div>
                        <div className="w-1/2 text-right"><h1 className="text-4xl font-[800] tracking-tighter text-zinc-900 uppercase">Bon de<br />Commande</h1><p className="text-zinc-600 font-bold mt-1 text-base tracking-widest">N° {document.number}</p></div>
                    </div>

                    <div className="flex justify-between items-start mb-6 gap-12">
                        <div className="w-1/2 text-sm leading-relaxed">
                            <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2 border-b border-zinc-200 pb-1 w-20">Acheteur</h3>
                            <p className="font-bold text-zinc-900 text-base">{ws?.name}</p>
                            <p className="text-zinc-600">{ws?.address}</p>
                            <p className="text-zinc-600">{ws?.city}, {ws?.country}</p>
                            <div className="mt-2 pt-2 border-t border-zinc-100 text-xs text-zinc-600 space-y-1">
                                {ws?.phone && <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[12px]">call</span> {ws.phone}</p>}
                                {ws?.email && <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[12px]">mail</span> {ws.email}</p>}
                                <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[12px]">mail</span> i.assal@imsalservices.com</p>
                            </div>
                        </div>
                        <div className="w-1/2 text-left flex flex-col items-start">
                            <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2 border-b border-zinc-200 pb-1 w-20 text-left">Fournisseur</h3>
                            <p className="font-bold text-zinc-900 text-xl">{client?.name}</p>
                            <p className="text-zinc-600">{client?.address}</p>
                            <p className="text-zinc-600">{client?.city} {client?.country}</p>
                            <div className="mt-4 flex gap-8 text-left">
                                <div><p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Date de commande</p><p className="font-semibold text-zinc-900">{formatDate(document.date)}</p></div>
                                <div><p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Livraison Souhaitée</p><p className="font-semibold text-[#EAB308]">{formatDate(deliveryDate.toISOString())}</p></div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-2">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-zinc-800">
                                    <th className="text-left text-[10px] uppercase font-bold text-zinc-600 pb-2 w-[40%] tracking-widest">Description</th>
                                    {/* ✅ UNIT COLUMN */}
                                    <th className="text-center text-[10px] uppercase font-bold text-zinc-600 pb-2 w-[10%] tracking-widest">Unité</th>
                                    <th className="text-center text-[10px] uppercase font-bold text-zinc-600 pb-2 w-[10%] tracking-widest">Qté</th>
                                    <th className="text-right text-[10px] uppercase font-bold text-zinc-600 pb-2 w-[20%] tracking-widest">Prix Unit.</th>
                                    <th className="text-right text-[10px] uppercase font-bold text-zinc-600 pb-2 w-[20%] tracking-widest">Total HT</th>
                                </tr>
                            </thead>
                            <tbody className="text-[12px]">
                                {document.purchase_order_items?.map((item: any, idx: number) => (
                                    <tr key={item.id} className={`border-b ${idx === document.purchase_order_items.length - 1 ? 'border-zinc-800' : 'border-zinc-200'}`}>
                                        <td className="py-3 font-semibold text-zinc-900">{item.description}</td>
                                        <td className="py-3 text-center text-zinc-500 font-mono text-[11px] uppercase">{item.unit || '-'}</td>
                                        <td className="py-3 text-center text-zinc-600 font-mono">{item.quantity}</td>
                                        <td className="py-3 text-right text-zinc-600 font-mono">{formatNumber(item.unit_price)}</td>
                                        <td className="py-3 text-right font-bold text-zinc-900 font-mono">{formatNumber(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="break-inside-avoid font-['Inter'] mt-4 mb-6 grid grid-cols-2 gap-12 items-end">
                        <div className="flex flex-col gap-4">
                            <div className="text-xs text-zinc-500 leading-relaxed text-left">
                                <p className="mb-2">Arrêté le présent bon de commande à la somme de :<br /><span className="font-bold text-zinc-900 uppercase leading-normal">{totalInWords} Dirhams TTC</span></p>
                                <div className="mt-2 pt-2 border-t border-zinc-200"><p className="font-bold text-zinc-800">Conditions:</p><p>Paiement: Net 30 jours (Virement Bancaire).</p></div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="space-y-1 text-right">
                                <div className="flex justify-between text-xs text-zinc-600"><span>Total HT</span><span className="font-mono text-zinc-900 whitespace-nowrap">{formatNumber(document.total_ht)} DH</span></div>
                                <div className="flex justify-between text-xs text-zinc-600 pb-2 border-b border-zinc-200"><span>TVA (20%)</span><span className="font-mono text-zinc-900 whitespace-nowrap">{formatNumber(document.total_tva)} DH</span></div>
                            </div>
                            <div className="flex items-center justify-end gap-6"><span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Total TTC</span><div className="text-xl font-[800] text-zinc-900 bg-[#EAB308]/10 px-4 py-2 rounded-lg border border-[#EAB308]/20 text-right whitespace-nowrap">{formatNumber(document.total_ttc)} DH</div></div>
                        </div>
                    </div>

                    <div className="flex justify-end pr-8 pb-4 h-28 relative select-none"><div className="relative w-72 h-28">{showStamp && (<div className="absolute bottom-4 right-10 z-20 pointer-events-none"><div className="w-64 h-28 border-4 border-double border-blue-900 opacity-90 mix-blend-multiply flex flex-col items-center justify-center p-2 text-center rotate-[-2deg] bg-blue-50/10"><div className="w-full text-[12px] font-[900] text-blue-900 uppercase tracking-widest leading-none mb-1">{ws?.name || 'IMSAL SARL'}</div><div className="text-[8px] font-semibold text-blue-900 uppercase leading-tight px-4">{ws?.address}, {ws?.city}</div><div className="text-[7px] font-medium text-blue-900 mt-1 leading-tight px-2">ICE: {ws?.ice || '-'} • RC: {ws?.rc || '-'} • IF: {ws?.tax_id || '-'}<br />CNSS: 5249290 • TP: 43003134</div><div className="text-[8px] font-bold text-blue-900 uppercase mt-1 border-t border-blue-900 w-full pt-0.5">COMMANDE VALIDÉE</div></div></div>)}{showSignature && (<div className="absolute bottom-8 right-12 z-30 pointer-events-none transform -rotate-12"><div className="text-6xl text-blue-900 opacity-90 drop-shadow-sm" style={{ fontFamily: "'Ballet', cursive", textShadow: '2px 2px 2px rgba(0,0,0,0.1)' }}>Assal</div></div>)}</div></div>
                    <div className="mt-auto border-t border-zinc-200 pt-4 text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed"><div className="flex justify-between items-end"><div className="w-2/3"><p className="font-bold text-zinc-900 mb-1 text-xs">{ws?.name} | {ws?.address}, {ws?.city}</p><p className="text-zinc-500 normal-case tracking-normal mb-1">Tél: {ws?.phone || '-'} • Email: i.assal@imsalservices.com • Web: imsalservices.ma</p><p className="text-zinc-400 mb-0.5">ICE: {ws?.ice || '-'} • RC: {ws?.rc || '-'}</p><p className="text-zinc-400">IF: {ws?.tax_id || '-'} • CNSS: 5249290 • TP: 43003134</p></div><div className="text-right"><p className="font-bold text-zinc-900 mb-1">Coordonnées Bancaires</p><p>Banque: {ws?.bank_name || 'BANK OF AFRICA'}</p><p>RIB: <span className="font-mono font-bold text-zinc-800">011170000008210000137110</span></p></div></div></div>
                </div>
            </div>
        </main>
    )
}