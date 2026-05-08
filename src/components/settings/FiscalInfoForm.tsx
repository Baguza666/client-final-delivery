'use client'

import { useState } from 'react'
import { saveFiscalInfo } from '@/app/actions/settings'

const TAX_REGIMES = [
    { value: 'auto_entrepreneur', label: 'Auto-entrepreneur' },
    { value: 'cpu',               label: 'CPU (Contribution Professionnelle Unique)' },
    { value: 'rns',               label: 'RNS (Résultat Net Simplifié)' },
    { value: 'rnr',               label: 'RNR (Résultat Net Réel)' },
    { value: 'forfait',           label: 'Forfait' },
    { value: 'none',              label: 'Aucun (particulier)' },
] as const

interface InitialFiscal {
    name?: string | null
    ice?: string | null
    tax_id?: string | null
    rc?: string | null
    cnss?: string | null
    tp?: string | null
    tax_regime?: string | null
    bank_name?: string | null
    rib?: string | null
    address?: string | null
    city?: string | null
    country?: string | null
    phone?: string | null
    email?: string | null
}

export default function FiscalInfoForm({ initial }: { initial: InitialFiscal | null }) {
    const [pending, setPending] = useState(false)
    const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
    const [iceError, setIceError] = useState<string | null>(null)
    const [ifError, setIfError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setMessage(null)
        const formData = new FormData(e.currentTarget)
        const ice = String(formData.get('ice') ?? '').trim()
        const taxId = String(formData.get('tax_id') ?? '').trim()
        let valid = true
        if (ice && !/^\d{15}$/.test(ice)) {
            setIceError('L\'ICE doit contenir exactement 15 chiffres.')
            valid = false
        } else {
            setIceError(null)
        }
        if (taxId && !/^\d+$/.test(taxId)) {
            setIfError('L\'IF doit contenir uniquement des chiffres.')
            valid = false
        } else {
            setIfError(null)
        }
        if (!valid) return

        setPending(true)
        const res = await saveFiscalInfo(formData)
        setPending(false)
        if ('error' in res && res.error) {
            setMessage({ type: 'err', text: res.error })
        } else {
            setMessage({ type: 'ok', text: 'Informations fiscales enregistrées.' })
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Section title="Identité de l'entreprise">
                <Field name="name" label="Raison sociale" defaultValue={initial?.name} required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field name="email" label="Email" type="email" defaultValue={initial?.email} />
                    <Field name="phone" label="Téléphone" defaultValue={initial?.phone} />
                </div>
                <Field name="address" label="Adresse" defaultValue={initial?.address} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field name="city" label="Ville" defaultValue={initial?.city} />
                    <Field name="country" label="Pays" defaultValue={initial?.country ?? 'Maroc'} />
                </div>
            </Section>

            <Section title="Identifiants fiscaux">
                <Field
                    name="ice"
                    label="ICE (15 chiffres)"
                    defaultValue={initial?.ice}
                    pattern="\d{15}"
                    title="15 chiffres"
                    error={iceError}
                />
                <Field
                    name="tax_id"
                    label="IF (Identifiant Fiscal)"
                    defaultValue={initial?.tax_id}
                    pattern="\d+"
                    title="Chiffres uniquement"
                    error={ifError}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field name="rc" label="RC (Registre de Commerce)" defaultValue={initial?.rc} />
                    <Field name="cnss" label="CNSS" defaultValue={initial?.cnss} />
                </div>
                <Field name="tp" label="Taxe Professionnelle (TP)" defaultValue={initial?.tp} />

                <label className="block text-xs font-medium text-white/60 mt-3 mb-1">Régime fiscal</label>
                <select
                    name="tax_regime"
                    defaultValue={initial?.tax_regime ?? 'auto_entrepreneur'}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
                >
                    {TAX_REGIMES.map((r) => (
                        <option key={r.value} value={r.value} className="bg-black">
                            {r.label}
                        </option>
                    ))}
                </select>
            </Section>

            <Section title="Coordonnées bancaires (optionnel)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field name="bank_name" label="Banque" defaultValue={initial?.bank_name} />
                    <Field name="rib" label="RIB" defaultValue={initial?.rib} />
                </div>
            </Section>

            <div className="flex items-center gap-3">
                <button
                    type="submit"
                    disabled={pending}
                    className="rounded-xl bg-primary hover:bg-primary/90 text-black px-5 py-3 font-semibold transition disabled:opacity-50"
                >
                    {pending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                {message && (
                    <p className={`text-sm ${message.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {message.text}
                    </p>
                )}
            </div>
        </form>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <fieldset className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <legend className="px-2 text-xs font-bold uppercase tracking-widest text-white/50">{title}</legend>
            {children}
        </fieldset>
    )
}

interface FieldProps {
    name: string
    label: string
    type?: string
    defaultValue?: string | null
    required?: boolean
    pattern?: string
    title?: string
    error?: string | null
}

function Field({ name, label, type = 'text', defaultValue, required, pattern, title, error }: FieldProps) {
    return (
        <div>
            <label htmlFor={name} className="block text-xs font-medium text-white/60 mb-1">
                {label}{required && <span className="text-rose-400 ml-1">*</span>}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                defaultValue={defaultValue ?? ''}
                required={required}
                pattern={pattern}
                title={title}
                className={`w-full rounded-xl bg-white/5 border px-3 py-2.5 text-sm text-white outline-none transition ${
                    error ? 'border-rose-500/60' : 'border-white/10 focus:border-primary'
                }`}
            />
            {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
        </div>
    )
}
