'use client'

import { useState } from 'react'

const gmailTroubleshooting = [
    ['"Invalid login"', "Utilisez le mot de passe d'application (16 car.), pas votre mot de passe Gmail."],
    ['"Username and Password not accepted"', "La validation en 2 étapes n'est pas activée — retournez à l'étape 1."],
    ['"Connection timeout"', 'Essayez le port 587 à la place du 465.'],
    ['"Less secure app access"', "Cette option est supprimée. Utilisez un Mot de passe d'application."],
    ['Email en spam', "Configurez un nom d'affichage professionnel."],
] as const

const resendTroubleshooting = [
    ['"API key not found"', 'Vérifiez que la clé est bien enregistrée (formulaire ci-dessous).'],
    ['Envoi depuis onboarding@resend.dev', 'Renseignez le champ "Email d\'envoi Resend" avec votre domaine vérifié.'],
    ['"Domain not verified"', 'Ajoutez les enregistrements DNS indiqués dans le dashboard Resend.'],
    ['App utilise Resend malgré SMTP configuré', 'Le SMTP prend la priorité dès que smtp_email est enregistré.'],
] as const

const gmailConfigRows = [
    ["Serveur SMTP", "smtp.gmail.com"],
    ["Port", "465 (ou 587)"],
    ["Email d'envoi", "votre.email@gmail.com"],
    ["Mot de passe", "Le mot de passe d'application (16 car.)"],
    ["Nom d'affichage", "Votre entreprise"],
] as const

export default function EmailSetupGuide() {
    const [isOpen, setIsOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'gmail' | 'resend'>('gmail')

    return (
        <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl overflow-hidden">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">menu_book</span>
                    <span className="text-sm font-semibold text-white">Guide de configuration</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded-full">
                        Comment configurer ?
                    </span>
                </div>
                <span className={`material-symbols-outlined text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            {isOpen && (
                <div className="animate-fade-up border-t border-white/[0.06] px-6 pb-6 pt-5 space-y-6">
                    {/* Provider comparison */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setActiveTab('gmail')}
                            className={`p-4 rounded-xl border text-left transition-all ${
                                activeTab === 'gmail'
                                    ? 'bg-primary/10 border-primary/20'
                                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className="material-symbols-outlined text-[20px] text-zinc-300">mail</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">
                                    Recommandé
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-white">Gmail SMTP</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">Gratuit, rapide à configurer</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('resend')}
                            className={`p-4 rounded-xl border text-left transition-all ${
                                activeTab === 'resend'
                                    ? 'bg-amber-500/[0.08] border-amber-500/20'
                                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className="material-symbols-outlined text-[20px] text-zinc-300">send</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/[0.08] text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                                    Fallback
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-white">Resend</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">Cloud, domaine personnalisé</p>
                        </button>
                    </div>

                    {/* Tab bar */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('gmail')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === 'gmail'
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            Gmail SMTP
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('resend')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === 'resend'
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            Resend (cloud)
                        </button>
                    </div>

                    {/* Gmail tab */}
                    {activeTab === 'gmail' && (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl px-4 py-3">
                                <span className="material-symbols-outlined text-[18px] text-amber-400 mt-0.5">warning</span>
                                <p className="text-xs text-amber-400">
                                    <span className="font-bold">Prérequis :</span> La validation en 2 étapes doit être activée sur votre compte Google avant de créer un mot de passe d'application.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</span>
                                    <div className="pt-0.5">
                                        <p className="text-sm text-white font-medium">Activer la validation en 2 étapes</p>
                                        <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:text-accent transition-colors mt-1">
                                            myaccount.google.com/security
                                            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                                        </a>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</span>
                                    <div className="pt-0.5">
                                        <p className="text-sm text-white font-medium">Créer un Mot de passe d'application</p>
                                        <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:text-accent transition-colors mt-1">
                                            myaccount.google.com/apppasswords
                                            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                                        </a>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center">3</span>
                                    <div className="pt-0.5 w-full">
                                        <p className="text-sm text-white font-medium mb-2">Remplissez le formulaire ci-dessous</p>
                                        <div className="space-y-1.5">
                                            {gmailConfigRows.map(([label, value]) => (
                                                <div key={label} className="flex items-center gap-3 bg-zinc-950/60 border border-white/[0.06] rounded-xl px-4 py-2 text-xs">
                                                    <span className="text-zinc-500 w-32 shrink-0">{label}</span>
                                                    <span className="font-mono text-zinc-300">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-zinc-600 mt-2">* Si le port 465 est bloqué, essayez le port 587.</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center">4</span>
                                    <div className="pt-0.5">
                                        <p className="text-sm text-white font-medium">Enregistrer et tester</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">Cliquez sur "Sauvegarder", puis envoyez un document par email pour tester.</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Dépannage</p>
                                <div className="space-y-0">
                                    {gmailTroubleshooting.map(([err, sol]) => (
                                        <div key={err} className="grid grid-cols-[1fr_2fr] gap-3 text-xs py-2 border-b border-white/[0.04] last:border-0">
                                            <span className="text-zinc-400 font-mono">{err}</span>
                                            <span className="text-zinc-500">{sol}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Resend tab */}
                    {activeTab === 'resend' && (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl px-4 py-3">
                                <span className="material-symbols-outlined text-[18px] text-amber-400 mt-0.5">info</span>
                                <p className="text-xs text-amber-400">
                                    Resend est utilisé en fallback uniquement si aucun SMTP n'est configuré. Chaque workspace peut avoir sa propre clé API.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</span>
                                    <div className="pt-0.5">
                                        <p className="text-sm text-white font-medium">Créer un compte Resend</p>
                                        <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:text-accent transition-colors mt-1">
                                            resend.com
                                            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                                        </a>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</span>
                                    <div className="pt-0.5">
                                        <p className="text-sm text-white font-medium">Générer une clé API</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">
                                            Dashboard Resend → API Keys → Create API Key. Sélectionnez l'accès <span className="font-mono text-zinc-400">Sending access</span>.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center">3</span>
                                    <div className="pt-0.5">
                                        <p className="text-sm text-white font-medium">Collez la clé dans le formulaire ci-dessous</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">
                                            Copiez la clé générée et collez-la dans le champ <span className="font-mono text-zinc-400">Resend API Key</span> ci-dessous.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center">4</span>
                                    <div className="pt-0.5">
                                        <p className="text-sm text-white font-medium">
                                            <span className="text-zinc-500 font-normal">(Optionnel)</span> Renseignez votre email d'envoi
                                        </p>
                                        <p className="text-xs text-zinc-500 mt-0.5">
                                            Ajoutez votre domaine vérifié dans le champ <span className="font-mono text-zinc-400">Email d'envoi Resend</span>. Sans cela, les emails partent depuis <span className="font-mono text-zinc-400">onboarding@resend.dev</span>.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Dépannage</p>
                                <div className="space-y-0">
                                    {resendTroubleshooting.map(([err, sol]) => (
                                        <div key={err} className="grid grid-cols-[1fr_2fr] gap-3 text-xs py-2 border-b border-white/[0.04] last:border-0">
                                            <span className="text-zinc-400 font-mono">{err}</span>
                                            <span className="text-zinc-500">{sol}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
