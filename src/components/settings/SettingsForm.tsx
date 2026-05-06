'use client'

import React, { useRef, useState } from 'react'
import { updateSettings } from '@/app/actions/settings'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { type Template, TEMPLATE_META, BRAND_PALETTE, DEFAULT_BRAND_COLOR } from '@/lib/document-templates'

interface Workspace {
    id?: string
    name?: string
    address?: string
    city?: string
    country?: string
    phone?: string
    email?: string
    ice?: string
    rc?: string
    tax_id?: string
    cnss?: string
    tp?: string
    bank_name?: string
    rib?: string
    logo_url?: string
    signature_url?: string
    document_template?: string
    brand_color?: string
}

const inputClass =
    'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none transition-all placeholder:text-zinc-600'
const labelClass =
    'block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-wider'

export default function SettingsForm({ workspace }: { workspace: Workspace }) {
    const router = useRouter()

    const logoInputRef = useRef<HTMLInputElement>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(workspace?.logo_url || null)
    const [logoFileName, setLogoFileName] = useState<string | null>(null)

    const sigInputRef = useRef<HTMLInputElement>(null)
    const [sigPreview, setSigPreview] = useState<string | null>(workspace?.signature_url || null)
    const [sigFileName, setSigFileName] = useState<string | null>(null)

    const [selectedTemplate, setSelectedTemplate] = useState<Template>((workspace.document_template as Template) || 'classic')
    const [selectedColor, setSelectedColor] = useState<string>(workspace.brand_color || DEFAULT_BRAND_COLOR)

    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setLogoPreview(URL.createObjectURL(file))
            setLogoFileName(file.name)
        }
    }

    const handleSigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSigPreview(URL.createObjectURL(file))
            setSigFileName(file.name)
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setStatus('idle')
        try {
            const result = await updateSettings(new FormData(e.currentTarget))
            if (result.success) {
                setStatus('success')
                router.refresh()
            } else {
                setStatus('error')
                setErrorMsg(result.error || 'Erreur inconnue')
            }
        } catch {
            setStatus('error')
            setErrorMsg('Erreur réseau. Vérifiez la taille de vos fichiers et réessayez.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-8 space-y-8">
            {/* Hidden fields */}
            <input type="hidden" name="workspace_id" value={workspace.id ?? ''} />
            <input type="hidden" name="current_logo_url" value={workspace.logo_url ?? ''} />
            <input type="hidden" name="current_signature_url" value={workspace.signature_url ?? ''} />
            <input type="hidden" name="document_template" value={selectedTemplate} />
            <input type="hidden" name="brand_color" value={selectedColor} />

            {/* Logo */}
            <div className="flex items-center gap-6 pb-8 border-b border-white/[0.08]">
                <div className="relative w-28 h-28 bg-zinc-900 rounded-xl border border-dashed border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                    {logoPreview ? (
                        <Image src={logoPreview} alt="Logo" fill className="object-contain p-2" unoptimized />
                    ) : (
                        <div className="flex flex-col items-center gap-1 text-zinc-600">
                            <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                            <span className="text-[10px] uppercase tracking-wider">Aucun logo</span>
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <p className={labelClass}>Logo de l'entreprise</p>
                    <p className="text-xs text-zinc-500 mb-3">PNG, JPG ou SVG — affiché sur vos documents.</p>
                    <input ref={logoInputRef} type="file" name="logo" accept="image/*" onChange={handleLogoChange} className="sr-only" />
                    <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.10] bg-white/[0.04] text-sm text-white/70 hover:bg-white/[0.08] hover:border-primary/40 hover:text-white transition-all"
                    >
                        <span className="material-symbols-outlined text-[16px]">upload</span>
                        Choisir une image
                    </button>
                    {logoFileName && <p className="text-xs text-zinc-500 mt-2 truncate max-w-xs">{logoFileName}</p>}
                </div>
            </div>

            {/* Signature */}
            <div className="flex items-center gap-6 pb-8 border-b border-white/[0.08]">
                <div className="relative w-28 h-28 bg-zinc-900 rounded-xl border border-dashed border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                    {sigPreview ? (
                        <Image src={sigPreview} alt="Signature" fill className="object-contain p-3" unoptimized />
                    ) : (
                        <div className="flex flex-col items-center gap-1 text-zinc-600">
                            <span className="material-symbols-outlined text-3xl">draw</span>
                            <span className="text-[10px] uppercase tracking-wider">Aucune</span>
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <p className={labelClass}>Signature</p>
                    <p className="text-xs text-zinc-500 mb-3">PNG ou JPG — apparaît sur vos factures et devis lorsque la case "Signature" est cochée.</p>
                    <input ref={sigInputRef} type="file" name="signature" accept="image/png,image/jpeg,image/jpg" onChange={handleSigChange} className="sr-only" />
                    <button
                        type="button"
                        onClick={() => sigInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.10] bg-white/[0.04] text-sm text-white/70 hover:bg-white/[0.08] hover:border-primary/40 hover:text-white transition-all"
                    >
                        <span className="material-symbols-outlined text-[16px]">upload</span>
                        Choisir une image
                    </button>
                    {sigFileName && <p className="text-xs text-zinc-500 mt-2 truncate max-w-xs">{sigFileName}</p>}
                </div>
            </div>

            {/* Identité */}
            <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-5">Identité</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className={labelClass}>Nom de l'entreprise</label>
                        <input name="name" defaultValue={workspace.name ?? ''} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Adresse</label>
                        <input name="address" defaultValue={workspace.address ?? ''} className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Ville</label>
                            <input name="city" defaultValue={workspace.city ?? ''} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Pays</label>
                            <input name="country" defaultValue={workspace.country ?? ''} className={inputClass} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Téléphone</label>
                        <input name="phone" type="tel" defaultValue={workspace.phone ?? ''} className={inputClass} />
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelClass}>Email</label>
                        <input name="email" type="email" defaultValue={workspace.email ?? ''} className={inputClass} />
                    </div>
                </div>
            </div>

            {/* Mentions légales */}
            <div className="pt-8 border-t border-white/[0.08]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-5">Mentions légales</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    <div>
                        <label className={labelClass}>ICE</label>
                        <input name="ice" inputMode="numeric" defaultValue={workspace.ice ?? ''} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>RC</label>
                        <input name="rc" defaultValue={workspace.rc ?? ''} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>I.F.</label>
                        <input name="tax_id" defaultValue={workspace.tax_id ?? ''} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>CNSS</label>
                        <input name="cnss" defaultValue={workspace.cnss ?? ''} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>T.P.</label>
                        <input name="tp" defaultValue={workspace.tp ?? ''} className={inputClass} />
                    </div>
                </div>
            </div>

            {/* Banque */}
            <div className="pt-8 border-t border-white/[0.08]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-5">Banque</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className={labelClass}>Nom de la banque</label>
                        <input name="bank_name" defaultValue={workspace.bank_name ?? ''} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>RIB</label>
                        <input name="rib" defaultValue={workspace.rib ?? ''} className={inputClass} />
                    </div>
                </div>
            </div>

            {/* Document Template */}
            <div className="pt-8 border-t border-white/[0.08]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-5">Modèle de Document</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {(Object.keys(TEMPLATE_META) as Template[]).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setSelectedTemplate(t)}
                            className={"relative rounded-xl border-2 p-4 text-center transition-all " + (selectedTemplate === t ? "border-primary bg-primary/10 text-primary" : "border-white/[0.08] bg-white/[0.025] text-zinc-400 hover:border-primary/40 hover:text-white")}
                        >
                            <p className="font-bold text-sm">{TEMPLATE_META[t]}</p>
                            {selectedTemplate === t && (
                                <span className="absolute top-1.5 right-1.5 material-symbols-outlined text-[14px] text-primary">check_circle</span>
                            )}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-zinc-500 mt-3">Ce modèle sera appliqué par défaut à tous vos nouveaux documents.</p>
            </div>

            {/* Brand Color */}
            <div className="pt-8 border-t border-white/[0.08]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1">Couleur de marque</p>
                <p className="text-xs text-zinc-500 mb-5">Appliquée aux en-têtes, totaux et tampons de tous vos documents.</p>
                <div className="flex flex-wrap gap-3">
                    {BRAND_PALETTE.map((swatch) => (
                        <button
                            key={swatch.hex}
                            type="button"
                            title={swatch.name}
                            onClick={() => setSelectedColor(swatch.hex)}
                            className="relative w-9 h-9 rounded-lg transition-all ring-offset-2 ring-offset-zinc-900 focus:outline-none"
                            style={{ backgroundColor: swatch.hex }}
                        >
                            {selectedColor === swatch.hex && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-[18px] drop-shadow">check</span>
                                </span>
                            )}
                            {selectedColor === swatch.hex && (
                                <span className="absolute inset-0 rounded-lg ring-2 ring-white/80 ring-offset-2 ring-offset-zinc-900" />
                            )}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-zinc-600 mt-3 font-mono">{selectedColor}</p>
            </div>

            {/* Feedback */}
            {status === 'success' && (
                <div className="flex items-center gap-2 text-sm text-status-paid bg-status-paid/10 border border-status-paid/20 rounded-lg px-4 py-3">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Paramètres enregistrés avec succès.
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
                        Enregistrer les paramètres
                    </>
                )}
            </button>
        </form>
    )
}
