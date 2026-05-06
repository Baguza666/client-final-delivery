'use client'

import React from 'react'
import { TEMPLATES, type Template } from '@/lib/document-templates'
import { formatNumber, formatDate } from '@/utils/format'

export interface DocumentTotals {
    totalHT: number
    discountPercent: number
    discountAmount: number
    netHT: number
    tvaByRate: Record<number, number>
    totalTVA: number
    totalTTC: number
    totalInWords: string
    currency: string
    exchangeRate: number
}

export interface DocumentPageProps {
    docTitle: string          // 'Facture' | 'Devis' | 'Bon de\nLivraison' | 'Bon de\nCommande'
    docNumber: string
    date: string
    notes?: string
    ws: any
    client: any
    template: Template
    brandColor: string
    pageItems: any[]
    pageIndex: number
    totalPages: number
    isLastPage: boolean
    showPrices: boolean       // false for delivery notes
    stampLabel?: string       // stamp footer text
    totals?: DocumentTotals   // required when showPrices = true
    showStamp: boolean
    showSignature: boolean
    clientLabel?: string      // override the right-side section label
}

export function hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
}

function fmtAmt(n: number, currency: string): string {
    const suffix = currency && currency !== 'MAD' ? ` ${currency}` : ' DH'
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + suffix
}

