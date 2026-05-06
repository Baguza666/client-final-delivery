'use client'

import { useState } from 'react'
import { saveEmailSettings } from '@/app/actions/settings'

const inputClass =
    'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none transition-all placeholder:text-zinc-600'
const labelClass =
    'block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-wider'

export default function EmailSettingsForm() {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setStatus('idle')
        const result = await saveEmailSettings(new FormData(e.currentTarget))
        setLoading(false)
        if (result.success) {
            setStatus('success')
        } else {
            setStatus('error')
            setErrorMsg(result.message || 'Erreur inconnue')
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-8 space-y-6"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className={labelClass}>Serveur SMTP</label>
                    <input
                        name="smtp_host"
                        defaultValue="smtp.gmail.com"
                        placeholder="smtp.gmail.com"
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className={labelClass}>Port</label>
                    <input
                        name="smtp_port"
                        type="number"
                        defaultValue={465}
                        placeholder="465 ou 587"
                        className={inputClass}
                    />
                </div>
            </div>

            <div>
                <label className={labelClass}>Email d'envoi</label>
                <input
                    name="smtp_email"
                    type="email"
                    placeholder="votre.email@gmail.com"
                    className={inputClass}
                />
            </div>

            <div>
                <label className={labelClass}>Mot de passe d'application</label>
                <input
                    name="smtp_password"
                    type="password"
                    placeholder="••••••••••••"
                    className={inputClass}
                />
                <p className="text-[10px] text-zinc-600 mt-1.5">
                    Pour Gmail, utilisez un "Mot de passe d'application" — pas votre mot de passe habituel.
                </p>
            </div>

            <div>
                <label className={labelClass}>Nom d'affichage</label>
                <input
                    name="sender_name"
                    placeholder="Votre entreprise"
                    className={inputClass}
                />
            </div>

            {/* Resend fallback */}
            <div className="pt-2 border-t border-white/[0.06] space-y-5">
                <div>
                    <h3 className="text-sm font-bold text-white">
                        Resend <span className="text-zinc-500 font-normal text-xs">(fallback)</span>
                    </h3>
                    <p className="text-[10px] text-zinc-600 mt-1">
                        Utilisé automatiquement si aucun SMTP n'est configuré.
                    </p>
                </div>
                <div>
                    <label className={labelClass}>Resend API Key</label>
                    <input
                        name="resend_api_key"
                        type="password"
                        placeholder="re_••••••••••••••••••••••••"
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className={labelClass}>Email d'envoi Resend</label>
                    <input
                        name="resend_from_email"
                        type="email"
                        placeholder="invoices@votredomaine.com"
                        className={inputClass}
                    />
                    <p className="text-[10px] text-zinc-600 mt-1.5">
                        Doit correspondre à un domaine vérifié dans Resend.
                    </p>
                </div>
            </div>

            {status === 'success' && (
                <div className="flex items-center gap-2 text-sm text-status-paid bg-status-paid/10 border border-status-paid/20 rounded-lg px-4 py-3">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Configuration email sauvegardée.
                </div>
            )}
            {status === 'error' && (
                <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {errorMsg}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enregistrement…
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Sauvegarder la configuration
                    </>
                )}
            </button>
        </form>
    )
}
