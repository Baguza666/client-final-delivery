'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import OnboardingModal from './OnboardingModal';

// Define the navigation items
const menuItems = [
    { name: 'Tableau de bord', icon: 'dashboard', path: '/' },
    { name: 'Clients', icon: 'groups', path: '/clients' }, // ✅ Correct path
    { name: 'Devis', icon: 'description', path: '/quotes' },
    { name: 'Bons de Commande', icon: 'shopping_cart', path: '/purchase-orders' },
    { name: 'Bons de Livraison', icon: 'local_shipping', path: '/delivery-notes' },
    { name: 'Factures', icon: 'receipt_long', path: '/invoices' },
    { name: 'Services', icon: 'inventory_2', path: '/products' },
    { name: 'Dépenses', icon: 'account_balance_wallet', path: '/expenses' },
    { name: 'Rapports', icon: 'bar_chart', path: '/reports' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // 1. Initialize Supabase Client
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 2. Fetch User Session on Mount
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };
        getUser();
    }, [supabase]);

    // 3. Handle Logout
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push('/login');
    };

    // Helper: Get User Initials for Avatar
    const getInitials = () => {
        if (!user) return '??';
        const name = user.user_metadata?.full_name || user.email || '';
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <aside className="w-72 h-screen bg-black border-r border-white/5 flex flex-col fixed left-0 top-0 z-50">
            {/* Onboarding Popup Component */}
            <OnboardingModal />

            {/* Logo Section */}
            <div className="p-8 pb-4">
                <div className="relative w-60 h-15 mb-2 flex items-center">
                    <img
                        src="/logo1.png"
                        alt="IMSAL"
                        className="h-full w-auto object-contain object-left"
                    />
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar mt-2">
                {menuItems.map((item) => {
                    // Check if this link is currently active
                    const isActive = item.path === '/'
                        ? pathname === '/'
                        : pathname.startsWith(item.path);

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            prefetch={false} // ⚠️ CRITICAL: Prevents middleware loops on hover
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-white/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(244,185,67,0.1)]'
                                : 'text-[#a1a1aa] hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[20px] transition-colors ${isActive ? 'text-primary' : 'group-hover:text-white'}`}>
                                {item.icon}
                            </span>
                            <span className="font-medium text-sm">{item.name}</span>
                        </Link>
                    );
                })}

                {/* 'New Invoice' Quick Action Button */}
                <div className="pt-4 pb-2">
                    <Link
                        href="/invoices/new"
                        prefetch={false}
                        className="flex items-center justify-center gap-2 w-full bg-white/5 border border-white/10 text-white py-3 rounded-xl hover:bg-white/10 hover:border-primary/30 transition-all group"
                    >
                        <span className="material-symbols-outlined text-[20px] group-hover:text-primary transition-colors">add</span>
                        <span className="font-bold text-sm">Nouvelle Facture</span>
                    </Link>
                </div>
            </nav>

            {/* Footer: Settings & User Profile */}
            <div className="p-4 space-y-2 bg-black/50 backdrop-blur-xl border-t border-white/5">
                {/* Settings Link */}
                <Link
                    href="/settings"
                    prefetch={false}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === '/settings'
                        ? 'text-primary bg-white/5'
                        : 'text-[#a1a1aa] hover:text-white'
                        }`}
                >
                    <span className="material-symbols-outlined text-[20px]">settings</span>
                    <span className="font-medium text-sm">Paramètres</span>
                </Link>

                {/* User Profile / Logout Block */}
                {loading ? (
                    // Skeleton Loader while checking session
                    <div className="h-14 w-full bg-white/5 animate-pulse rounded-xl" />
                ) : user ? (
                    <div className="relative group">
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-white/10 transition-colors">
                            {/* Avatar Circle */}
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center text-white text-xs font-bold border border-white/10 shadow-lg shrink-0">
                                {getInitials()}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {user.user_metadata?.full_name || 'Utilisateur'}
                                </p>
                                <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                            </div>

                            {/* Logout Icon (Appears on Hover) */}
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSignOut();
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all absolute right-2 cursor-pointer"
                                title="Se déconnecter"
                            >
                                <span className="material-symbols-outlined text-[18px]">logout</span>
                            </div>
                        </button>
                    </div>
                ) : null}
            </div>
        </aside>
    );
}