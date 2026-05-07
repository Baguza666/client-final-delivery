'use client'

import React, { useState, useTransition, useEffect, useRef } from 'react'
import { createExpense } from '@/app/actions/financeActions'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

interface AddExpenseModalProps {
    isOpen: boolean
    onClose: () => void
    workspaceId: string | null
}

const CATEGORIES = ['Materiel', "Main d'oeuvre", 'Transport', 'Bureau', 'Marketing', 'Autre']
const PAYMENT_METHODS = ['Especes', 'Cheque', 'Virement', 'Carte Bancaire']

const EMPTY_FORM = {
    description: '',
    amount: '',
    category: 'Materiel',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'Especes',
    frequency: 'Mensuel',
    proof_url: '',
}

// Extract amount from OCR text: handles "1 234,56 Dhs", "1234.56 MAD", "Total: 500", etc.
function parseAmount(text: string): string {
    const patterns = [
        /(?:total|montant|ttc|net\s+a\s+payer|a\s+payer)[^\d]*?([\d\s]+[.,]\d{2})/i,
        /(?:total|montant|ttc)[^\d]*([\d\s]+)/i,
        /([\d\s]+[.,]\d{2})\s*(?:dhs|mad|dirham)/i,
        /([\d]+[.,]\d{2})/,
    ]
    for (const pat of patterns) {
        const m = text.match(pat)
        if (m) {
            const raw = m[1].replace(/\s/g, '').replace(',', '.')
            const n = parseFloat(raw)
            if (!isNaN(n) && n > 0 && n < 1_000_000) return String(n)
        }
    }
    return ''
}

// Extract date: dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd
function parseDate(text: string): string {
    const dmY = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/)
    if (dmY) {
        const [, d, m, y] = dmY
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    const Ymd = text.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/)
    if (Ymd) {
        const [, y, m, d] = Ymd
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    return ''
}

// Extract a merchant/description from first non-empty lines
function parseDescription(text: string): string {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of lines.slice(0, 5)) {
        if (line.length >= 4 && !/^\d/.test(line) && !/^\*/.test(line)) {
            return line.slice(0, 60)
        }
    }
    return ''
}

