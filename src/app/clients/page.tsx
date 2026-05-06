'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import ClientsManager from '@/components/clients/ClientsManager'
import type { ClientStats } from '@/components/clients/ClientCard'

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([])
    const [statsById, setStatsById] = useState<Record<string, ClientStats>>({})
    const [isLoading, setIsLoading] = useState(true)

    const supabase = useMemo(
        () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
        [],
    )

    const loadData = useCallback(async () => {
        const [{ data: clientsData }, { data: invoicesData }] = await Promise.all([
            supabase.from('clients').select('*').order('created_at', { ascending: false }),
            supabase.from('invoices').select('client_id, status, total_ttc'),
        ])

        const stats: Record<string, ClientStats> = {}
        for (const inv of invoicesData || []) {
            const cid = inv.client_id
            if (!cid) continue
            if (!stats[cid]) stats[cid] = { count: 0, total: 0, paid: 0 }
            stats[cid].count += 1
            const amount = Number(inv.total_ttc ?? 0)
            stats[cid].total += amount
            if (inv.status === 'paid') stats[cid].paid += amount
        }

        setClients(clientsData || [])
        setStatsById(stats)
        setIsLoading(false)
    }, [supabase])

    useEffect(() => {
        loadData()
    }, [loadData])

    return <ClientsManager clients={clients} statsById={statsById} isLoading={isLoading} onChanged={loadData} />
}
