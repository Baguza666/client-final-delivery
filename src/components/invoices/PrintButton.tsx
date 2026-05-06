'use client'

interface PrintButtonProps {
    invoiceNumber: string
    clientName?: string
    invoiceId?: string
    template?: string
}

export default function PrintButton({ invoiceNumber, clientName, invoiceId, template = 'classic' }: PrintButtonProps) {
    if (invoiceId) {
        return (
            <a
                href={`/api/invoices/${invoiceId}/pdf?template=${template}#toolbar=0&navpanes=0`}
                download
                className="bg-white text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-200 transition-colors shadow-lg border border-zinc-200"
            >
                <span className="material-symbols-outlined">download</span>
                Télécharger PDF
            </a>
        )
    }

    const handlePrint = () => {
        const originalTitle = document.title
        const safeNumber = invoiceNumber.replace(/\//g, '-')
        const safeClient = clientName ? `_${clientName.replace(/[^a-zA-Z0-9 ]/g, '')}` : ''
        document.title = `Facture_${safeNumber}${safeClient}`
        window.print()
        setTimeout(() => { document.title = originalTitle }, 500)
    }

    return (
        <button
            onClick={handlePrint}
            className="bg-white text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-200 transition-colors shadow-lg border border-zinc-200"
        >
            <span className="material-symbols-outlined">download</span>
            Télécharger PDF
        </button>
    )
}
