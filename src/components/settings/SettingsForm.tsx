'use client'

import React, { useState } from 'react'
import { updateWorkspace } from '@/app/actions/workspace'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function SettingsForm({ workspace }: { workspace: any }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState(workspace?.logo_url || '')

    const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-zinc-700"
    const labelClass = "block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-wider"

    // ✅ HARDCODED DEFAULTS FROM YOUR PDF
    const defaults = {
        name: "IMSAL SERVICES",
        address: "7 Lotis Najmat El Janoub",
        city: "El Jadida",
        country: "Maroc",
        phone: "+212(0)6 61 43 52 83",
        email: "i.assal@imsalservices.com",
        website: "Imsalservices.ma",
        ice: "002972127000089",
        rc: "19215",
        tax_id: "000081196000005", // I.F.
        cnss: "5249290",
        tp: "43003134",
        bank_name: "BANK OF AFRICA",
        rib: "011170000008210000137110"
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) setPreview(URL.createObjectURL(file))
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        const result = await updateWorkspace(new FormData(event.currentTarget))
        if (result?.success) {
            router.refresh()
            alert("✅ Paramètres enregistrés !")
        } else {
            alert("❌ " + result?.error)
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-zinc-950 p-8 rounded-xl border border-zinc-900 max-w-5xl">

            {/* 1. Logo Section */}
            <div className="flex items-center gap-8 pb-6 border-b border-zinc-900">
                <div className="relative w-32 h-32 bg-zinc-900 rounded-lg border-2 border-dashed border-zinc-800 flex items-center justify-center overflow-hidden">
                    {preview ? (
                        <Image src={preview} alt="Logo preview" fill className="object-contain" unoptimized />
                    ) : (
                        <span className="text-zinc-600 text-xs text-center p-2">Aucun Logo</span>
                    )}
                </div>
                <div className="flex-1">
                    <label className={labelClass}>Logo de l'entreprise</label>
                    <input type="file" name="logo" accept="image/*" onChange={handleLogoChange} className="text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer" />
                </div>
            </div>

            {/* 2. Identity (Header Info) */}
            <div>
                <h3 className="text-white font-bold mb-4">Identité</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className={labelClass}>Nom de l'entreprise</label><input name="name" defaultValue={workspace?.name || defaults.name} className={inputClass} /></div>
                    <div><label className={labelClass}>Adresse Complète</label><input name="address" defaultValue={workspace?.address || defaults.address} className={inputClass} /></div>

                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Ville</label><input name="city" defaultValue={workspace?.city || defaults.city} className={inputClass} /></div>
                        <div><label className={labelClass}>Pays</label><input name="country" defaultValue={workspace?.country || defaults.country} className={inputClass} /></div>
                    </div>

                    <div><label className={labelClass}>Téléphone</label><input name="phone" defaultValue={workspace?.phone || defaults.phone} className={inputClass} /></div>
                    <div><label className={labelClass}>Email</label><input name="email" defaultValue={workspace?.email || defaults.email} className={inputClass} /></div>
                    <div><label className={labelClass}>Site Web</label><input name="website" defaultValue={workspace?.website || defaults.website} className={inputClass} /></div>
                </div>
            </div>

            {/* 3. Legal Info (Footer Info) */}
            <div>
                <h3 className="text-white font-bold mb-4 pt-4 border-t border-zinc-900">Informations Légales (Pied de page)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><label className={labelClass}>ICE</label><input name="ice" defaultValue={workspace?.ice || defaults.ice} className={inputClass} /></div>
                    <div><label className={labelClass}>RC</label><input name="rc" defaultValue={workspace?.rc || defaults.rc} className={inputClass} /></div>
                    <div><label className={labelClass}>I.F. (Identifiant Fiscal)</label><input name="tax_id" defaultValue={workspace?.tax_id || defaults.tax_id} className={inputClass} /></div>
                    <div><label className={labelClass}>CNSS</label><input name="cnss" defaultValue={workspace?.cnss || defaults.cnss} className={inputClass} /></div>
                    <div><label className={labelClass}>T.P. (Patente)</label><input name="tp" defaultValue={workspace?.tp || defaults.tp} className={inputClass} /></div>
                </div>
            </div>

            {/* 4. Bank Info */}
            <div>
                <h3 className="text-white font-bold mb-4 pt-4 border-t border-zinc-900">Banque</h3>
                <div className="grid grid-cols-1 gap-6">
                    <div><label className={labelClass}>Nom de la Banque</label><input name="bank_name" defaultValue={workspace?.bank_name || defaults.bank_name} className={inputClass} /></div>
                    <div><label className={labelClass}>RIB (24 Chiffres)</label><input name="rib" defaultValue={workspace?.rib || defaults.rib} className={inputClass} /></div>
                </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 mt-4">
                {loading ? 'Enregistrement...' : 'Sauvegarder ces informations'}
            </button>
        </form>
    )
}