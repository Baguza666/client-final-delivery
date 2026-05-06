'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteExpense } from '@/app/actions/financeActions'
import { createClient } from '@/utils/supabase/client'
import { formatMAD, formatDate } from '@/utils/format'
import AddExpenseModal from '@/components/expenses/AddExpenseModal'
import DebtRepaymentModal from '@/components/expenses/DebtRepaymentModal'
import EmptyState from '@/components/ui/EmptyState'

interface Expense {
    id: string
    description: string
    amount: number
    category: string
    date: string
    proof_url?: string | null
}

interface Debt {
    id: string
    name?: string
    description?: string
    total_amount: number
    remaining_amount: number
    due_date: string
}

interface Props {
    initialDebts: Debt[]
    initialExpenses: Expense[]
    workspaceId: string | null
}

const CATEGORY_COLORS: Record<string, string> = {
    'Dette':        'bg-rose-500/10 text-rose-400',
    'Matériel':     'bg-primary/10 text-primary',
    "Main d'oeuvre":'bg-amber-500/10 text-amber-400',
    'Transport':    'bg-cyan-500/10 text-cyan-400',
    'Bureau':       'bg-violet-500/10 text-violet-400',
    'Marketing':    'bg-pink-500/10 text-pink-400',
}

function categoryClass(cat: string) {
    return CATEGORY_COLORS[cat] ?? 'bg-zinc-800 text-zinc-400'
}

