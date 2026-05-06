'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createBrowserClient } from '@supabase/ssr'
import { useSidebar } from '@/contexts/SidebarContext'
import OnboardingModal from './OnboardingModal'
import Logo from './ui/Logo'
import { signout } from '@/app/auth/actions'

interface MenuItem { name: string; icon: string; path: string }
interface MenuSection { label: string | null; items: MenuItem[] }

const DOC_TYPES = [
    { label: 'Devis',            icon: 'description',    href: '/quotes/new' },
    { label: 'Bon de commande',  icon: 'shopping_cart',  href: '/purchase-orders/new' },
    { label: 'Bon de livraison', icon: 'local_shipping', href: '/delivery-notes/new' },
    { label: 'Facture',          icon: 'receipt_long',   href: '/invoices/new' },
]

const MENU: MenuSection[] = [
    {
        label: null,
        items: [{ name: 'Tableau de bord', icon: 'home', path: '/dashboard' }],
    },
    {
        label: 'Vente',
        items: [
            { name: 'Devis',             icon: 'description',       path: '/quotes' },
            { name: 'Bons de commande',  icon: 'shopping_cart',     path: '/purchase-orders' },
            { name: 'Bons de livraison', icon: 'local_shipping',    path: '/delivery-notes' },
            { name: 'Factures',          icon: 'receipt_long',      path: '/invoices' },
            { name: 'Recurrentes',       icon: 'autorenew',         path: '/invoices/recurring' },
        ],
    },
    {
        label: 'Gestion',
        items: [
            { name: 'Clients',           icon: 'groups',                  path: '/clients' },
            { name: 'Catalogue',         icon: 'inventory_2',             path: '/products' },
            { name: 'Dépenses',          icon: 'account_balance_wallet',  path: '/expenses' },
            { name: 'Rapprochement',     icon: 'account_balance',         path: '/reconciliation' },
            { name: 'Rapports',          icon: 'bar_chart',               path: '/reports' },
        ],
    },
]

interface SidebarProps {
    mobileDrawer?: boolean
    onClose?: () => void
}

