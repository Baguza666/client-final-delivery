'use client'

import React, { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PrintButton from '@/components/invoices/PrintButton'
import { convertQuoteToInvoice } from '@/app/actions/convert'
import watermarkImg from '@/assets/imsal-watermark.png'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import DocumentActions from '@/components/ui/DocumentActions'

// --- HELPERS ---
function numberToFrenchWords(n: number): string {
    if (!n || n === 0) return 'zéro';
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

    function convertHundreds(num: number): string {
        let str = '';
        if (num >= 100) {
            const hundredDigit = Math.floor(num / 100);
            const remainder = num % 100;
            if (hundredDigit === 1) str += 'cent '; else str += units[hundredDigit] + ' cent ';
            num = remainder;
        }
        if (num >= 20) {
            const tenDigit = Math.floor(num / 10);
            const remainder = num % 10;
            if (tenDigit === 7 || tenDigit === 9) {
                str += tens[tenDigit - 1] + '-';
                if (tenDigit === 7 && remainder === 1) str = str.replace(/-$/, ' et ');
                str += (remainder < 10) ? teens[remainder] : teens[remainder];
            } else {
                str += tens[tenDigit];
                if (remainder === 1 && tenDigit < 8) str += ' et ';
                else if (remainder > 0) str += '-';
                if (remainder > 0) str += units[remainder];
            }
        } else if (num >= 10) { str += teens[num - 10]; } else if (num > 0) { str += units[num]; }
        return str.trim();
    }
    const chunks = []; let temp = Math.floor(n); while (temp > 0) { chunks.push(temp % 1000); temp = Math.floor(temp / 1000); }
    let result = '';
    const scales = ['', 'mille', 'million', 'milliard'];
    for (let i = chunks.length - 1; i >= 0; i--) {
        const chunk = chunks[i]; if (chunk === 0) continue; const scale = scales[i];
        let chunkText = convertHundreds(chunk); if (i === 1 && chunk === 1) chunkText = '';
        result += chunkText + ' '; if (scale) { result += scale; if (chunk > 1 && i > 1) result += 's'; result += ' '; }
    }
    return result.trim().charAt(0).toUpperCase() + result.trim().slice(1);
}

const formatNumber = (amount: number) => { if (amount === undefined || amount === null) return '0.00'; return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); }
const formatDate = (dateStr: string) => { try { const d = dateStr ? new Date(dateStr) : new Date(); if (isNaN(d.getTime())) return '-'; return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return '-'; } }