export default function DocumentPage({
    docTitle,
    docNumber,
    date,
    notes,
    ws,
    client,
    template,
    brandColor,
    pageItems,
    pageIndex,
    totalPages,
    isLastPage,
    showPrices,
    stampLabel,
    totals,
    showStamp,
    showSignature,
    clientLabel,
}: DocumentPageProps) {
    const cfg = TEMPLATES[template]
    const rgba = (alpha: number) => hexToRgba(brandColor, alpha)

    const isOutsideHeader = cfg.headerType === 'dark' || cfg.headerType === 'bureau' || cfg.headerType === 'stripe'

    // ── Title style (varies per template) ──────────────────────────
    const titleStyle: React.CSSProperties = {
        fontFamily:      cfg.titleFontFamily,
        fontSize:        cfg.titleFontSize,
        fontWeight:      cfg.titleFontWeight,
        letterSpacing:   cfg.titleLetterSpacing,
        fontStyle:       cfg.titleItalic ? 'italic' : 'normal',
        textTransform:   cfg.titleUppercase ? 'uppercase' : 'none',
        lineHeight:      1,
        margin:          0,
        color:           'inherit',
    }

    // ── Section label style (color driven by brandColor when branded) ──
    const labelStyle: React.CSSProperties = {
        display:         'block',
        fontSize:        '9px',
        fontWeight:      700,
        textTransform:   'uppercase',
        letterSpacing:   '0.15em',
        paddingBottom:   '4px',
        marginBottom:    '8px',
        borderBottom:    cfg.sectionLabelBranded
            ? `1px solid ${rgba(0.35)}`
            : '1px solid #e5e7eb',
        color:           cfg.sectionLabelBranded ? brandColor : '#9ca3af',
    }

    // ── TTC box style (accent mode driven by brandColor) ──────────
    const ttcBoxStyle: React.CSSProperties =
        cfg.accentMode === 'solid' ? {
            backgroundColor: brandColor,
            borderRadius: '6px',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px',
        } : cfg.accentMode === 'tint' ? {
            backgroundColor: rgba(0.08),
            border: `1px solid ${rgba(0.25)}`,
            borderRadius: '6px',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px',
        } : cfg.accentMode === 'rule' ? {
            borderLeft: `4px solid ${brandColor}`,
            paddingLeft: '12px',
            paddingTop: '8px',
            paddingBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px',
        } : {
            borderTop: `1px solid ${rgba(0.2)}`,
            paddingTop: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px',
        }

    const ttcAmountColor = cfg.accentMode === 'solid' ? 'white' : brandColor

    // ── Logo components ────────────────────────────────────────────
    const LogoWhite = () =>
        ws?.logo_url ? (
            <img src={ws.logo_url} alt={ws?.name || ''} width={140}
                style={{ objectFit: 'contain', maxHeight: '56px', filter: 'brightness(100)' }} />
        ) : (
            <span style={{ fontFamily: cfg.titleFontFamily, fontSize: '20px', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                {ws?.name || ''}
            </span>
        )

    const LogoNormal = () =>
        ws?.logo_url ? (
            <img src={ws.logo_url} alt={ws?.name || ''} width={150}
                style={{ objectFit: 'contain', maxHeight: '64px' }} />
        ) : (
            <span style={{ fontFamily: cfg.titleFontFamily, fontSize: '20px', fontWeight: 900, color: '#111', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                {ws?.name || ''}
            </span>
        )

    // ── Title component (handles \n line breaks) ───────────────────
    const TitleEl = ({ color }: { color: string }) => (
        <h1 style={{ ...titleStyle, color }}>
            {docTitle.includes('\n')
                ? docTitle.split('\n').map((line, i, arr) => (
                    <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>
                ))
                : docTitle}
        </h1>
    )

    const resolvedClientLabel = clientLabel ?? (
        docTitle === 'Facture' ? 'Facturé à'
        : docTitle === 'Devis' ? 'Client'
        : docTitle.includes('Livraison') ? 'Destinataire'
        : 'Fournisseur'
    )

    return (
        <div className="print-container bg-white text-zinc-900 shadow-2xl w-[210mm] min-h-[297mm] relative flex flex-col font-['Inter'] print:shadow-none print:break-after-page print:break-inside-avoid">

            {/* ── OUTSIDE HEADERS (full-bleed, no padding) ──────────────── */}

            {cfg.headerType === 'dark' && (
                <div style={{ backgroundColor: '#1e293b', padding: '6mm 10mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <LogoWhite />
                    <div style={{ textAlign: 'right' }}>
                        <TitleEl color="white" />
                        <p style={{ fontWeight: 700, marginTop: '6px', fontSize: '11px', letterSpacing: '3px', color: 'rgba(255,255,255,0.6)' }}>N° {docNumber}</p>
                    </div>
                </div>
            )}

            {cfg.headerType === 'bureau' && (
                <div style={{ backgroundColor: brandColor, padding: '6mm 10mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <LogoWhite />
                    <div style={{ textAlign: 'right' }}>
                        <TitleEl color="white" />
                        <p style={{ fontWeight: 700, marginTop: '6px', fontSize: '11px', letterSpacing: '3px', color: 'rgba(255,255,255,0.6)' }}>N° {docNumber}</p>
                    </div>
                </div>
            )}

            {cfg.headerType === 'stripe' && (
                <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '88px' }}>
                    <div style={{ width: '48mm', backgroundColor: brandColor, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6mm 8mm', flexShrink: 0 }}>
                        <LogoWhite />
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '6mm 10mm', backgroundColor: 'white' }}>
                        <div style={{ textAlign: 'right' }}>
                            <TitleEl color="#111111" />
                            <p style={{ fontWeight: 700, marginTop: '6px', fontSize: '11px', letterSpacing: '3px', color: '#9ca3af' }}>N° {docNumber}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PADDED CONTENT AREA ────────────────────────────────────── */}
            <div className="p-[10mm] pb-8 flex-1 flex flex-col">

                {/* Standard header: classic, minimal, bold */}
                {cfg.headerType === 'standard' && (
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-1/2"><LogoNormal /></div>
                        <div className="w-1/2 text-right">
                            <TitleEl color="#111111" />
                            <p className="font-bold mt-1 text-sm tracking-widest text-zinc-500">N° {docNumber}</p>
                            {totalPages > 1 && <p className="text-zinc-400 text-xs mt-1 font-bold">Page {pageIndex + 1} / {totalPages}</p>}
                        </div>
                    </div>
                )}

                {/* Ligne header: standard + thick brand rule */}
                {cfg.headerType === 'ligne' && (
                    <>
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-1/2"><LogoNormal /></div>
                            <div className="w-1/2 text-right">
                                <TitleEl color="#111111" />
                                <p className="font-bold mt-1 text-sm tracking-widest text-zinc-500">N° {docNumber}</p>
                                {totalPages > 1 && <p className="text-zinc-400 text-xs mt-1 font-bold">Page {pageIndex + 1} / {totalPages}</p>}
                            </div>
                        </div>
                        <div style={{ height: '3px', backgroundColor: brandColor, marginBottom: '24px' }} />
                    </>
                )}

                {/* Centered header: elegant */}
                {cfg.headerType === 'centered' && (
                    <div className="flex flex-col items-center text-center mb-6 pb-4 border-b border-slate-200">
                        <div className="mb-3"><LogoNormal /></div>
                        <TitleEl color="#334155" />
                        <p className="mt-1 text-sm tracking-widest text-slate-500">N° {docNumber}</p>
                        {totalPages > 1 && <p className="text-zinc-400 text-xs mt-1 font-bold">Page {pageIndex + 1} / {totalPages}</p>}
                    </div>
                )}

                {/* Page number for outside-header templates */}
                {isOutsideHeader && totalPages > 1 && (
                    <p className="text-zinc-400 text-xs mb-3 font-bold text-right">Page {pageIndex + 1} / {totalPages}</p>
                )}

                {/* ── EMITTER + CLIENT ──────────────────────────────────── */}
                <div className="flex justify-between items-start mb-6 gap-12">
                    <div className="w-1/2 text-sm leading-relaxed">
                        {cfg.sectionLabelHidden
                            ? <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '8px' }} />
                            : <span style={labelStyle}>Émetteur</span>
                        }
                        <p className="font-bold text-base text-zinc-900">{ws?.name || '—'}</p>
                        <p className="text-zinc-500 text-sm">{ws?.address || ''}</p>
                        <p className="text-zinc-500 text-sm">{[ws?.city, ws?.country].filter(Boolean).join(', ')}</p>
                        <div className="mt-2 pt-2 border-t border-slate-100 text-xs space-y-1 text-zinc-500">
                            {ws?.phone && <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[12px]">call</span> {ws.phone}</p>}
                            {ws?.email && <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[12px]">mail</span> {ws.email}</p>}
                        </div>
                    </div>
                    <div className="w-1/2 text-left flex flex-col items-start">
                        {cfg.sectionLabelHidden
                            ? <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '8px', width: '100%' }} />
                            : <span style={{ ...labelStyle, textAlign: 'left' }}>{resolvedClientLabel}</span>
                        }
                        <p className="font-bold text-xl text-zinc-900">{client?.name}</p>
                        <p className="text-zinc-500 text-sm">{client?.address}</p>
                        <p className="text-zinc-500 text-sm">{[client?.city, client?.country].filter(Boolean).join(' ')}</p>
                        {client?.ice && <p className="mt-1 text-xs font-mono text-zinc-400">ICE: {client.ice}</p>}
                        <div className="mt-4">
                            <p className="text-[9px] uppercase font-bold tracking-wider text-zinc-400">Date</p>
                            <p className="font-semibold text-zinc-900">{formatDate(date)}</p>
                        </div>
                    </div>
                </div>

                {/* ── TABLE ─────────────────────────────────────────────── */}
                <div className="mb-2 flex-grow">
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={cfg.tableTopBorder !== 'none' ? { borderTop: cfg.tableTopBorder } : {}}>
                                <th className="text-left text-[10px] uppercase font-bold pb-2 tracking-widest text-zinc-500"
                                    style={{ width: showPrices ? '40%' : '60%' }}>Description</th>
                                <th className="text-center text-[10px] uppercase font-bold pb-2 tracking-widest text-zinc-500 w-[10%]">Unité</th>
                                <th className="text-center text-[10px] uppercase font-bold pb-2 tracking-widest text-zinc-500 w-[10%]">Qté</th>
                                {showPrices && <>
                                    <th className="text-right text-[10px] uppercase font-bold pb-2 tracking-widest text-zinc-500 w-[20%]">Prix Unit.</th>
                                    <th className="text-right text-[10px] uppercase font-bold pb-2 tracking-widest text-zinc-500 w-[20%]">Total HT</th>
                                </>}
                            </tr>
                        </thead>
                        <tbody className="text-[12px]">
                            {pageItems.map((item: any, idx: number) => {
                                const isLast = idx === pageItems.length - 1
                                return (
                                    <tr key={item.id || idx} className="break-inside-avoid"
                                        style={{
                                            borderBottom: isLast ? cfg.lastRowBorder : cfg.rowBorder,
                                            ...(cfg.tableZebra && idx % 2 === 0 ? { backgroundColor: rgba(0.04) } : {}),
                                        }}>
                                        <td className="py-3 pr-2 font-semibold text-zinc-900 whitespace-pre-wrap">{item.description}</td>
                                        <td className="py-3 text-center text-zinc-500 font-mono text-[11px] uppercase align-top">{item.unit || '—'}</td>
                                        <td className="py-3 text-center text-zinc-600 font-mono align-top">{item.quantity}</td>
                                        {showPrices && <>
                                            <td className="py-3 text-right text-zinc-600 font-mono align-top">{formatNumber(item.unit_price)}</td>
                                            <td className="py-3 text-right font-bold text-zinc-900 font-mono align-top">{formatNumber(item.total)}</td>
                                        </>}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {!isLastPage && (
                        <div className="mt-6 text-center text-xs font-bold text-zinc-400 italic">
                            — Suite à la page suivante —
                        </div>
                    )}
                </div>

                {/* ── LAST PAGE: TOTALS + STAMP ─────────────────────────── */}
                {isLastPage && (
                    <>
                        {showPrices && totals && (
                            <div className="break-inside-avoid mt-4 mb-6 grid grid-cols-2 gap-12 items-end">
                                <div className="text-xs text-zinc-500 leading-relaxed">
                                    <p className="mb-2">
                                        Arrêté {docTitle === 'Facture' ? 'la présente facture' : docTitle.startsWith('Devis') ? 'le présent devis' : 'le présent document'} à la somme de :<br />
                                        <span className="font-bold text-zinc-900 uppercase leading-normal">{totals.totalInWords} Dirhams TTC</span>
                                    </p>
                                    {notes && (
                                        <div className="mt-4 pt-3 border-t border-zinc-200">
                                            <p className="font-bold text-zinc-900 mb-1">
                                                {docTitle === 'Facture' ? 'Conditions de règlement' : 'Conditions & Notes'} :
                                            </p>
                                            <p className="text-zinc-700 whitespace-pre-wrap leading-tight">{notes}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-zinc-600">
                                            <span>{totals.discountPercent > 0 ? 'Total HT Brut' : 'Total HT'}</span>
                                            <span className="font-mono text-zinc-900 whitespace-nowrap">{fmtAmt(totals.totalHT, totals.currency)}</span>
                                        </div>
                                        {totals.discountPercent > 0 && (
                                            <>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-red-600">Remise ({totals.discountPercent}%)</span>
                                                    <span className="font-mono text-red-600 whitespace-nowrap">- {fmtAmt(totals.discountAmount, totals.currency)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-zinc-600 border-t border-zinc-200 pt-1">
                                                    <span>Net HT</span>
                                                    <span className="font-mono text-zinc-900 whitespace-nowrap">{fmtAmt(totals.netHT, totals.currency)}</span>
                                                </div>
                                            </>
                                        )}
                                        {Object.entries(totals.tvaByRate).filter(([, v]) => v > 0).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, amt]) => (
                                            <div key={rate} className="flex justify-between text-xs text-zinc-600">
                                                <span>TVA ({rate}%)</span>
                                                <span className="font-mono text-zinc-900 whitespace-nowrap">{fmtAmt(amt, totals.currency)}</span>
                                            </div>
                                        ))}
                                        {Object.keys(totals.tvaByRate).length === 0 && (
                                            <div className="flex justify-between text-xs text-zinc-600">
                                                <span>TVA (20%)</span>
                                                <span className="font-mono text-zinc-900 whitespace-nowrap">{fmtAmt(totals.totalTVA, totals.currency)}</span>
                                            </div>
                                        )}
                                        <div className="pb-2 border-b border-zinc-200" />
                                    </div>

                                    <div style={ttcBoxStyle}>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Total TTC</span>
                                        <div className="text-right">
                                            <span style={{ color: ttcAmountColor, fontSize: '20px', fontWeight: 800, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                                {fmtAmt(totals.totalTTC, totals.currency)}
                                            </span>
                                            {totals.currency !== 'MAD' && (
                                                <div className="text-xs text-zinc-400 mt-0.5">≈ {formatNumber(totals.totalTTC * totals.exchangeRate)} MAD</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!showPrices && (
                            <div className="break-inside-avoid mt-8 mb-6">
                                <p className="text-xs text-zinc-500 italic pl-3" style={{ borderLeft: `2px solid ${brandColor}` }}>
                                    Marchandise reçue en bon état et conforme à la commande.<br />
                                    <span className="not-italic font-bold text-zinc-800 mt-1 block">Réf.: {docNumber}</span>
                                </p>
                            </div>
                        )}

                        {/* Stamp + Signature */}
                        <div className="flex justify-end pr-8 pb-4 h-28 relative select-none">
                            <div className="relative w-72 h-28">
                                {showStamp && (
                                    <div className="absolute bottom-4 right-10 z-20 pointer-events-none">
                                        <div className="w-64 h-28 border-4 border-double opacity-90 mix-blend-multiply flex flex-col items-center justify-center p-2 text-center rotate-[-2deg]"
                                            style={{ borderColor: brandColor, color: brandColor }}>
                                            <div className="w-full text-[12px] font-[900] uppercase tracking-widest leading-none mb-1">{ws?.name || '—'}</div>
                                            <div className="text-[8px] font-semibold uppercase leading-tight px-4">{ws?.address}, {ws?.city}</div>
                                            <div className="text-[7px] font-medium mt-1 leading-tight px-2">
                                                ICE: {ws?.ice || '—'} • RC: {ws?.rc || '—'} • IF: {ws?.tax_id || '—'}<br />
                                                CNSS: {ws?.cnss || '—'} • TP: {ws?.tp || '—'}
                                            </div>
                                            {stampLabel && (
                                                <div className="text-[8px] font-bold uppercase mt-1 w-full pt-0.5" style={{ borderTop: `1px solid ${brandColor}` }}>
                                                    {stampLabel}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {showSignature && (
                                    <div className="absolute bottom-8 right-12 z-30 pointer-events-none transform -rotate-12">
                                        {ws?.signature_url
                                            ? <img src={ws.signature_url} alt="Signature" className="h-16 object-contain opacity-90 drop-shadow-sm" />
                                            : <div className="text-6xl opacity-90 drop-shadow-sm"
                                                style={{ fontFamily: "'Ballet', cursive", color: brandColor, textShadow: '2px 2px 2px rgba(0,0,0,0.1)' }}>
                                                {ws?.signature_name || ws?.name?.split(' ')[0] || ''}
                                              </div>
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* ── FOOTER ────────────────────────────────────────────── */}
                <div className="mt-auto pt-4 text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed"
                    style={{ borderTop: cfg.footerTopBorder }}>
                    <div className="flex justify-between items-end">
                        <div className="w-2/3">
                            <p className="font-bold text-zinc-900 mb-1 text-xs">
                                {[ws?.name, [ws?.address, ws?.city].filter(Boolean).join(', ')].filter(Boolean).join(' | ')}
                            </p>
                            <p className="normal-case tracking-normal mb-1">
                                {[ws?.phone && `Tél: ${ws.phone}`, ws?.email && `Email: ${ws.email}`].filter(Boolean).join(' • ')}
                            </p>
                            <p className="font-mono">
                                {[ws?.ice && `ICE: ${ws.ice}`, ws?.rc && `RC: ${ws.rc}`, ws?.tax_id && `IF: ${ws.tax_id}`, ws?.cnss && `CNSS: ${ws.cnss}`, ws?.tp && `TP: ${ws.tp}`].filter(Boolean).join(' • ')}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-zinc-900 mb-1">Coordonnées Bancaires</p>
                            <p>Banque: {ws?.bank_name || '—'}</p>
                            <p>RIB: <span className="font-mono font-bold text-zinc-800">{ws?.rib || '—'}</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
