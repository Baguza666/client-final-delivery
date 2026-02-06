'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import ClientsManager from '@/components/clients/ClientsManager'; // Points to src/components/clients/ClientsManager.tsx

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        const loadData = async () => {
            // 1. Check Session
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                router.push('/login');
                return;
            }
            setIsAuthenticated(true);

            // 2. Fetch Clients Data
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (data) {
                setClients(data);
            }
        };

        loadData();
    }, [supabase, router]);

    // Show loading/nothing while checking auth
    if (!isAuthenticated) {
        return <div className="min-h-screen bg-black" />;
    }

    // ✅ PASS THE DATA: We now send the 'clients' array to the component
    return <ClientsManager clients={clients} />;
}