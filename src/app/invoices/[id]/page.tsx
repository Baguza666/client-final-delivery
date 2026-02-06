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

    // 1. Resolve Workspace
    let finalWorkspace = invoice.workspace;
    if (!finalWorkspace) {
        const { data: defaultWs } = await supabase.from('workspaces').select('*').limit(1).single();
        finalWorkspace = defaultWs || {};
    }

    // 🔒 HARDCODE COMPANY DETAILS (STAMP FIX)
    // ✅ FIX: Use assignment (=) instead of declaration (const) to avoid duplication error
    finalWorkspace = {
        ...finalWorkspace,
        name: "IMSAL SERVICES",
        address: "7 Lotis Najmat El Janoub",
        city: "El Jadida",
        country: "Maroc",
        phone: "+212(0)6 61 43 52 83",
        email: "i.assal@imsalservices.com",
        ice: "002972127000089",       // ✅ ICE
        rc: "19215",                 // ✅ RC
        if: "000081196000005",       // ✅ I.F.
        cnss: "5249290",             // ✅ CNSS
        patente: "43003134",         // ✅ T.P. (Patente)
    };

    return (
        <div className="bg-zinc-950 min-h-screen font-sans text-white flex">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Ballet&family=Inter:wght@400;500;600;700;800&display=swap');
                
                @media print {
                    @page { margin: 0; size: A4; }
                    body, html {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body * { visibility: hidden; }
                    .print-container, .print-container * {
                        visibility: visible;
                    }
                    .print-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        color: black !important;
                        box-shadow: none !important;
                        overflow: hidden !important;
                    }
                }
            `}</style>

            <div className="fixed left-0 top-0 h-screen z-20 print:hidden">
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