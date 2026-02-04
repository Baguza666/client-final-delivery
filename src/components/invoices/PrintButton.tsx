'use client'

export default function PrintButton({ invoiceNumber, clientName }: { invoiceNumber: string, clientName?: string }) {

    const handlePrint = () => {
        // 1. Save the current page title so we can restore it later
        const originalTitle = document.title

        // 2. Create a clean filename
        // Example: Turns "1/26" into "1-26" and adds client name if available
        const safeNumber = invoiceNumber.replace(/\//g, '-')
        const safeClient = clientName ? `_${clientName.replace(/[^a-zA-Z0-9 ]/g, '')}` : ''

        const fileName = `Facture_${safeNumber}${safeClient}`

        // 3. Set the new title (This becomes the PDF filename!)
        document.title = fileName

        // 4. Trigger the browser print
        window.print()

        // 5. Restore the original title after a slight delay
        setTimeout(() => {
            document.title = originalTitle
        }, 500)
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