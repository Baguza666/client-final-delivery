'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SidebarContextType {
    isOpen: boolean
    toggle: () => void
    mobileOpen: boolean
    openMobile: () => void
    closeMobile: () => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(true)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [hydrated, setHydrated] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('sidebar-open')
        if (stored !== null) setIsOpen(stored === 'true')
        setHydrated(true)
    }, [])

    const toggle = () => {
        setIsOpen(v => {
            const next = !v
            localStorage.setItem('sidebar-open', String(next))
            return next
        })
    }

    const openMobile = () => setMobileOpen(true)
    const closeMobile = () => setMobileOpen(false)

    // Suppress layout shift before hydration by not rendering children yet
    // (handled by suppression in AppShell)
    return (
        <SidebarContext.Provider value={{ isOpen, toggle, mobileOpen, openMobile, closeMobile }}>
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebar() {
    const ctx = useContext(SidebarContext)
    if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
    return ctx
}
