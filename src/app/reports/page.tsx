import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from "next/navigation";
import Sidebar from '@/components/Sidebar';
import ReportsView from '@/components/reports/ReportsView';
import ExportButton from '@/components/reports/ExportButton';

export default async function ReportsPage() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // 🔴 FIX: Redirect to login if session is lost
    if (!user) redirect("/login");

    const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();

    // If no workspace, render empty state instead of crashing
    if (!workspace) {
        return (
            <div className="bg-background-dark min-h-screen flex text-white">
                <Sidebar />
                <main className="ml-72 flex-1 p-8 flex items-center justify-center">
                    <p className="text-zinc-500">Aucune donnée disponible. Veuillez configurer vos paramètres.</p>
                </main>
            </div>
        );
    }

    // FETCH DATA
    const { data: invoices } = await supabase
        .from('invoices')
        .select('*, client:clients(name)')
        .eq('workspace_id', workspace.id);

    const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('workspace_id', workspace.id);

    return (
        <div className="bg-background-dark text-white font-sans overflow-hidden min-h-screen antialiased selection:bg-primary selection:text-black">
            <div className="flex h-full w-full">
                <div className="fixed left-0 top-0 h-full z-50">
                    <Sidebar />
                </div>

                <main className="flex-1 flex flex-col relative overflow-hidden bg-background-dark ml-72">
                    <header className="absolute top-0 left-0 right-0 z-10 glass-header px-8 h-20 flex items-center justify-between">
                        <h2 className="text-white text-xl font-bold tracking-tight">RAPPORTS & ANALYSES</h2>
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