export default function AddExpenseModal({ isOpen, onClose, workspaceId }: AddExpenseModalProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isRecurring, setIsRecurring] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [scanDone, setScanDone] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [localFile, setLocalFile] = useState<File | null>(null)
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [error, setError] = useState('')
    const fileRef = useRef<HTMLInputElement | null>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [isOpen, onClose])

    // Reset when modal closes
    useEffect(() => {
        if (!isOpen) {
            setPreviewUrl(null)
            setLocalFile(null)
            setScanDone(false)
            setError('')
            setFormData(EMPTY_FORM)
            setIsRecurring(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    const set = (field: string, value: string) =>
        setFormData(prev => ({ ...prev, [field]: value }))

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setLocalFile(file)
        setScanDone(false)
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
        } else {
            setPreviewUrl(null)
        }
    }

    const handleScan = async () => {
        if (!localFile || !localFile.type.startsWith('image/')) return
        setScanning(true)
        setError('')
        try {
            // Dynamic import to avoid SSR issues with tesseract.js
            const Tesseract = (await import('tesseract.js')).default
            const { data: { text } } = await Tesseract.recognize(localFile, 'fra+eng', {
                logger: () => {},
            })
            const amount = parseAmount(text)
            const date = parseDate(text)
            const description = parseDescription(text)
            if (amount) set('amount', amount)
            if (date) set('date', date)
            if (description && !formData.description) set('description', description)
            setScanDone(true)
        } catch {
            setError("Echec de l'analyse OCR. Veuillez remplir manuellement.")
        } finally {
            setScanning(false)
        }
    }

    const handleUpload = async (): Promise<string | null> => {
        if (!localFile) return null
        setUploading(true)
        const ext = localFile.name.split('.').pop()
        const path = `${crypto.randomUUID()}.${ext}`
        try {
            const { error: uploadError } = await supabase.storage.from('receipts').upload(path, localFile)
            if (uploadError) throw uploadError
            set('proof_url', path)
            return path
        } catch {
            setError("Echec de l'upload. Verifiez que le bucket 'receipts' existe.")
            return null
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        let proofUrl = formData.proof_url
        if (localFile && !proofUrl) {
            proofUrl = (await handleUpload()) ?? ''
        }
        startTransition(async () => {
            const res = await createExpense({ ...formData, proof_url: proofUrl, is_recurring: isRecurring })
            if (res?.error) {
                setError(res.error)
                return
            }
            onClose()
            router.refresh()
        })
    }

    const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none transition-all placeholder:text-zinc-600"
    const labelCls = "block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider"

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">add_circle</span>
                        Nouvelle Depense
                    </h3>
                    <button type="button" onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">

                        {/* Receipt scan zone */}
                        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]">document_scanner</span>
                                    Scan du recu (OCR)
                                </span>
                                {uploading && <span className="text-primary text-xs animate-pulse">Upload…</span>}
                                {formData.proof_url && !uploading && (
                                    <span className="text-green-400 text-xs flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">cloud_done</span>
                                        Enregistre
                                    </span>
                                )}
                            </div>

                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleFileChange}
                                className="block w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
                            />

                            {previewUrl && (
                                <div className="relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={previewUrl} alt="Apercu recu" className="w-full max-h-40 object-contain rounded-lg border border-white/[0.06]" />
                                    <button
                                        type="button"
                                        onClick={handleScan}
                                        disabled={scanning}
                                        className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-all shadow-lg"
                                    >
                                        {scanning ? (
                                            <>
                                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Analyse…
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                                                {scanDone ? 'Re-analyser' : 'Analyser'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {scanDone && (
                                <p className="text-xs text-green-400 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                    Champs remplis automatiquement — verifiez et corrigez si besoin.
                                </p>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label className={labelCls}>
                                Description <span className="text-rose-400">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                placeholder="Ex: Achat ciment, Paiement electricite…"
                                className={inputCls}
                                value={formData.description}
                                onChange={e => set('description', e.target.value)}
                            />
                        </div>

                        {/* Amount & Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>
                                    Montant (MAD) <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                    className={inputCls + " font-mono"}
                                    value={formData.amount}
                                    onChange={e => set('amount', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>
                                    Date <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    required
                                    type="date"
                                    className={inputCls}
                                    value={formData.date}
                                    onChange={e => set('date', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Category & Payment method */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Categorie</label>
                                <select
                                    className={inputCls + " appearance-none cursor-pointer"}
                                    value={formData.category}
                                    onChange={e => set('category', e.target.value)}
                                >
                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Paiement</label>
                                <select
                                    className={inputCls + " appearance-none cursor-pointer"}
                                    value={formData.payment_method}
                                    onChange={e => set('payment_method', e.target.value)}
                                >
                                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Recurring toggle */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer select-none">
                                <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={isRecurring}
                                    onClick={() => setIsRecurring(v => !v)}
                                    className={"w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 " + (isRecurring ? 'bg-primary border-primary' : 'border-zinc-600 bg-transparent')}
                                >
                                    {isRecurring && (
                                        <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>
                                    )}
                                </button>
                                Depense recurrente
                            </label>
                            {isRecurring && (
                                <select
                                    className="bg-zinc-800 border border-zinc-700 rounded-lg text-xs px-3 py-1.5 text-white outline-none"
                                    value={formData.frequency}
                                    onChange={e => set('frequency', e.target.value)}
                                >
                                    <option>Hebdomadaire</option>
                                    <option>Mensuel</option>
                                    <option>Annuel</option>
                                </select>
                            )}
                        </div>

                        {error && (
                            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isPending || uploading || scanning}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {isPending ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Enregistrement…
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">save</span>
                                    Enregistrer
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
