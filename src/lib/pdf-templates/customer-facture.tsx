// Moroccan auto-entrepreneur facture template, rendered as HTML for PDF export.
// Issued by Invoicify (the seller) to the workspace customer (the buyer) once
// per Lemon Squeezy paid event. Auto-entrepreneur status means TVA non
// applicable per article 91 du CGI; rendered explicitly on the document.

interface SellerFiscal {
    name: string
    address?: string | null
    city?: string | null
    country?: string | null
    phone?: string | null
    email?: string | null
    ice?: string | null
    if?: string | null   // tax_id (IF)
    rc?: string | null
    cnss?: string | null
    rib?: string | null
    bank_name?: string | null
}

interface BuyerInfo {
    name?: string | null
    email?: string | null
    address?: string | null
    city?: string | null
    country?: string | null
    ice?: string | null
}

interface FactureData {
    invoice_number: string
    issued_at: Date
    period_start: Date
    period_end: Date
    description: string
    amount_mad: number
    amount_paid: number
    amount_paid_currency: string
    seller: SellerFiscal
    buyer: BuyerInfo
}

function fmtMad(n: number): string {
    return n.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: Date): string {
    return d.toLocaleDateString('fr-MA')
}

export default function CustomerFactureTemplate({ data }: { data: FactureData }) {
    const { invoice_number, issued_at, period_start, period_end, description, amount_mad, amount_paid, amount_paid_currency, seller, buyer } = data

    return (
        <div className="w-[210mm] min-h-[297mm] bg-white text-black p-12 flex flex-col font-sans">
            {/* Header */}
            <div className="flex justify-between items-start mb-12">
                <div>
                    <h1 className="text-2xl font-black uppercase mb-1">{seller.name}</h1>
                    <p className="text-xs text-gray-500">Auto-entrepreneur</p>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-light text-[#3B82F6] uppercase tracking-widest">Facture</h2>
                    <p className="text-sm font-bold text-gray-500 mt-1">N° {invoice_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Émise le {fmtDate(issued_at)}</p>
                </div>
            </div>

            {/* Seller / Buyer blocks */}
            <div className="grid grid-cols-2 gap-12 mb-10 text-xs">
                <div>
                    <p className="font-bold text-black uppercase tracking-wider mb-2">Émetteur</p>
                    <p className="font-semibold">{seller.name}</p>
                    {seller.address && <p>{seller.address}</p>}
                    <p>{[seller.city, seller.country].filter(Boolean).join(', ')}</p>
                    {seller.email && <p>{seller.email}</p>}
                    {seller.phone && <p>{seller.phone}</p>}
                    <div className="mt-2 space-y-0.5 text-[10px] text-gray-600">
                        {seller.ice && <p>ICE : {seller.ice}</p>}
                        {seller.if && <p>IF : {seller.if}</p>}
                        {seller.rc && <p>RC : {seller.rc}</p>}
                        {seller.cnss && <p>CNSS : {seller.cnss}</p>}
                    </div>
                </div>
                <div>
                    <p className="font-bold text-black uppercase tracking-wider mb-2">Facturé à</p>
                    <p className="font-semibold">{buyer.name ?? 'Client'}</p>
                    {buyer.address && <p>{buyer.address}</p>}
                    <p>{[buyer.city, buyer.country].filter(Boolean).join(', ')}</p>
                    {buyer.email && <p>{buyer.email}</p>}
                    {buyer.ice && <p className="mt-2 text-[10px] text-gray-600">ICE client : {buyer.ice}</p>}
                </div>
            </div>

            {/* Period block */}
            <div className="grid grid-cols-3 gap-6 mb-10 text-xs">
                <div>
                    <p className="text-gray-400 uppercase tracking-wider">Période début</p>
                    <p className="font-semibold mt-1">{fmtDate(period_start)}</p>
                </div>
                <div>
                    <p className="text-gray-400 uppercase tracking-wider">Période fin</p>
                    <p className="font-semibold mt-1">{fmtDate(period_end)}</p>
                </div>
                <div>
                    <p className="text-gray-400 uppercase tracking-wider">Devise</p>
                    <p className="font-semibold mt-1">MAD</p>
                </div>
            </div>

            {/* Line items */}
            <table className="w-full text-sm mb-10">
                <thead>
                    <tr className="border-b-2 border-[#3B82F6] text-[#3B82F6] text-xs uppercase tracking-wider">
                        <th className="py-3 text-left font-bold w-2/3">Description</th>
                        <th className="py-3 text-right font-bold">Montant HT</th>
                    </tr>
                </thead>
                <tbody className="text-gray-800">
                    <tr className="border-b border-gray-100">
                        <td className="py-4">{description}</td>
                        <td className="py-4 text-right font-medium">{fmtMad(amount_mad)} MAD</td>
                    </tr>
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-12">
                <div className="w-2/5 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-500">
                        <span>Total HT</span>
                        <span>{fmtMad(amount_mad)} MAD</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                        <span>TVA</span>
                        <span>0,00 MAD</span>
                    </div>
                    <div className="h-px bg-gray-200 my-2" />
                    <div className="flex justify-between font-bold text-base">
                        <span>Total TTC</span>
                        <span className="text-[#3B82F6]">{fmtMad(amount_mad)} MAD</span>
                    </div>
                </div>
            </div>

            {/* Compliance footer */}
            <div className="text-[10px] text-gray-500 leading-relaxed mb-6 border-t border-gray-100 pt-4">
                <p className="mb-1 font-semibold text-gray-600">
                    TVA non applicable selon article 91 du CGI - statut auto-entrepreneur.
                </p>
                <p>
                    Payé le {fmtDate(issued_at)} via Lemon Squeezy
                    {amount_paid_currency !== 'MAD' && (
                        <> ({fmtMad(amount_paid)} {amount_paid_currency} équivalent à {fmtMad(amount_mad)} MAD)</>
                    )}
                    .
                </p>
                {(seller.rib || seller.bank_name) && (
                    <p className="mt-1">
                        {seller.bank_name && <>Banque : {seller.bank_name} · </>}
                        {seller.rib && <>RIB : {seller.rib}</>}
                    </p>
                )}
            </div>

            {/* Footer */}
            <div className="mt-auto pt-6 border-t border-gray-100 text-center text-[10px] text-gray-400 uppercase tracking-widest">
                <p>{seller.name} · Document N° {invoice_number} · Type 380 · Devise MAD</p>
                <p className="mt-1">Merci de votre confiance.</p>
            </div>
        </div>
    )
}

export type { FactureData, SellerFiscal, BuyerInfo }