function ReceiptPreviewModal({ signedUrl, path, onClose }: { signedUrl: string; path: string; onClose: () => void }) {
    // Derive type from the stored path, not the signed URL (which has opaque query params)
    const ext = path.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
    const isPdf = ext === 'pdf'
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'].includes(ext)
    const [imgError, setImgError] = useState(false)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-slate-950 border border-slate-800 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] w-full max-w-2xl flex flex-col overflow-hidden"
                style={{ maxHeight: '90vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">receipt</span>
                        Aperçu du reçu
                    </p>
                    <div className="flex items-center gap-4">
                        <a
                            href={signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            Ouvrir
                        </a>
                        <a
                            href={signedUrl}
                            download
                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[14px]">download</span>
                            Télécharger
                        </a>
                        <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-6 min-h-0">
                    {isImage && !imgError ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={signedUrl}
                            alt="Reçu"
                            className="max-w-full max-h-[70vh] object-contain rounded-lg"
                            onError={() => setImgError(true)}
                        />
                    ) : isPdf ? (
                        <iframe
                            src={signedUrl}
                            title="Reçu PDF"
                            className="w-full rounded-lg border border-slate-800 bg-white"
                            style={{ height: '70vh' }}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-5 text-center py-10">
                            <span className="material-symbols-outlined text-slate-600 text-[64px]">description</span>
                            <p className="text-slate-400 text-sm">Aperçu non disponible pour ce type de fichier.</p>
                            <a
                                href={signedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                Ouvrir le fichier
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function ExpensesClient({ initialDebts, initialExpenses, workspaceId }: Props) {
    const router = useRouter()

    const [addOpen, setAddOpen] = useState(false)
    const [debtModal, setDebtModal] = useState<Debt | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [previewData, setPreviewData] = useState<{ signedUrl: string; path: string } | null>(null)
    const [previewError, setPreviewError] = useState<string | null>(null)
    const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null)

    const handlePreview = async (expense: Expense) => {
        if (!expense.proof_url) return
        setLoadingPreviewId(expense.id)
        setPreviewError(null)
        const rawPath = expense.proof_url

        // Legacy records stored the full public URL — extract filename for type detection
        if (rawPath.startsWith('http')) {
            try {
                const segments = new URL(rawPath).pathname.split('/')
                const filename = segments[segments.length - 1]
                setPreviewData({ signedUrl: rawPath, path: filename })
            } catch {
                setPreviewData({ signedUrl: rawPath, path: rawPath })
            }
            setLoadingPreviewId(null)
            return
        }

        const supabase = createClient()
        const { data, error } = await supabase.storage.from('receipts').createSignedUrl(rawPath, 300)
        setLoadingPreviewId(null)
        if (error || !data?.signedUrl) {
            setPreviewError(
                error?.message?.includes('Bucket not found')
                    ? "Bucket 'receipts' introuvable. Créez-le dans le dashboard Supabase (Storage → New Bucket → \"receipts\")."
                    : `Impossible de charger le reçu: ${error?.message ?? 'Erreur inconnue'}`
            )
            return
        }
        setPreviewData({ signedUrl: data.signedUrl, path: rawPath })
    }

    // --- Search + filter state ---
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState<string | null>(null)

    const activeDebts = initialDebts.filter(d => d.remaining_amount > 0)

    // Derive unique categories from the data for filter chips
    const categories = Array.from(new Set(initialExpenses.map(e => e.category).filter(Boolean)))

    const filtered = initialExpenses.filter(exp => {
        const matchSearch = !search || exp.description.toLowerCase().includes(search.toLowerCase())
        const matchCat = !activeCategory || exp.category === activeCategory
        return matchSearch && matchCat
    })

    const handleDelete = async (id: string) => {
        setDeletingId(id)
        await deleteExpense(id)
        setDeletingId(null)
        router.refresh()
    }

    return (
        <div className="space-y-10">
            {/* MODALS */}
            {previewData && (
                <ReceiptPreviewModal
                    signedUrl={previewData.signedUrl}
                    path={previewData.path}
                    onClose={() => setPreviewData(null)}
                />
            )}
            {previewError && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-full px-4">
                    <div className="bg-rose-950 border border-rose-500/40 text-rose-300 text-xs rounded-xl px-4 py-3 flex items-start gap-3 shadow-xl">
                        <span className="material-symbols-outlined text-rose-400 text-[18px] shrink-0 mt-0.5">error</span>
                        <span className="flex-1">{previewError}</span>
                        <button onClick={() => setPreviewError(null)} className="text-rose-500 hover:text-rose-300 shrink-0">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    </div>
                </div>
            )}
            <AddExpenseModal isOpen={addOpen} onClose={() => setAddOpen(false)} workspaceId={workspaceId} />
            {debtModal && (
                <DebtRepaymentModal
                    debt={debtModal}
                    isOpen={!!debtModal}
                    onClose={() => setDebtModal(null)}
                />
            )}

            {/* HEADER */}
            <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">
                        Gestion Financière
                    </p>
                    <h1 className="text-2xl md:text-3xl font-[800] tracking-tight text-white">
                        Dépenses & Dettes
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        Suivi de la trésorerie et des remboursements.
                    </p>
                </div>
                <button
                    onClick={() => setAddOpen(true)}
                    className="flex items-center gap-2 bg-brand-gradient text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-glow-sm hover:shadow-glow text-sm shrink-0"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Nouvelle Dépense
                </button>
            </header>

            {/* ACTIVE DEBTS */}
            {activeDebts.length > 0 && (
                <section>
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-rose-400">account_balance</span>
                        Dettes en cours
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeDebts.map((debt) => {
                            const paidPct = Math.min(
                                100,
                                ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100
                            )
                            return (
                                <div
                                    key={debt.id}
                                    className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6 hover:border-zinc-700 transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-5">
                                        <div>
                                            <h3 className="font-bold text-white">{debt.name || 'Dette'}</h3>
                                            <p className="text-xs text-zinc-500 mt-0.5">
                                                Échéance: {formatDate(debt.due_date)}
                                            </p>
                                        </div>
                                        <span className="bg-rose-500/10 text-rose-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                                            En cours
                                        </span>
                                    </div>

                                    <div className="mb-5">
                                        <div className="flex items-end justify-between mb-2">
                                            <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Restant</span>
                                            <span className="text-xl font-mono font-bold text-white group-hover:text-primary transition-colors">
                                                {formatMAD(debt.remaining_amount)}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                                                style={{ width: `${paidPct.toFixed(1)}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-zinc-600 mt-1.5">
                                            {paidPct.toFixed(0)}% remboursé sur {formatMAD(debt.total_amount)}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setDebtModal(debt)}
                                        className="w-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all border border-white/5 flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">payments</span>
                                        Payer une échéance
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* EXPENSES HISTORY */}
            <section>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        Historique des dépenses
                        {filtered.length !== initialExpenses.length && (
                            <span className="text-primary">{filtered.length} / {initialExpenses.length}</span>
                        )}
                    </h2>

                    {/* Search */}
                    <div className="relative w-full md:w-64">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[18px]">
                            search
                        </span>
                        <input
                            type="text"
                            placeholder="Rechercher…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-white/[0.025] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Category filter chips */}
                {categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={() => setActiveCategory(null)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                                !activeCategory
                                    ? 'bg-primary/10 border-primary/40 text-primary'
                                    : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                            }`}
                        >
                            Tout
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                                    activeCategory === cat
                                        ? `${categoryClass(cat)} border-current/30`
                                        : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {filtered.length === 0 ? (
                    initialExpenses.length === 0 ? (
                        <EmptyState
                            icon="receipt_long"
                            title="Aucune dépense"
                            description="Ajoutez votre première dépense pour commencer le suivi."
                        />
                    ) : (
                        <EmptyState
                            icon="search_off"
                            title="Aucun résultat"
                            description="Aucune dépense ne correspond à votre recherche."
                        />
                    )
                ) : (
                    <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl overflow-hidden overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[560px]">
                            <thead>
                                <tr className="border-b border-zinc-800/80 bg-black/30 text-zinc-500 uppercase tracking-wider text-[10px]">
                                    <th className="px-6 py-4 font-bold">Date</th>
                                    <th className="px-6 py-4 font-bold">Description</th>
                                    <th className="px-6 py-4 font-bold">Catégorie</th>
                                    <th className="px-6 py-4 font-bold">Preuve</th>
                                    <th className="px-6 py-4 font-bold text-right">Montant</th>
                                    <th className="px-6 py-4" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {filtered.map((expense) => (
                                    <tr
                                        key={expense.id}
                                        className="group hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-6 py-4 text-zinc-500 text-xs font-mono whitespace-nowrap">
                                            {formatDate(expense.date)}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-white">
                                            {expense.description}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase ${categoryClass(expense.category)}`}>
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {expense.proof_url ? (
                                                <button
                                                    onClick={() => handlePreview(expense)}
                                                    disabled={loadingPreviewId === expense.id}
                                                    className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-semibold transition-colors disabled:opacity-50"
                                                >
                                                    {loadingPreviewId === expense.id ? (
                                                        <span className="w-3.5 h-3.5 border border-primary border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                    )}
                                                    Voir
                                                </button>
                                            ) : (
                                                <span className="text-zinc-700 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-white font-bold whitespace-nowrap">
                                            −{formatMAD(expense.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(expense.id)}
                                                disabled={deletingId === expense.id}
                                                aria-label="Supprimer"
                                                className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
                                            >
                                                {deletingId === expense.id
                                                    ? <span className="w-3.5 h-3.5 border border-zinc-500 border-t-transparent rounded-full animate-spin inline-block" />
                                                    : <span className="material-symbols-outlined text-[16px]">delete</span>
                                                }
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}
