'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Sidebar from '@/components/Sidebar';
import { useUserRole } from '@/hooks/useUserRole';
import TeamManager from '@/components/settings/TeamManager';
import { updateSettings, saveEmailSettings } from '@/app/actions/settings';

export default function SettingsPage() {
    const { role, loading, isAdmin } = useUserRole();
    const router = useRouter();

    // State
    const [profiles, setProfiles] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState('');
    const [workspace, setWorkspace] = useState<any>(null);
    const [emailSettings, setEmailSettings] = useState<any>(null);

    // UI States
    const [savingWorkspace, setSavingWorkspace] = useState(false);
    const [savingEmail, setSavingEmail] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Security Check
    useEffect(() => {
        if (!loading && !isAdmin) {
            router.push('/dashboard');
        }
    }, [loading, isAdmin, router]);

    // 2. Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            // A. Fetch Profiles
            const { data: profilesData } = await supabase.from('profiles').select('*');
            if (profilesData) setProfiles(profilesData);

            // B. Fetch Workspace
            const { data: wsData } = await supabase
                .from('workspaces')
                .select('*')
                .eq('owner_id', user.id)
                .single();

            if (wsData) {
                setWorkspace(wsData);
                // C. Fetch Settings
                const { data: settingsData } = await supabase
                    .from('workspace_settings')
                    .select('*')
                    .eq('workspace_id', wsData.id)
                    .single();
                if (settingsData) setEmailSettings(settingsData);
            }
        };
        if (isAdmin) fetchData();
    }, [isAdmin, supabase]);

    // --- HANDLER: Workspace Update ---
    const handleWorkspaceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSavingWorkspace(true);
        setMessage(null);

        const formData = new FormData(e.currentTarget);
        if (workspace?.id) formData.append('workspace_id', workspace.id);
        // Pass current logo url so we don't lose it if no new file is uploaded
        if (workspace?.logo_url) formData.append('current_logo_url', workspace.logo_url);

        const result = await updateSettings(formData);

        if (result?.error) {
            setMessage({ text: result.error, type: 'error' });
        } else {
            setMessage({ text: "Informations mises à jour avec succès !", type: 'success' });
            router.refresh();
        }
        setSavingWorkspace(false);
    };

    // --- HANDLER: Email Update ---
    const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSavingEmail(true);
        setMessage(null);

        const formData = new FormData(e.currentTarget);
        const result = await saveEmailSettings(formData);

        setMessage({
            text: result.message,
            type: result.success ? 'success' : 'error'
        });
        setSavingEmail(false);
    };

    if (loading) return <div className="p-10 text-white">Chargement...</div>;
    if (!isAdmin) return null;

    return (
        <div className="bg-background-dark text-white font-sans overflow-hidden min-h-screen antialiased">
            <div className="flex h-full w-full">
                <Sidebar />

                <main className="flex-1 flex flex-col relative overflow-hidden bg-background-dark ml-72">
                    <header className="absolute top-0 left-0 right-0 z-10 glass-header px-8 h-20 flex items-center justify-between">
                        <h2 className="text-white text-xl font-bold tracking-tight">PARAMÈTRES</h2>
                    </header>

                    <div className="flex-1 overflow-y-auto pt-28 pb-10 px-8">
                        <div className="max-w-[1000px] mx-auto w-full space-y-12">

                            {/* ALERT MESSAGE */}
                            {message && (
                                <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'} font-bold text-center animate-in slide-in-from-top-2`}>
                                    {message.text}
                                </div>
                            )}

                            {/* --- 1. GENERAL INFO --- */}
                            <section className="bg-zinc-900 border border-white/5 p-8 rounded-2xl">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-yellow-500">business</span>
                                    Informations Entreprise
                                </h3>

                                <form onSubmit={handleWorkspaceSubmit} className="space-y-6">

                                    {/* ✅ RESTORED: LOGO UPLOADER */}
                                    <div className="flex gap-8 items-start mb-8 border-b border-white/5 pb-8">
                                        <div className="w-24 h-24 bg-black/50 border border-white/10 rounded-xl flex items-center justify-center relative overflow-hidden">
                                            {workspace?.logo_url ? (
                                                <img src={workspace.logo_url} alt="Logo" className="object-contain w-full h-full" />
                                            ) : (
                                                <span className="material-symbols-outlined text-4xl text-zinc-600">image</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Logo (Fichier)</label>
                                            <input
                                                name="logo"
                                                type="file"
                                                accept="image/*"
                                                className="w-full bg-black/50 border border-white/10 rounded-lg p-2 mt-1 text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500/10 file:text-yellow-500 hover:file:bg-yellow-500/20 transition-colors"
                                            />
                                            <p className="text-[10px] text-zinc-500 mt-2">Formats acceptés: JPG, PNG, WEBP. Max 2MB.</p>
                                        </div>
                                    </div>

                                    {/* INFO FIELDS */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Nom de l'entreprise</label>
                                            <input name="name" defaultValue={workspace?.name} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-yellow-500 outline-none transition-colors" />
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Email Principal</label>
                                            <input name="email" defaultValue={workspace?.email} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-yellow-500 outline-none transition-colors" />
                                        </div>

                                        {/* SECONDARY EMAIL */}
                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Email Secondaire</label>
                                            <input name="email_secondary" defaultValue={workspace?.email_secondary} placeholder="ex: compta@imsal.com" className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-yellow-500 outline-none transition-colors" />
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Téléphone</label>
                                            <input name="phone" defaultValue={workspace?.phone} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-yellow-500 outline-none transition-colors" />
                                        </div>
                                    </div>

                                    {/* ADDRESS */}
                                    <div>
                                        <label className="text-xs font-bold text-zinc-400 uppercase">Adresse Complète</label>
                                        <textarea name="address" defaultValue={workspace?.address} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-yellow-500 outline-none transition-colors h-24"></textarea>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Ville</label>
                                            <input name="city" defaultValue={workspace?.city} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-yellow-500 outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Pays</label>
                                            <input name="country" defaultValue={workspace?.country} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-yellow-500 outline-none transition-colors" />
                                        </div>
                                    </div>

                                    {/* LEGAL & BANKING */}
                                    <h4 className="text-sm font-bold text-yellow-500 mt-8 mb-4 border-b border-white/5 pb-2">Mentions Légales & Bancaires</h4>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 uppercase">ICE</label>
                                            <input name="ice" defaultValue={workspace?.ice} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-yellow-500 outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 uppercase">RC</label>
                                            <input name="rc" defaultValue={workspace?.rc} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-yellow-500 outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Identifiant Fiscal (IF)</label>
                                            <input name="tax_id" defaultValue={workspace?.tax_id} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-yellow-500 outline-none transition-colors" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Nom de la Banque</label>
                                            <input name="bank_name" defaultValue={workspace?.bank_name} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-yellow-500 outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 uppercase">RIB</label>
                                            <input name="rib" defaultValue={workspace?.rib} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-yellow-500 outline-none transition-colors font-mono" />
                                        </div>
                                    </div>

                                    <div className="flex justify-end mt-6">
                                        <button disabled={savingWorkspace} className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:scale-105 transition-transform text-sm flex items-center gap-2">
                                            {savingWorkspace ? 'Enregistrement...' : 'ENREGISTRER LES MODIFICATIONS'}
                                            <span className="material-symbols-outlined">save</span>
                                        </button>
                                    </div>
                                </form>
                            </section>

                            {/* --- 2. EMAIL CONFIG --- */}
                            <section className="bg-zinc-900 border border-white/5 p-8 rounded-2xl">
                                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">mail</span>
                                    Configuration Email (SMTP)
                                </h3>
                                <p className="text-sm text-zinc-500 mb-6">Paramètres pour l'envoi automatique des factures.</p>

                                <form onSubmit={handleEmailSubmit} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Serveur SMTP</label>
                                            <input name="smtp_host" defaultValue={emailSettings?.smtp_host || 'smtp.gmail.com'} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-primary outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Port</label>
                                            <input name="smtp_port" defaultValue={emailSettings?.smtp_port || '465'} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-primary outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-400 uppercase">Email d'envoi</label>
                                        <input name="smtp_email" type="email" defaultValue={emailSettings?.smtp_email} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-primary outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-400 uppercase">Mot de passe d'application</label>
                                        <input name="smtp_password" type="password" defaultValue={emailSettings?.smtp_password} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mt-1 text-white focus:border-primary outline-none" />
                                    </div>
                                    <button disabled={savingEmail} className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-colors text-sm">
                                        {savingEmail ? 'Sauvegarde...' : 'Sauvegarder la configuration Email'}
                                    </button>
                                </form>
                            </section>

                            {/* --- 3. TEAM --- */}
                            <section>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">group</span>
                                    Gestion de l'équipe
                                </h3>
                                <TeamManager profiles={profiles} currentUserId={currentUserId} />
                            </section>

                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}