export default function Sidebar({ mobileDrawer = false, onClose }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const { isOpen, toggle } = useSidebar()
    const [user, setUser] = useState<any>(null)
    const [mounted, setMounted] = useState(false)
    const [docMenuOpen, setDocMenuOpen] = useState(false)
    const [docMenuPos, setDocMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
    const docButtonRef = useRef<HTMLButtonElement>(null)
    const docMenuRef = useRef<HTMLDivElement>(null)

    const expanded = mobileDrawer ? true : isOpen

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    }, [])

    useEffect(() => { setMounted(true) }, [])

    useLayoutEffect(() => {
        if (!docMenuOpen || !docButtonRef.current) return
        function updatePos() {
            const rect = docButtonRef.current?.getBoundingClientRect()
            if (!rect) return
            setDocMenuPos(expanded
                ? { top: rect.bottom + 4, left: rect.left, width: rect.width }
                : { top: rect.top, left: rect.right + 8, width: 200 }
            )
        }
        updatePos()
        window.addEventListener('resize', updatePos)
        return () => window.removeEventListener('resize', updatePos)
    }, [docMenuOpen, expanded])

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const t = e.target as Node
            if (!docButtonRef.current?.contains(t) && !docMenuRef.current?.contains(t)) {
                setDocMenuOpen(false)
            }
        }
        if (docMenuOpen) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [docMenuOpen])

    const initials = (() => {
        if (!user) return '?'
        const name = user.user_metadata?.full_name || user.email || ''
        const parts = name.trim().split(/[\s.@]+/).filter(Boolean)
        return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || name.slice(0, 2).toUpperCase()
    })()

    const isActive = (path: string) =>
        path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)

    const sidebarCls = mobileDrawer
        ? 'relative h-full w-full flex flex-col bg-slate-950 overflow-hidden print:hidden'
        : `fixed left-0 top-0 h-screen z-40 flex flex-col bg-slate-950 border-r border-slate-800 overflow-hidden transition-[width] duration-300 ease-in-out print:hidden ${isOpen ? 'w-sidebar' : 'w-sidebar-sm'}`

    return (
        <aside className={sidebarCls}>
            <OnboardingModal />

            {/* ── Header ── */}
            <div className={`flex items-center border-b border-white/[0.06] shrink-0 h-[60px] ${expanded ? 'px-4 justify-between' : 'px-0 justify-center'}`}>
                {expanded ? (
                    <>
                        <Logo variant="full" className="h-6 w-auto" />
                        {mobileDrawer ? (
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        ) : (
                            <button
                                onClick={toggle}
                                title="Réduire"
                                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                        )}
                    </>
                ) : (
                    <button
                        onClick={toggle}
                        title="Élargir"
                        className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
                    >
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                )}
            </div>

            {/* ── CTA ── */}
            <div className={`shrink-0 ${expanded ? 'px-3 pt-4 pb-2' : 'px-2 pt-4 pb-2'}`}>
                <button
                    ref={docButtonRef}
                    onClick={() => setDocMenuOpen(o => !o)}
                    className={`flex items-center justify-center gap-2 bg-brand-gradient text-white font-bold rounded-xl shadow-glow-sm hover:shadow-glow transition-all text-sm ${expanded ? 'w-full py-2.5 px-4' : 'w-10 h-10 mx-auto p-0'}`}
                    title={expanded ? undefined : 'Nouveau Document'}
                >
                    <span className="material-symbols-outlined text-[18px] shrink-0">add</span>
                    {expanded && <span className="whitespace-nowrap">Nouveau Document</span>}
                </button>
            </div>

            {/* ── Doc-type dropdown (portal) ── */}
            {docMenuOpen && mounted && createPortal(
                <div
                    ref={docMenuRef}
                    style={{ top: docMenuPos.top, left: docMenuPos.left, minWidth: docMenuPos.width }}
                    className="fixed z-[9999] bg-slate-950 border border-slate-800 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden animate-fade-in"
                >
                    {DOC_TYPES.map(({ label, icon, href }) => (
                        <button
                            key={href}
                            onClick={() => { setDocMenuOpen(false); onClose?.(); router.push(href) }}
                            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                        >
                            <span className="material-symbols-outlined text-[18px] text-slate-500 shrink-0">{icon}</span>
                            {label}
                        </button>
                    ))}
                </div>,
                document.body
            )}

            {/* ── Nav ── */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar py-2 px-2">
                {MENU.map((section, idx) => (
                    <div key={section.label ?? `s${idx}`} className={idx > 0 ? 'mt-4' : ''}>
                        {section.label && expanded && (
                            <p className="px-3 mb-1 text-[9px] font-bold tracking-[0.20em] text-white/25 uppercase">
                                {section.label}
                            </p>
                        )}
                        {section.label && !expanded && (
                            <div className="mx-3 mb-2 h-px bg-white/[0.06]" />
                        )}
                        <ul className="space-y-0.5">
                            {section.items.map(item => {
                                const active = isActive(item.path)
                                return (
                                    <li key={item.path}>
                                        <Link
                                            href={item.path}
                                            onClick={onClose}
                                            title={expanded ? undefined : item.name}
                                            className={`relative flex items-center rounded-xl transition-all duration-150 ${
                                                expanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-3'
                                            } ${
                                                active
                                                    ? 'bg-primary/[0.10] text-white'
                                                    : 'text-white/40 hover:text-white hover:bg-white/[0.04]'
                                            }`}
                                        >
                                            {active && expanded && (
                                                <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-primary rounded-full" />
                                            )}
                                            <span className={`material-symbols-outlined text-[20px] shrink-0 transition-colors ${active ? 'text-primary' : ''}`}>
                                                {item.icon}
                                            </span>
                                            {expanded && (
                                                <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                                                    {item.name}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* ── Footer ── */}
            <div className={`shrink-0 border-t border-white/[0.06] ${expanded ? 'px-2 py-3 space-y-0.5' : 'px-2 py-3 space-y-0.5'}`}>
                {/* Settings */}
                <Link
                    href="/settings"
                    onClick={onClose}
                    title={expanded ? undefined : 'Paramètres'}
                    className={`relative flex items-center rounded-xl transition-all duration-150 ${
                        expanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-3'
                    } ${
                        pathname === '/settings'
                            ? 'bg-primary/[0.10] text-white'
                            : 'text-white/40 hover:text-white hover:bg-white/[0.04]'
                    }`}
                >
                    {pathname === '/settings' && expanded && (
                        <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-primary rounded-full" />
                    )}
                    <span className={`material-symbols-outlined text-[20px] shrink-0 ${pathname === '/settings' ? 'text-primary' : ''}`}>
                        settings
                    </span>
                    {expanded && <span className="text-sm font-medium">Paramètres</span>}
                </Link>

                {/* User */}
                {user && (
                    <div className={`flex items-center rounded-xl hover:bg-white/[0.04] transition-all ${expanded ? 'gap-3 px-3 py-2' : 'justify-center p-2'}`}>
                        <div className="w-7 h-7 rounded-full bg-brand-gradient flex items-center justify-center text-white text-[10px] font-bold shrink-0 border border-white/[0.12]">
                            {initials}
                        </div>
                        {expanded && (
                            <>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-white/80 truncate">
                                        {user.user_metadata?.full_name || 'Utilisateur'}
                                    </p>
                                    <p className="text-[10px] text-white/30 truncate">{user.email}</p>
                                </div>
                                <form action={signout}>
                                    <button
                                        type="submit"
                                        title="Déconnexion"
                                        className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">logout</span>
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                )}
            </div>
        </aside>
    )
}
