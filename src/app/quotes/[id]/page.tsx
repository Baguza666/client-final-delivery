import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Sidebar from '@/components/Sidebar'
import { notFound } from 'next/navigation'
import QuoteViewer from '@/components/quotes/QuoteViewer'

export const dynamic = 'force-dynamic'

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const { data: quote } = await supabase
        .from('quotes')
        .select('*, client:clients(*), quote_items(*), workspace:workspaces(*)')
        .eq('id', id)
        .single()

    if (!quote) return notFound()

    // 1. Resolve Base Workspace
    let baseWorkspace = quote.workspace;
    if (!baseWorkspace) {
        const { data: defaultWs } = await supabase.from('workspaces').select('*').limit(1).single();
        baseWorkspace = defaultWs || {};
    }

    // 2. Create Final Workspace with Hardcoded Details
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
        <div className="bg-zinc-950 min-h-screen font-sans text-white print:bg-white print:min-h-0 print:block">

            {/* Print Styles */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Ballet&family=Inter:wght@400;500;600;700;800&display=swap');
                
                @media print {
                    @page { margin: 0; size: A4; }
                    
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }

                    body, html {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    
                    aside, nav, #sidebar {
                        display: none !important;
                    }

                    main, .ml-72 {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }

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
                    
                    .print-container:last-of-type {
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }
                }
            `}</style>

            <div id="sidebar" className="fixed left-0 top-0 h-screen z-20 print:hidden">
                <Sidebar />
            </div>

            <QuoteViewer
                document={quote}
                client={quote.client}
                ws={finalWorkspace}
            />
        </div>
    )
}