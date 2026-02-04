import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from "next/navigation";
import Sidebar from '@/components/Sidebar';
import ReportsView from '@/components/reports/ReportsView';
import ExportButton from '@/components/reports/ExportButton'; // Import the new button

export default async function ReportsPage() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const { data: workspace } = await supabase.from('workspaces').select('id').eq('owner_id', user.id).single();

    if (!workspace) return null;

    // FETCH ALL DATA FOR REPORTS & EXPORT
    const { data: invoices } = await supabase
        .from('invoices')
        .select('*, client:clients(name)') // Fetch client names for better export
        .eq('workspace_id', workspace.id);

    const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('workspace_id', workspace.id);

    return (
        <div className="bg-background-dark text-white font-sans overflow-hidden min-h-screen antialiased selection:bg-primary selection:text-black">
            <div className="flex h-full w-full">
                <Sidebar />

                <main className="flex-1 flex flex-col relative overflow-hidden bg-background-dark ml-72">

                    <header className="absolute top-0 left-0 right-0 z-10 glass-header px-8 h-20 flex items-center justify-between">
                        <h2 className="text-white text-xl font-bold tracking-tight">RAPPORTS & ANALYSES</h2>

                        {/* THE NEW WORKING EXPORT BUTTON */}
                        <ExportButton invoices={invoices || []} expenses={expenses || []} />
                    </header>

                    <div className="flex-1 overflow-y-auto pt-28 pb-10 px-8">
                        <div className="max-w-[1400px] mx-auto w-full">
                            <ReportsView
                                invoices={invoices || []}
                                expenses={expenses || []}
                            />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}