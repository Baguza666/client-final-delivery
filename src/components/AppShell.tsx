'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSidebar } from '@/contexts/SidebarContext'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import Logo from '@/components/ui/Logo'
import ChatWidget from '@/components/chat/ChatWidget'

const HIDDEN_ROUTES = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/unauthorized', '/auth', '/preview', '/mentions-legales']

function MobileTopBar() {
    const { openMobile } = useSidebar()
    return (
        <header className="lg:hidden sticky top-0 z-40 h-14 glass flex items-center justify-between px-4 print:hidden">
            <button
                onClick={openMobile}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
            >
                <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <Logo variant="full" className="h-6 w-auto" />
            <Link
                href="/invoices/new"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all"
            >
                <span className="material-symbols-outlined text-[20px]">add</span>
            </Link>
        </header>
    )
}

function MobileDrawer() {
    const { mobileOpen, closeMobile } = useSidebar()
    if (!mobileOpen) return null
    return (
        <div className="lg:hidden fixed inset-0 z-50 flex print:hidden">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeMobile} />
            <div className="relative z-10 w-[280px] h-full animate-slide-in">
                <Sidebar mobileDrawer onClose={closeMobile} />
            </div>
        </div>
    )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { isOpen } = useSidebar()

    const isHidden = HIDDEN_ROUTES.some(r => pathname === r || pathname.startsWith(`${r}/`))
    if (isHidden) return <>{children}</>

    return (
        <>
            <div className="hidden lg:block print:hidden">
                <Sidebar />
            </div>
            <MobileDrawer />

            <div className={`transition-[margin-left] duration-300 ease-in-out min-h-screen pb-20 lg:pb-0 print:ml-0 print:pb-0 print:min-h-0 ${isOpen ? 'lg:ml-sidebar' : 'lg:ml-sidebar-sm'}`}>
                <MobileTopBar />
                {children}
            </div>

            <BottomNav />
            <ChatWidget />
        </>
    )
}
