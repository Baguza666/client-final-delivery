import React from 'react'
import { notFound } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Sidebar from '@/components/Sidebar'
import DeliveryNoteViewer from '@/components/delivery-notes/DeliveryNoteViewer'

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function DeliveryNotePage({ params }: PageProps) {
    const { id } = await params

    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    // 1. Fetch Delivery Note
    const { data: document } = await supabase
        .from('delivery_notes')
        .select('*, delivery_note_items(*)')
        .eq('id', id)
        .single()

    if (!document) return notFound()

    // 2. Fetch Client
    const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', document.client_id)
        .single()

    // 3. Fetch Workspace
    let { data: workspace } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', document.workspace_id)
        .single()

    // Fallback if no workspace is linked
    if (!workspace) {
        const { data: defaultWs } = await supabase.from('workspaces').select('*').limit(1).single()
        workspace = defaultWs || {}
    }

    // 🔒 HARDCODE STAMP DETAILS (IMSAL SERVICES)
    const finalWorkspace = {
        ...workspace,
        name: "IMSAL SERVICES",
        address: "7 Lotis Najmat El Janoub",
        city: "El Jadida",
        country: "Maroc",
        phone: "+212(0)6 61 43 52 83",
        email: "i.assal@imsalservices.com",
        ice: "0014398551000071",
    };

    return (
        <div className="bg-black min-h-screen text-white font-['Inter']">

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
                    .print-container, .print-container * { visibility: visible; }
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

            <DeliveryNoteViewer
                document={document}
                client={client}
                ws={finalWorkspace} // ✅ Passes the hardcoded details
            />
        </div>
    )
}