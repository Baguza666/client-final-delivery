'use client'

import React, { useState } from 'react'
import { updateWorkspace } from '@/app/actions/workspace'
import { useRouter } from 'next/navigation'

export default function SettingsForm({ workspace }: { workspace: any }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Standard input style to keep code clean
    const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
    const labelClass = "block text-xs font-bold uppercase text-zinc-500 mb-1"

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        const result = await updateWorkspace(formData)

        if (result?.success) {
            // ✅ CRITICAL: This pulls the new data from the server immediately
            router.refresh()
            alert("Paramètres enregistrés avec succès !")
        } else {
            alert("Erreur lors de l'enregistrement.")
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-zinc-950/50 p-6 rounded-xl border border-zinc-900">

            {/* 1. Identity */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4 border-b border-zinc-800 pb-2">Identité Entreprise</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClass}>Nom de l'entreprise</label><input name="name" defaultValue={workspace?.name} className={inputClass} placeholder="IMSAL SERVICES" /></div>
                    <div><label className={labelClass}>Email Contact</label><input name="email" defaultValue={workspace?.email} className={inputClass} /></div>
                    <div><label className={labelClass}>Téléphone</label><input name="phone" defaultValue={workspace?.phone} className={inputClass} /></div>
                    <div><label className={labelClass}>Site Web</label><input name="website" defaultValue={workspace?.website} className={inputClass} placeholder="imsalservices.ma" /></div>
                </div>
            </div>

            {/* 2. Address */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4 border-b border-zinc-800 pb-2">Adresse</h3>
                <div className="space-y-4">
                    <div><label className={labelClass}>Adresse complète</label><input name="address" defaultValue={workspace?.address} className={inputClass} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Ville</label><input name="city" defaultValue={workspace?.city} className={inputClass} /></div>
                        <div><label className={labelClass}>Pays</label><input name="country" defaultValue={workspace?.country} className={inputClass} /></div>
                    </div>
                </div>
            </div>

            {/* 3. Legal Info (ICE, RC, etc.) */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4 border-b border-zinc-800 pb-2">Informations Légales (Pied de page)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div><label className={labelClass}>ICE</label><input name="ice" defaultValue={workspace?.ice} className={inputClass} /></div>
                    <div><label className={labelClass}>RC</label><input name="rc" defaultValue={workspace?.rc} className={inputClass} /></div>
                    <div><label className={labelClass}>I.F. (Tax ID)</label><input name="tax_id" defaultValue={workspace?.tax_id} className={inputClass} /></div>
                    <div><label className={labelClass}>CNSS</label><input name="cnss" defaultValue={workspace?.cnss} className={inputClass} /></div>
                    <div><label className={labelClass}>Patente (TP)</label><input name="tp" defaultValue={workspace?.tp} className={inputClass} /></div>
                </div>
            </div>

            {/* 4. Bank Info */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4 border-b border-zinc-800 pb-2">Coordonnées Bancaires</h3>
                <div className="grid grid-cols-1 gap-4">
                    <div><label className={labelClass}>Nom de la Banque</label><input name="bank_name" defaultValue={workspace?.bank_name} className={inputClass} placeholder="BANK OF AFRICA" /></div>
                    <div><label className={labelClass}>RIB (24 chiffres)</label><input name="rib" defaultValue={workspace?.rib} className={inputClass} placeholder="011................" /></div>
                </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex justify-end">
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
            </div>
        </form>
    )
}