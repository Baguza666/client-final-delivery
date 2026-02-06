import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function ClientsPage() {
    const cookieStore = await cookies()

    // 1. Initialize Supabase with proper cookie handling
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Server Components can't set cookies, so we ignore this safely
                    }
                },
            },
        }
    )

    // 2. Strict Auth Check
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    // 3. Fetch Clients (Safely)
    const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Clients</h1>
                    <p className="text-zinc-500 text-sm mt-1">Gérez votre base de données clients</p>
                </div>
                {/* You can add a 'New Client' button logic here later if needed */}
                <button className="bg-[#EAB308] text-black px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wide hover:bg-yellow-400 transition-colors">
                    + Nouveau Client
                </button>
            </div>

            {/* Clients Table */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden backdrop-blur-sm">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-widest">
                            <th className="px-6 py-4 font-medium">Nom de l'entreprise</th>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium">Téléphone</th>
                            <th className="px-6 py-4 font-medium">Ville</th>
                            <th className="px-6 py-4 text-right font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {clients && clients.length > 0 ? (
                            clients.map((client: any) => (
                                <tr key={client.id} className="hover:bg-zinc-800/30 transition-colors group">
                                    <td className="px-6 py-4 text-white font-bold">{client.name}</td>
                                    <td className="px-6 py-4 text-zinc-400">{client.email || '-'}</td>
                                    <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{client.phone || '-'}</td>
                                    <td className="px-6 py-4 text-zinc-400">{client.city || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-zinc-600 group-hover:text-white cursor-pointer text-xs uppercase font-bold tracking-wider">
                                            Modifier
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                    Aucun client trouvé.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}