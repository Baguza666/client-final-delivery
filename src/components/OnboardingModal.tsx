'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function OnboardingModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        const checkProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, role')
                .eq('id', user.id)
                .single();

            // If name is missing, open the modal
            if (profile && !profile.full_name) {
                setIsOpen(true);
            }
        };
        checkProfile();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    role: role || 'Fondateur' // Default role
                })
                .eq('id', user.id);

            if (!error) {
                setIsOpen(false);
                router.refresh(); // Refresh page to update Sidebar
            }
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl max-w-md w-full relative">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                        <span className="material-symbols-outlined text-3xl">waving_hand</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Bienvenue !</h2>
                    <p className="text-[#a1a1aa] text-sm mt-2">Configurons votre profil pour commencer.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs text-[#a1a1aa] uppercase font-bold ml-1">Nom Complet</label>
                        <input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Ex: Hicham Zineddine"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mt-1 outline-none focus:border-primary"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-xs text-[#a1a1aa] uppercase font-bold ml-1">Rôle / Titre</label>
                        <input
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="Ex: CEO, Manager..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mt-1 outline-none focus:border-primary"
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="w-full bg-gold-gradient text-black font-bold h-12 rounded-xl mt-4 hover:scale-[1.02] transition-transform"
                    >
                        {loading ? 'Enregistrement...' : 'COMMENCER'}
                    </button>
                </form>
            </div>
        </div>
    );
}