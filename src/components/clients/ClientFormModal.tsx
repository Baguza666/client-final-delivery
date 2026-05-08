'use client'

import { useEffect, useRef, useState } from 'react'

export interface ClientFormValues {
    id?: string
    name: string
    email: string
    phone: string
    city: string
    address: string
    ice: string
    if?: string
    country_code?: string
    type?: 'client' | 'supplier' | 'both'
}

interface ClientFormModalProps {
    isOpen: boolean
    mode: 'create' | 'edit'
    initial?: Partial<ClientFormValues>
    submitting: boolean
    onClose: () => void
    onSubmit: (values: ClientFormValues) => void
}

const blank: ClientFormValues = { name: '', email: '', phone: '', city: '', address: '', ice: '', if: '', country_code: 'MA', type: 'client' }

export default function ClientFormModal({ isOpen, mode, initial, submitting, onClose, onSubmit }: ClientFormModalProps) {
    const [values, setValues] = useState<ClientFormValues>({ ...blank, ...initial })
    const firstFieldRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        if (isOpen) {
            setValues({ ...blank, ...initial })
            // Focus the first field when the modal opens
            setTimeout(() => firstFieldRef.current?.focus(), 30)
        }
    }, [isOpen, initial])

    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const set = <K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) =>
        setValues((prev) => ({ ...prev, [key]: value }))

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(values)
    }

    const labelCls = "text-[10px] uppercase text-zinc-500 font-bold tracking-wider"
    const inputCls = "w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-colors placeholder:text-zinc-600"

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-form-title"
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
            <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-2xl p-8 shadow-2xl relative animate-fade-in">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fermer"
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                <h2 id="client-form-title" className="text-xl font-bold text-white">
                    {mode === 'create' ? "Nouveau contact" : "Modifier le contact"}
                </h2>
                <p className="text-zinc-500 text-sm mb-4">
                    {mode === 'create' ? "Ajoutez une nouvelle entreprise à votre carnet d'adresses." : `Mettez à jour les informations de ${initial?.name || ''}`}
                </p>

                {/* Type selector */}
                <div className="flex gap-2 mb-6">
                    {(["client", "supplier", "both"] as ("client" | "supplier" | "both")[]).map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => set("type", t)}
                            className={"flex-1 py-2 rounded-xl text-xs font-bold transition-all border " + (values.type === t ? "bg-primary/10 border-primary/40 text-primary" : "bg-white/[0.03] border-white/[0.06] text-zinc-500 hover:text-zinc-300")}
                        >
                            {t === "client" ? "Client" : t === "supplier" ? "Fournisseur" : "Les deux"}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {values.id && <input type="hidden" name="id" value={values.id} />}

                    <div>
                        <label className={labelCls}>
                            Nom de l'entreprise <span className="text-red-400">*</span>
                        </label>
                        <input
                            ref={firstFieldRef}
                            required
                            type="text"
                            value={values.name}
                            onChange={(e) => set('name', e.target.value)}
                            className={inputCls}
                            placeholder="Ex: Atlas Construction SARL"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Email</label>
                            <input
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                value={values.email}
                                onChange={(e) => set('email', e.target.value)}
                                className={inputCls}
                                placeholder="contact@…"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Téléphone</label>
                            <input
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                value={values.phone}
                                onChange={(e) => set('phone', e.target.value)}
                                className={inputCls}
                                placeholder="+212 6…"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Ville</label>
                            <input
                                type="text"
                                autoComplete="address-level2"
                                value={values.city}
                                onChange={(e) => set('city', e.target.value)}
                                className={inputCls}
                                placeholder="Ex: Casablanca"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>ICE</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={values.ice}
                                onChange={(e) => set('ice', e.target.value)}
                                className={inputCls}
                                placeholder="15 chiffres"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>IF (Identifiant Fiscal)</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={values.if ?? ''}
                                onChange={(e) => set('if', e.target.value)}
                                className={inputCls}
                                placeholder="Optionnel"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Pays</label>
                            <select
                                value={values.country_code ?? 'MA'}
                                onChange={(e) => set('country_code', e.target.value)}
                                className={inputCls}
                            >
                                <option value="MA">Maroc (MA)</option>
                                <option value="FR">France (FR)</option>
                                <option value="ES">Espagne (ES)</option>
                                <option value="DE">Allemagne (DE)</option>
                                <option value="GB">Royaume-Uni (GB)</option>
                                <option value="US">États-Unis (US)</option>
                                <option value="CA">Canada (CA)</option>
                                <option value="OTHER">Autre</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Adresse</label>
                        <textarea
                            value={values.address}
                            onChange={(e) => set('address', e.target.value)}
                            rows={2}
                            autoComplete="street-address"
                            className={`${inputCls} resize-none`}
                            placeholder="Rue, quartier…"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-brand-gradient text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-glow-sm hover:shadow-glow disabled:opacity-60 transition-all flex items-center gap-2"
                        >
                            {submitting ? 'Enregistrement…' : mode === 'create' ? 'Créer le client' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
