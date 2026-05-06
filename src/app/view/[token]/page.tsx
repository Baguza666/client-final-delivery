import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

function fmt(n: number) {
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params

    // Service-role client: share links are public so we must bypass RLS to read
    // the linked invoice data on behalf of anonymous visitors
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: link } = await supabase
        .from('invoice_share_links')
        .select('*, invoice:invoices(*, invoice_items(*), client:clients(*), workspace:workspaces(*))')
        .eq('token', token)
        .single()

    if (!link || !link.invoice) return notFound()

    const { invoice } = link
    const items = invoice.invoice_items || []
    const ws = invoice.workspace
    const client = invoice.client

    const grossHT = items.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0)
    const discount = invoice.discount || 0
    const discountAmt = grossHT * (discount / 100)
    const netHT = grossHT - discountAmt
    const tva = Number(invoice.total_tva) || 0
    const ttc = Number(invoice.total_ttc) || 0
    const currencySymbol = invoice.currency && invoice.currency !== 'MAD' ? invoice.currency : 'DH'

    const statusLabel: Record<string, string> = {
        draft: 'Brouillon', pending: 'En attente', sent: 'Envoyée',
        paid: 'Payée', overdue: 'En retard', partial: 'Paiement partiel',
    }
    const statusColor: Record<string, string> = {
        paid: 'text-green-400 bg-green-400/10 border-green-400/20',
        partial: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
        overdue: 'text-red-400 bg-red-400/10 border-red-400/20',
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans">
            {/* Top bar */}
            <div className="border-b border-white/[0.06] bg-zinc-900/80 backdrop-blur-sm px-6 py-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {ws?.logo_url
                            ? <img src={ws.logo_url} alt={ws.name} className="h-8 object-contain" />
                            : <span className="text-lg font-black text-white tracking-tight">{ws?.name}</span>
                        }
                    </div>
                    <a
                        href={`/api/share/${token}/pdf`}
                        download
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold px-4 py-2 rounded-lg transition-all"
                    >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        Télécharger PDF
                    </a>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
                {/* Invoice header card */}
                <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Facture</p>
                            <h1 className="text-3xl font-black text-white tracking-tight">N° {invoice.invoice_number}</h1>
                            <p className="text-zinc-500 text-sm mt-1">
                                Date : {new Date(invoice.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${statusColor[invoice.status] || 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                            {statusLabel[invoice.status] || invoice.status}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold mb-2">De</p>
                            <p className="font-bold text-white">{ws?.name}</p>
                            <p className="text-zinc-500 text-sm">{ws?.address}</p>
                            <p className="text-zinc-500 text-sm">{[ws?.city, ws?.country].filter(Boolean).join(', ')}</p>
                            <p className="text-zinc-500 text-sm mt-1">{ws?.email}</p>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold mb-2">Facturé à</p>
                            <p className="font-bold text-white">{client?.name}</p>
                            <p className="text-zinc-500 text-sm">{client?.address}</p>
                            <p className="text-zinc-500 text-sm">{[client?.city, client?.country].filter(Boolean).join(', ')}</p>
                            {client?.ice && <p className="text-zinc-600 text-xs font-mono mt-1">ICE: {client.ice}</p>}
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Description</th>
                                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 w-16">Unité</th>
                                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 w-16">Qté</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-500 w-24">Prix unit.</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-500 w-28">Total HT</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {items.map((item: any, i: number) => (
                                <tr key={i}>
                                    <td className="px-6 py-3 text-white">{item.description}</td>
                                    <td className="px-4 py-3 text-center text-zinc-500 font-mono text-xs">{item.unit || '-'}</td>
                                    <td className="px-4 py-3 text-center text-zinc-400 font-mono">{item.quantity}</td>
                                    <td className="px-4 py-3 text-right text-zinc-400 font-mono">{fmt(Number(item.unit_price))}</td>
                                    <td className="px-6 py-3 text-right font-bold text-white font-mono">{fmt(Number(item.total))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6 flex justify-end">
                    <div className="space-y-2 w-64">
                        <div className="flex justify-between text-sm text-zinc-400">
                            <span>{discount > 0 ? 'Total HT Brut' : 'Total HT'}</span>
                            <span className="font-mono">{fmt(grossHT)} {currencySymbol}</span>
                        </div>
                        {discount > 0 && (
                            <>
                                <div className="flex justify-between text-sm text-red-400">
                                    <span>Remise ({discount}%)</span>
                                    <span className="font-mono">- {fmt(discountAmt)} {currencySymbol}</span>
                                </div>
                                <div className="flex justify-between text-sm text-zinc-400 border-t border-white/[0.06] pt-2">
                                    <span>Net HT</span>
                                    <span className="font-mono">{fmt(netHT)} {currencySymbol}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between text-sm text-zinc-400 border-b border-white/[0.06] pb-2">
                            <span>TVA</span>
                            <span className="font-mono">{fmt(tva)} {currencySymbol}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total TTC</span>
                            <span className="text-2xl font-black text-primary font-mono">{fmt(ttc)} {currencySymbol}</span>
                        </div>
                    </div>
                </div>

                {invoice.notes && (
                    <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Conditions de règlement</p>
                        <p className="text-zinc-300 text-sm whitespace-pre-wrap">{invoice.notes}</p>
                    </div>
                )}

                {/* Banking info */}
                {(ws?.bank_name || ws?.rib) && (
                    <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Coordonnées Bancaires</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {ws.bank_name && <div><p className="text-zinc-500">Banque</p><p className="text-white font-semibold">{ws.bank_name}</p></div>}
                            {ws.rib && <div><p className="text-zinc-500">RIB</p><p className="text-white font-mono font-bold">{ws.rib}</p></div>}
                        </div>
                    </div>
                )}

                <p className="text-center text-xs text-zinc-700 pb-8">
                    Généré par Invoicify · Ce lien est partageable
                </p>
            </div>
        </div>
    )
}
