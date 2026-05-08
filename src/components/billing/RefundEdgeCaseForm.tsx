'use client'

import { useState } from 'react'
import { requestRefundEdgeCase } from '@/app/actions/billing'

const REASONS = [
    { value: 'force_majeure',     label: 'Force majeure' },
    { value: 'business_closure',  label: 'Cessation d\'activité' },
    { value: 'death',             label: 'Décès' },
    { value: 'service_outage',    label: 'Panne de service prolongée' },
    { value: 'misrepresentation', label: 'Fonctionnalité non conforme' },
    { value: 'other',             label: 'Autre' },
] as const

export default function RefundEdgeCaseForm() {
    const [pending, setPending] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setPending(true)
        setError(null)
        const formData = new FormData(e.currentTarget)
        const reason = String(formData.get('reason') ?? '')
        const explanation = String(formData.get('explanation') ?? '').trim()
        const evidenceUrl = String(formData.get('evidence_url') ?? '').trim() || null
        if (!explanation || explanation.length < 30) {
            setPending(false)
            setError('Merci de fournir une explication détaillée (30 caractères minimum).')
            return
        }

        const res = await requestRefundEdgeCase({ reason, explanation, evidenceUrl })
        setPending(false)
        if (res && 'error' in res && res.error) {
            setError(res.error)
            return
        }
        setSuccess(true)
    }

    if (success) {
        return (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <p className="text-2xl mb-2">✓</p>
                <p className="font-semibold text-emerald-200">Demande envoyée</p>
                <p className="text-sm text-emerald-200/70 mt-2">
                    Nous vous contactons sous 24h via email ou WhatsApp.
                </p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <fieldset className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
                <legend className="px-2 text-xs font-bold uppercase tracking-widest text-white/50">
                    Justificatif
                </legend>

                <label className="block text-xs font-medium text-white/60">Type de demande</label>
                <select
                    name="reason"
                    required
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
                >
                    {REASONS.map((r) => (
                        <option key={r.value} value={r.value} className="bg-black">
                            {r.label}
                        </option>
                    ))}
                </select>

                <label className="block text-xs font-medium text-white/60 mt-3">Explication détaillée</label>
                <textarea
                    name="explanation"
                    rows={5}
                    required
                    minLength={30}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-primary resize-none"
                    placeholder="Décrivez la situation, les dates clés, et le montant que vous souhaitez voir remboursé."
                />

                <label className="block text-xs font-medium text-white/60 mt-3">
                    Lien vers un justificatif (optionnel)
                </label>
                <input
                    name="evidence_url"
                    type="url"
                    placeholder="https://drive.google.com/…"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
                />
                <p className="text-[11px] text-white/40">
                    Téléchargez votre justificatif (acte de décès, attestation de cessation, capture d&apos;écran de
                    panne, etc.) sur un service de partage et collez le lien ici.
                </p>
            </fieldset>

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-primary hover:bg-primary/90 text-black px-5 py-3 font-semibold transition disabled:opacity-50"
            >
                {pending ? 'Envoi…' : 'Envoyer la demande'}
            </button>
        </form>
    )
}
