'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function EmailSettingsForm() {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState({
        smtp_host: 'smtp.gmail.com',
        smtp_port: 465,
        smtp_user: '',
        smtp_password: '',
        sender_name: ''
    });

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Load existing settings
    useEffect(() => {
        async function loadSettings() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('email_settings').select('*').eq('user_id', user.id).single();
                if (data) setConfig(data);
            }
        }
        loadSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { error } = await supabase
                .from('email_settings')
                .upsert({ ...config, user_id: user.id });

            if (!error) alert('Configuration sauvegardée !');
            else alert('Erreur sauvegarde.');
        }
        setLoading(false);
    };

    return (
        <div className="glass-card p-6 rounded-2xl border border-white/5 mt-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">mail</span>
                Configuration Email (SMTP)
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-[#a1a1aa] uppercase font-bold">Serveur SMTP</label>
                        <input
                            value={config.smtp_host}
                            onChange={e => setConfig({ ...config, smtp_host: e.target.value })}
                            placeholder="ex: smtp.gmail.com"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mt-1"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-[#a1a1aa] uppercase font-bold">Port</label>
                        <input
                            type="number"
                            value={config.smtp_port}
                            onChange={e => setConfig({ ...config, smtp_port: parseInt(e.target.value) })}
                            placeholder="465 ou 587"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mt-1"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs text-[#a1a1aa] uppercase font-bold">Email d'envoi</label>
                    <input
                        type="email"
                        value={config.smtp_user}
                        onChange={e => setConfig({ ...config, smtp_user: e.target.value })}
                        placeholder="votre.email@gmail.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mt-1"
                    />
                </div>

                <div>
                    <label className="text-xs text-[#a1a1aa] uppercase font-bold">Mot de passe d'application</label>
                    <input
                        type="password"
                        value={config.smtp_password}
                        onChange={e => setConfig({ ...config, smtp_password: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mt-1"
                    />
                    <p className="text-[10px] text-[#a1a1aa] mt-1">
                        Pour Gmail, utilisez un "Mot de passe d'application" (pas votre mot de passe normal).
                    </p>
                </div>

                <div>
                    <label className="text-xs text-[#a1a1aa] uppercase font-bold">Nom d'affichage</label>
                    <input
                        value={config.sender_name}
                        onChange={e => setConfig({ ...config, sender_name: e.target.value })}
                        placeholder="IMSAL Services"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mt-1"
                    />
                </div>

                <button disabled={loading} className="bg-primary text-black font-bold px-6 py-2 rounded-xl">
                    {loading ? 'Sauvegarde...' : 'SAUVEGARDER CONFIGURATION'}
                </button>
            </form>
        </div>
    );
}