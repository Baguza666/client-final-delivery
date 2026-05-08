// 8pt grey watermark rendered on free-tier invoice PDFs.
// Mounted absolutely at the bottom-center of the page.

export default function WatermarkPdf() {
    return (
        <div
            aria-hidden
            className="absolute left-0 right-0 bottom-1 flex justify-center pointer-events-none"
            style={{ fontSize: '8pt', color: '#9CA3AF', letterSpacing: '0.05em' }}
        >
            Créé avec Invoicify · invoicify.ma
        </div>
    )
}
