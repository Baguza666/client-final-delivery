import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from "next/navigation";
import Sidebar from '@/components/Sidebar';
// ✅ Import the new Manager component
import ClientManager from '@/components/clients/ClientsManager';

export default async function ClientsPage() {
    // 1. Setup Supabase
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    // 2. Check Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/");

    // 3. Fetch Clients (Filtered by Owner)
    const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('owner_id', user.id) // ✅ Security: Only fetch my clients
        .order('created_at', { ascending: false });

    if (error) console.error("Error fetching clients:", error);

    return (
        <div className="bg-[#050505] text-white font-sans overflow-hidden min-h-screen antialiased">
            <div className="flex h-full w-full">

                {/* Fixed Sidebar */}
                <div className="fixed left-0 top-0 h-screen z-20">
                    <Sidebar />
                </div>

                <main className="flex-1 flex flex-col relative overflow-hidden bg-[#050505] ml-72">

                    {/* Glass Header */}
                    <header className="absolute top-0 left-0 right-0 z-10 glass-header px-8 h-20 flex items-center justify-between">
                        <h2 className="text-white text-xl font-bold tracking-tight">MES CLIENTS</h2>
                    </header>

                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto pt-28 pb-10 px-8">
                        <div className="max-w-[1200px] mx-auto w-full">

                            {/* ✅ The New Manager (Handles List, Add, Edit, Delete) */}
                            <ClientManager clients={clients || []} />

                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}