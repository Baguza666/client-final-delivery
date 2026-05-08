'use client';

import React from 'react';

interface InvoiceTemplateProps {
    data: {
        invoice_number: string;
        date: string;
        due_date: string;
        client: any;
        workspace: any;
        items: any[];
        subtotal: number;
        taxAmount: number;
        total: number;
    };
    addWatermark?: boolean;
}

export default function InvoiceTemplate({ data, addWatermark = false }: InvoiceTemplateProps) {
    // Destructure data so we can use the variables
    const { invoice_number, date, due_date, client, workspace, items, subtotal, taxAmount, total } = data;

    return (
        <div className="w-full h-full bg-white text-black p-10 shadow-2xl rounded-xl overflow-hidden relative flex flex-col min-h-[800px]">

            {/* 1. HEADER */}
            <div className="flex justify-between items-start mb-12">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black tracking-tighter uppercase mb-2">
                        {workspace?.name || 'Votre entreprise'}
                    </h1>
                    {workspace?.tagline && (
                        <p className="text-xs text-gray-500 uppercase tracking-widest">{workspace.tagline}</p>
                    )}
                </div>

                <div className="text-right">
                    <h2 className="text-4xl font-light text-[#3B82F6] tracking-widest uppercase mb-1">Facture</h2>
                    <p className="text-sm font-bold text-gray-400"># {invoice_number}</p>
                </div>
            </div>

            {/* 2. ADDRESSES & DATES */}
            <div className="flex justify-between items-start mb-12">
                {/* FROM */}
                <div className="w-1/3 text-xs text-gray-600 leading-relaxed">
                    <p className="font-bold text-black uppercase mb-1">Émetteur</p>
                    <p>{workspace?.name || '—'}</p>
                    {workspace?.address && <p>{workspace.address}</p>}
                    {(workspace?.city || workspace?.country) && (
                        <p>{[workspace?.city, workspace?.country].filter(Boolean).join(', ')}</p>
                    )}
                    {workspace?.email && <p className="mt-2">{workspace.email}</p>}
                </div>

                {/* DATES */}
                <div className="w-1/3 flex flex-col gap-2">
                    <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-xs text-gray-400 font-medium uppercase">Date</span>
                        <span className="text-sm font-bold">{new Date(date).toLocaleDateString('fr-MA')}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-xs text-gray-400 font-medium uppercase">Échéance</span>
                        <span className="text-sm font-bold">{due_date ? new Date(due_date).toLocaleDateString('fr-MA') : '-'}</span>
                    </div>
                </div>

                {/* TO */}
                <div className="w-1/3 text-right">
                    <p className="font-bold text-black uppercase mb-1 text-xs">Facturé à</p>
                    {client ? (
                        <div className="text-sm text-gray-800 leading-relaxed">
                            <p className="font-bold text-lg">{client.name}</p>
                            <p>{client.address}</p>
                            <p>{client.email}</p>
                            {(client.ice || client.if) && (
                                <p className="text-[10px] text-gray-500 mt-1">
                                    {client.ice && <>ICE : {client.ice}</>}
                                    {client.ice && client.if && <> · </>}
                                    {client.if && <>IF : {client.if}</>}
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-300 italic">Sélectionnez un client...</p>
                    )}
                </div>
            </div>

            {/* 3. ITEMS TABLE */}
            <div className="flex-1 mb-10">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-[#3B82F6] text-[#3B82F6] text-xs uppercase tracking-wider">
                            <th className="py-3 font-bold w-1/2">Description / Service</th>
                            <th className="py-3 font-bold text-right">Qté</th>
                            <th className="py-3 font-bold text-right">Prix Unitaire</th>
                            <th className="py-3 font-bold text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-gray-700">
                        {items.map((item, index) => (
                            <tr key={index} className="border-b border-gray-100">
                                <td className="py-4 font-medium">{item.description || <span className="text-gray-300 italic">Nouvelle ligne...</span>}</td>
                                <td className="py-4 text-right">{item.quantity}</td>
                                <td className="py-4 text-right">{Number(item.unit_price).toFixed(2)}</td>
                                <td className="py-4 text-right font-bold">{(item.quantity * item.unit_price).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 4. TOTALS */}
            <div className="flex justify-end mb-12">
                <div className="w-1/2 md:w-1/3 flex flex-col gap-3">
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>Sous-Total</span>
                        <span>{subtotal.toFixed(2)} DH</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>TVA (20%)</span>
                        <span>{taxAmount.toFixed(2)} DH</span>
                    </div>
                    <div className="h-px bg-gray-200 my-2"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-base font-bold text-black uppercase">Total TTC</span>
                        <span className="text-2xl font-black text-[#3B82F6]">{total.toFixed(2)} <span className="text-xs text-black">DH</span></span>
                    </div>
                </div>
            </div>

            {/* 5. FOOTER */}
            <div className="mt-auto pt-8 border-t border-gray-100 text-center text-[10px] text-gray-400 uppercase tracking-widest">
                <p className="mb-1">
                    {[
                        workspace?.name,
                        workspace?.ice && `ICE: ${workspace.ice}`,
                        workspace?.rc && `RC: ${workspace.rc}`,
                        workspace?.tax_id && `IF: ${workspace.tax_id}`,
                        workspace?.cnss && `CNSS: ${workspace.cnss}`,
                    ].filter(Boolean).join(' • ')}
                </p>
                {workspace?.tax_regime === 'auto_entrepreneur' && (
                    <p className="mb-1 text-[9px] normal-case tracking-normal text-gray-500">
                        TVA non applicable selon article 91 du CGI - statut auto-entrepreneur.
                    </p>
                )}
                <p className="text-[9px] normal-case tracking-normal text-gray-400">
                    Document N° {invoice_number} · Type 380 · Devise MAD
                </p>
                <p>Merci de votre confiance.</p>
            </div>

            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-[#3B82F6]/20 to-transparent clip-path-triangle"></div>

            {addWatermark && (
                <div
                    className="absolute left-0 right-0 bottom-1 flex justify-center pointer-events-none"
                    style={{ fontSize: '8pt', color: '#9CA3AF' }}
                >
                    Créé avec Invoicify · invoicify.ma
                </div>
            )}
        </div>
    );
}