'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
    { name: 'Accueil',   icon: 'home',                  path: '/dashboard' },
    { name: 'Factures',  icon: 'receipt_long',           path: '/invoices' },
    { name: 'Clients',   icon: 'groups',                 path: '/clients' },
    { name: 'Dépenses',  icon: 'account_balance_wallet', path: '/expenses' },
]

const HIDDEN_ROUTES = ['/login', '/unauthorized', '/auth']

export default function BottomNav() {
    const pathname = usePathname()
    const isHidden = HIDDEN_ROUTES.some(r => pathname === r || pathname.startsWith(`${r}/`))
    if (isHidden) return null

    const isActive = (path: string) =>
        path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)

    return (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 pb-safe print:hidden">
            <div className="glass border-t border-white/[0.06] px-2 h-16 flex items-center">
                {/* Left 2 tabs */}
                <div className="flex flex-1 items-center justify-around">
                    {TABS.slice(0, 2).map(tab => {
                        const active = isActive(tab.path)
                        return (
                            <Link
                                key={tab.path}
                                href={tab.path}
                                className="flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px]"
                            >
                                <span className={`material-symbols-outlined text-[22px] transition-colors ${active ? 'text-primary' : 'text-white/35'}`}>
                                    {tab.icon}
                                </span>
                                <span className={`text-[9px] font-bold tracking-wide transition-colors ${active ? 'text-primary' : 'text-white/30'}`}>
                                    {tab.name}
                                </span>
                            </Link>
                        )
                    })}
                </div>

                {/* Centre FAB — new invoice */}
                <div className="flex items-center justify-center mx-2">
                    <Link
                        href="/invoices/new"
                        className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-glow text-white"
                    >
                        <span className="material-symbols-outlined text-[22px]">add</span>
                    </Link>
                </div>

                {/* Right 2 tabs */}
                <div className="flex flex-1 items-center justify-around">
                    {TABS.slice(2).map(tab => {
                        const active = isActive(tab.path)
                        return (
                            <Link
                                key={tab.path}
                                href={tab.path}
                                className="flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px]"
                            >
                                <span className={`material-symbols-outlined text-[22px] transition-colors ${active ? 'text-primary' : 'text-white/35'}`}>
                                    {tab.icon}
                                </span>
                                <span className={`text-[9px] font-bold tracking-wide transition-colors ${active ? 'text-primary' : 'text-white/30'}`}>
                                    {tab.name}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </nav>
    )
}
