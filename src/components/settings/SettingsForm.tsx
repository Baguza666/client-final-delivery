'use client'

import React, { useState } from 'react'
import { updateWorkspace } from '@/app/actions/workspace'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function SettingsForm({ workspace }: { workspace: any }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState(workspace?.logo_url || '')

    const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-600 outline-none"
    const labelClass = "block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-wider"

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
            {/* Logo Section */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className={labelClass}>Nom de l'entreprise</label><input name="name" defaultValue={workspace?.name} required className={inputClass} /></div>
                <div><label className={labelClass}>Email Pro</label><input name="email" defaultValue={workspace?.email} className={inputClass} /></div>
                <div><label className={labelClass}>Adresse Complète</label><input name="address" defaultValue={workspace?.address} className={inputClass} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>Ville</label><input name="city" defaultValue={workspace?.city} className={inputClass} /></div>
                    <div><label className={labelClass}>Pays</label><input name="country" defaultValue={workspace?.country} className={inputClass} /></div>
                </div>
                <div><label className={labelClass}>ICE</label><input name="ice" defaultValue={workspace?.ice} className={inputClass} /></div>
                <div><label className={labelClass}>I.F. (Tax ID)</label><input name="tax_id" defaultValue={workspace?.tax_id} className={inputClass} /></div>
                <div><label className={labelClass}>RIB (Bancaire)</label><input name="rib" defaultValue={workspace?.rib} className={inputClass} /></div>
                <div><label className={labelClass}>Banque</label><input name="bank_name" defaultValue={workspace?.bank_name} className={inputClass} /></div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50">
                {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
        </form>
    )
}