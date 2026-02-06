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

    // 1. Resolve Workspace (DB or Default)
    let finalWorkspace = quote.workspace;
    if (!finalWorkspace) {
        const { data: defaultWs } = await supabase.from('workspaces').select('*').limit(1).single();
        finalWorkspace = defaultWs || {}; // Ensure it's an object if null
    }

    // 2. 🔒 HARDCODE COMPANY DETAILS
    // We overwrite the workspace object to ensure the Stamp/Header is always correct.
    finalWorkspace = {
        ...finalWorkspace,
        name: "IMSAL SERVICES",
        address: "7 Lotis Najmat El Janoub",
        city: "El Jadida",
        country: "Maroc",
        phone: "+212(0)6 61 43 52 83",
        email: "i.assal@imsalservices.com",
        ice: "0014398551000071", // Included from your invoice screenshot
    };

    return (
        <div className="bg-zinc-950 min-h-screen font-sans text-white">

            {/* Print Styles */}
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

            {/* Pass the Hardcoded Workspace to the Viewer */}
            <QuoteViewer
                document={quote}
                client={quote.client}
                ws={finalWorkspace}
            />
        </div>
    )
}