// ✅ CHUNKING ENGINE: Reverted to 4 items per page
const ITEMS_PER_PAGE = 4;
function chunkItems(items: any[]) {
    const chunks = [];
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
        chunks.push(items.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks.length > 0 ? chunks : [[]];
}

interface DocumentViewerProps { document: any; client: any; ws: any; }

export default function QuoteViewer({ document, client, ws }: DocumentViewerProps) {
    const router = useRouter();
    const [showStamp, setShowStamp] = useState(true);
    const [showSignature, setShowSignature] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- MATH ---
    const items = document.quote_items || [];
    const calculatedTotalHT = items.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
    const discountPercent = document.discount || 0;
    const discountAmount = calculatedTotalHT * (discountPercent / 100);
    const netHT = calculatedTotalHT - discountAmount;
    const calculatedTVA = netHT * 0.20;
    const calculatedTotalTTC = netHT + calculatedTVA;
    const totalInWords = numberToFrenchWords(calculatedTotalTTC);

    const docDateStr = document.date ? new Date(document.date).toISOString() : new Date().toISOString();

    const handleConvertClick = () => setIsModalOpen(true);

    const confirmConversion = () => {
        startTransition(async () => {
            try {
                const response = await convertQuoteToInvoice(document.id);
                if (response.success && response.invoiceId) {
                    setIsModalOpen(false);
                    router.push(`/invoices/${response.invoiceId}`);
                } else {
                    alert(`Échec: ${response.error}`);
                    setIsModalOpen(false);
                }
            } catch (error: any) {
                alert(`Erreur inattendue: ${error.message}`);
                setIsModalOpen(false);
            }
        });
    };

    const paginatedItems = chunkItems(items);

    return (
        <main className="ml-72 p-8 print:ml-0 print:p-0 flex flex-col items-center relative min-h-screen print:bg-white">

            <ConfirmationModal
                isOpen={isModalOpen}
                title="Transformer en Facture ?"
                message="Cette action va générer automatiquement la Facture associée. Voulez-vous continuer ?"
                onConfirm={confirmConversion}
                onCancel={() => setIsModalOpen(false)}
                isLoading={isPending}
            />

            {/* ACTION BAR */}
            <div className="w-full max-w-[210mm] flex justify-between items-center mb-6 no-print print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/quotes" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        Retour
                    </Link>
                    <DocumentActions table="quotes" id={document.id} currentStatus={document.status} redirectAfterDelete="/quotes" />
                    <div className="h-6 w-px bg-zinc-800 mx-2"></div>
                    <button
                        onClick={handleConvertClick}
                        disabled={isPending || document.status === 'accepted'}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-md font-bold text-xs hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                    >
                        {document.status === 'accepted' ? 'Déjà Facturé' : 'Valider & Facturer'}
                        {!document.status && <span className="material-symbols-outlined text-sm">rocket_launch</span>}
                    </button>
                </div>

                <div className="flex items-center gap-6 bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-white select-none"><input type="checkbox" checked={showStamp} onChange={(e) => setShowStamp(e.target.checked)} className="accent-[#EAB308] w-4 h-4 cursor-pointer" /> Cachet</label>
                    <div className="w-px h-4 bg-zinc-700"></div>
                    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-white select-none"><input type="checkbox" checked={showSignature} onChange={(e) => setShowSignature(e.target.checked)} className="accent-[#EAB308] w-4 h-4 cursor-pointer" /> Signature</label>
                </div>
                <PrintButton invoiceNumber={document.number} clientName={client?.name} />
            </div>

            {/* PAGINATED A4 PAGES */}
            <div className="flex flex-col gap-8 print:gap-0 print:bg-white">
                {paginatedItems.map((pageItems, pageIndex) => {
                    const isLastPage = pageIndex === paginatedItems.length - 1;

                    return (
                        <div key={pageIndex} className="print-container bg-white text-zinc-900 shadow-2xl w-[210mm] min-h-[297mm] relative flex flex-col font-['Inter'] print:break-after-page print:shadow-none">

                            {/* Watermark */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                                <div className="relative w-[75%] aspect-square opacity-5">
                                    <Image src={watermarkImg} alt="Watermark" fill className="object-contain" placeholder="blur" />
                                </div>
                            </div>
                            <div className="h-2 w-full bg-[#EAB308] relative z-10"></div>

                            {/* CONTENT PADDING */}
                            <div className="p-[10mm] pb-8 flex-1 flex flex-col relative z-10">

                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-1/2">
                                        <img src="/logo.png" alt="IMSAL Services" width={150} className="object-contain" />
                                    </div>
                                    <div className="w-1/2 text-right">
                                        <h1 className="text-5xl font-[800] tracking-tighter text-zinc-900 uppercase">Devis</h1>
                                        <p className="text-zinc-600 font-bold mt-1 text-base tracking-widest">N° {document.number}</p>
                                        {paginatedItems.length > 1 && (
                                            <p className="text-zinc-400 text-xs mt-1 font-bold">Page {pageIndex + 1} / {paginatedItems.length}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex justify-between items-start mb-6 gap-12">
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
                                        <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2 border-b border-zinc-200 pb-1 w-20 text-left">Client</h3>
                                        <p className="font-bold text-zinc-900 text-xl">{client?.name}</p>
                                        <p className="text-zinc-600">{client?.address}</p>
                                        <p className="text-zinc-600">{client?.city} {client?.country}</p>
                                        {(client?.ice || client?.email) && (
                                            <div className="mt-1 text-xs text-zinc-500 font-mono">{client?.ice && <span>ICE: {client.ice}</span>}</div>
                                        )}
                                        <div className="mt-4 flex gap-8 text-left">
                                            <div><p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Date</p><p className="font-semibold text-zinc-900">{formatDate(docDateStr)}</p></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="mb-2 flex-grow">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-zinc-800">
                                                <th className="text-left text-[10px] uppercase font-bold text-zinc-600 pb-2 w-[40%] tracking-widest">Description</th>
                                                <th className="text-center text-[10px] uppercase font-bold text-zinc-600 pb-2 w-[10%] tracking-widest">Unité</th>
                                                <th className="text-center text-[10px] uppercase font-bold text-zinc-600 pb-2 w-[10%] tracking-widest">Qté</th>
                                                <th className="text-right text-[10px] uppercase font-bold text-zinc-600 pb-2 w-[20%] tracking-widest">Prix Unit.</th>
                                                <th className="text-right text-[10px] uppercase font-bold text-zinc-600 pb-2 w-[20%] tracking-widest">Total HT</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-[12px]">
                                            {pageItems.map((item: any, idx: number) => (
                                                <tr key={item.id || idx} className={`border-b ${idx === pageItems.length - 1 ? 'border-zinc-800' : 'border-zinc-200'} break-inside-avoid`}>
                                                    <td className="py-3 pr-2 font-semibold text-zinc-900 whitespace-pre-wrap">{item.description}</td>
                                                    <td className="py-3 text-center text-zinc-500 font-mono text-[11px] uppercase align-top">{item.unit || '-'}</td>
                                                    <td className="py-3 text-center text-zinc-600 font-mono align-top">{item.quantity}</td>
                                                    <td className="py-3 text-right text-zinc-600 font-mono align-top">{formatNumber(item.unit_price)}</td>
                                                    <td className="py-3 text-right font-bold text-zinc-900 font-mono align-top">{formatNumber(item.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {!isLastPage && (
                                        <div className="mt-6 text-center text-xs font-bold text-zinc-400 italic">
                                            — Suite à la page suivante —
                                        </div>
                                    )}
                                </div>

                                {/* Totals & Stamp - ONLY ON LAST PAGE */}
                                {isLastPage && (
                                    <>
                                        <div className="break-inside-avoid font-['Inter'] mt-4 mb-6 grid grid-cols-2 gap-12 items-end">
                                            <div className="flex flex-col gap-4">
                                                <div className="text-xs text-zinc-500 leading-relaxed text-left">
                                                    <p className="mb-2">Arrêté le présent devis à la somme de :<br /><span className="font-bold text-zinc-900 uppercase leading-normal">{totalInWords} Dirhams TTC</span></p>
                                                    {document.notes && (
                                                        <div className="mt-4 pt-3 border-t border-zinc-200">
                                                            <p className="font-bold text-zinc-900 mb-1">Conditions & Notes :</p>
                                                            <p className="text-zinc-700 whitespace-pre-wrap leading-tight">{document.notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <div className="space-y-1 text-right">
                                                    <div className="flex justify-between text-xs text-zinc-600">
                                                        <span>{discountPercent > 0 ? 'Total HT Brut' : 'Total HT'}</span>
                                                        <span className="font-mono text-zinc-900 whitespace-nowrap">{formatNumber(calculatedTotalHT)} DH</span>
                                                    </div>
                                                    {discountPercent > 0 && (
                                                        <div className="flex justify-between text-xs text-zinc-600">
                                                            <span className="text-red-600">Remise ({discountPercent}%)</span>
                                                            <span className="font-mono text-red-600 whitespace-nowrap">- {formatNumber(discountAmount)} DH</span>
                                                        </div>
                                                    )}
                                                    {discountPercent > 0 && (
                                                        <div className="flex justify-between text-xs text-zinc-600 border-t border-zinc-200 pt-1">
                                                            <span>Net HT</span>
                                                            <span className="font-mono text-zinc-900 whitespace-nowrap">{formatNumber(netHT)} DH</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between text-xs text-zinc-600 pb-2 border-b border-zinc-200"><span>TVA (20%)</span><span className="font-mono text-zinc-900 whitespace-nowrap">{formatNumber(calculatedTVA)} DH</span></div>
                                                </div>
                                                <div className="flex items-center justify-end gap-6"><span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Total TTC</span><div className="text-xl font-[800] text-zinc-900 bg-[#EAB308]/10 px-4 py-2 rounded-lg border border-[#EAB308]/20 text-right whitespace-nowrap">{formatNumber(calculatedTotalTTC)} DH</div></div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pr-8 pb-4 h-28 relative select-none">
                                            <div className="relative w-72 h-28">
                                                {showStamp && (
                                                    <div className="absolute bottom-4 right-10 z-20 pointer-events-none">
                                                        <div className="w-64 h-28 border-4 border-double border-blue-900 opacity-90 mix-blend-multiply flex flex-col items-center justify-center p-2 text-center rotate-[-2deg] bg-blue-50/10">
                                                            <div className="w-full text-[12px] font-[900] text-blue-900 uppercase tracking-widest leading-none mb-1">{ws?.name || 'IMSAL SARL'}</div>
                                                            <div className="text-[8px] font-semibold text-blue-900 uppercase leading-tight px-4">{ws?.address}, {ws?.city}</div>
                                                            <div className="text-[7px] font-medium text-blue-900 mt-1 leading-tight px-2">ICE: {ws?.ice || '-'} • RC: {ws?.rc || '-'} • IF: {ws?.tax_id || '-'}<br />CNSS: 5249290 • TP: 43003134</div>
                                                            <div className="text-[8px] font-bold text-blue-900 uppercase mt-1 border-t border-blue-900 w-full pt-0.5">BON POUR ACCORD</div>
                                                        </div>
                                                    </div>
                                                )}
                                                {showSignature && (
                                                    <div className="absolute bottom-8 right-12 z-30 pointer-events-none transform -rotate-12">
                                                        <img src="/assal-signature.png" alt="Signature" className="h-24 opacity-90 drop-shadow-sm" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Footer - ALWAYS VISIBLE ON EVERY PAGE */}
                                <div className="mt-auto border-t border-zinc-200 pt-4 text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed">
                                    <div className="flex justify-between items-end">
                                        <div className="w-2/3">
                                            <p className="font-bold text-zinc-900 mb-1 text-xs">IMSAL SERVICES | 7 Lotis Najmat El Janoub, El Jadida</p>
                                            <p className="text-zinc-500 normal-case tracking-normal mb-1">Tél: +212(0)6 61 43 52 83 • Email: i.assal@imsalservices.com • Web: imsalservices.ma</p>
                                            <p className="text-zinc-400 font-mono">ICE: 002972127000089 | RC: 19215 | IF: 000081196000005 | CNSS: 5249290 | TP: 43003134</p>
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
                    );
                })}
            </div>
        </main>
    )
}