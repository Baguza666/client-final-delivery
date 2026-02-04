'use client';

import { useState } from 'react';
import { updateSettings } from '@/app/actions/settings';

export default function SettingsForm({ workspace }: { workspace: any }) {
    const [loading, setLoading] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(workspace?.logo_url || null);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setLogoPreview(objectUrl);
        }
    };

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        await updateSettings(formData);
        setLoading(false);
        alert('Paramètres mis à jour !');
    };

    return (
        <form action={handleSubmit} className="flex flex-col gap-8 pb-20">
            <input type="hidden" name="workspace_id" value={workspace?.id} />
            <input type="hidden" name="current_logo_url" value={workspace?.logo_url || ''} />

            {/* 1. IDENTITY & LOGO CARD */}
            <div className="glass-card p-8 rounded-3xl border border-white/5 flex flex-col md:flex-row gap-8 items-center md:items-start">

                {/* Logo Uploader */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative group w-32 h-32 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden bg-white/5 hover:border-primary/50 transition-colors">
                        {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-4xl text-text-secondary">add_a_photo</span>
                        )}

                        <input
                            type="file"
                            name="logo"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                    </div>
                    <p className="text-xs text-text-secondary uppercase tracking-widest font-bold">Votre Logo</p>
                </div>

                {/* Name & Identifiers */}
                <div className="flex-1 w-full space-y-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Nom de l'entreprise</label>
                        <input
                            name="name"
                            defaultValue={workspace?.name || ''}
                            placeholder="Ex: IMSAL SERVICES"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Identifiants Légaux (Pied de page)</label>
                        <input
                            name="tax_id"
                            defaultValue={workspace?.tax_id || ''}
                            placeholder="Ex: ICE: 12345 • RC: 67890 • IF: 112233"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                        />
                        <p className="text-[10px] text-text-secondary">Ces informations apparaîtront automatiquement en bas de vos factures.</p>
                    </div>
                </div>
            </div>

            {/* 2. ADDRESS CARD */}
            <div className="glass-card p-8 rounded-3xl border border-white/5 space-y-6">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">location_on</span>
                    Adresse & Coordonnées
                </h3>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Adresse</label>
                    <input
                        name="address"
                        defaultValue={workspace?.address || ''}
                        placeholder="Ex: 123 Boulevard Mohammed V"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Ville</label>
                        <input
                            name="city"
                            defaultValue={workspace?.city || ''}
                            placeholder="Ex: Casablanca"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Pays</label>
                        <input
                            name="country"
                            defaultValue={workspace?.country || ''}
                            placeholder="Ex: Maroc"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* SAVE BUTTON */}
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-4 rounded-xl bg-gold-gradient text-black font-bold shadow-[0_0_20px_rgba(244,185,67,0.3)] hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? 'Enregistrement...' : 'SAUVEGARDER LES MODIFICATIONS'}
                </button>
            </div>
        </form>
    );
}