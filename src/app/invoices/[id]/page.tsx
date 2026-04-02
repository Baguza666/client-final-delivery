import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Sidebar from '@/components/Sidebar'
import { notFound } from 'next/navigation'
import InvoiceViewer from '@/components/invoices/InvoiceViewer'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const { data: invoice } = await supabase
        .from('invoices')
        .select('*, client:clients(*), invoice_items(*), workspace:workspaces(*)')
        .eq('id', id)
        .single()

    if (!invoice) return notFound()

    // 1. Resolve Base Workspace
    let baseWorkspace = invoice.workspace;
    if (!baseWorkspace) {
        const { data: defaultWs } = await supabase.from('workspaces').select('*').limit(1).single();
        baseWorkspace = defaultWs || {};
    }

    // 2. Hardcode Details
    const finalWorkspace = {
        ...baseWorkspace,
        name: "IMSAL SERVICES",
        address: "7 Lotis Najmat El Janoub",
        city: "El Jadida",
        country: "Maroc",
        phone: "+212(0)6 61 43 52 83",
        email: "i.assal@imsalservices.com",
        ice: "002972127000089",
        rc: "19215",
        if: "000081196000005",
        tax_id: "000081196000005",
        fiscal_id: "000081196000005",
        cnss: "5249290",
        patente: "43003134",
        tp: "43003134",
    };

    return (
        <div className="bg-zinc-950 min-h-screen font-sans text-white flex print:block print:bg-white print:min-h-0">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Ballet&family=Inter:wght@400;500;600;700;800&display=swap');
                
                @media print {
                    @page { margin: 0; size: A4; }
                    
                    /* 1. BRUTALLY HIDE THE SIDEBAR AND TOOLBAR */
                    .print-hide, .no-print {
                        display: none !important;
                    }

                    /* 2. RESET ALL DESKTOP MARGINS SO THE PAGE STARTS AT 0,0 */
                    body, html, main {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        width: 100% !important;
                    }

                    /* 3. FORMAT THE PAGES PERFECTLY */
                    .print-container {
                        position: relative !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        color: black !important;
                        box-shadow: none !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        overflow: hidden !important;
                    }
                    
                    /* Prevent an empty blank page at the very end */
                    .print-container:last-of-type {
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }
                }
            `}</style>

            {/* ✅ Added a hardcoded 'print-hide' class to guarantee this vanishes */}
            <div className="fixed left-0 top-0 h-screen z-20 print-hide">
                <Sidebar />
            </div>

            <InvoiceViewer
                invoice={invoice}
                client={invoice.client}
                ws={finalWorkspace}
            />
        </div>
    )
}