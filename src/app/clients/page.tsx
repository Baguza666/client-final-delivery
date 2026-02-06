'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import ClientsManager from '@/components/clients/ClientsManager';

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([]);

    // Create Supabase Client
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        const loadData = async () => {
            // 1. Try to get clients regardless of explicit login check
            // (If the browser has a cookie, this will work automatically)
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (data) {
                setClients(data);
            }
        };

        loadData();
    }, [supabase]);

    // Render the Manager directly. No auth checks blocking the view.
    return <ClientsManager clients={clients} />;
}