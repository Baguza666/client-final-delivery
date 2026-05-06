'use client'

import { useState } from 'react'
import { createProduct, updateProduct, deleteProduct } from '@/app/actions/products'
import ConfirmationModal from '@/components/ui/ConfirmationModal'

interface Product {
    id: string
    name: string
    description?: string | null
    price: number
    unit: string
    base_currency?: string | null
}

const UNITS = ['Unité', 'Heure', 'Jour', 'm²', 'Forfait']
const CURRENCIES = ['MAD', 'EUR', 'USD', 'GBP', 'AED']

const fieldClass = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary/40 focus:border-primary/60 outline-none transition-all placeholder:text-zinc-600'
const labelClass = 'block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 tracking-wider'

type ModalMode = 'create' | 'edit'

export default function ProductManager({ products, workspaceId }: { products: Product[]; workspaceId: string }) {
    const [modalMode, setModalMode] = useState<ModalMode>('create')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [formCurrency, setFormCurrency] = useState('MAD')

    const openCreate = () => {
        setModalMode('create')
        setEditingProduct(null)
        setFormError(null)
        setFormCurrency('MAD')
        setIsModalOpen(true)
    }

    const openEdit = (product: Product) => {
        setModalMode('edit')
        setEditingProduct(product)
        setFormError(null)
        setFormCurrency(product.base_currency || 'MAD')
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setFormError(null)
        const fd = new FormData(e.currentTarget)
        const result = modalMode === 'edit' && editingProduct
            ? await updateProduct(editingProduct.id, fd)
            : await createProduct(fd)
        setLoading(false)
        if (!result.success) {
            setFormError(result.message || 'Une erreur est survenue.')
            return
        }
        setIsModalOpen(false)
        setEditingProduct(null)
    }

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        setDeleteError(null)
        const result = await deleteProduct(deleteTarget.id)
        if (!result.success) {
            setDeleteError(result.message || 'Erreur lors de la suppression.')
            return
        }
        setDeleteTarget(null)
    }

    return (
        <>
            <div className="flex justify-end mb-6">
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-brand-gradient text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-glow-sm hover:shadow-glow text-sm"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Ajouter service / produit
                </button>
            </div>

            <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-zinc-800/80 bg-black/30 text-zinc-500 uppercase tracking-wider text-[10px]">
                            <th className="py-4 px-6 font-bold">Nom</th>
                            <th className="py-4 px-6 font-bold hidden md:table-cell">Description</th>
                            <th className="py-4 px-6 font-bold">Unité</th>
                            <th className="py-4 px-6 font-bold text-right">Prix unitaire</th>
                            <th className="py-4 px-6 w-20" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {products.map(product => (
                            <tr key={product.id} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="py-4 px-6 font-bold text-white">{product.name}</td>
                                <td className="py-4 px-6 text-zinc-500 hidden md:table-cell">{product.description || '—'}</td>
                                <td className="py-4 px-6">
                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded">
                                        {product.unit}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-right font-mono font-bold text-white">
                                    {Number(product.price).toFixed(2)}{' '}
                                    <span className="text-zinc-500 font-normal text-xs">{product.base_currency || 'MAD'}</span>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEdit(product)}
                                            className="p-1.5 rounded-lg text-zinc-600 hover:text-primary hover:bg-primary/10 transition-colors"
                                            title="Modifier"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(product)}
                                            className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                            title="Supprimer"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {products.length === 0 && (
                    <div className="py-16 text-center">
                        <span className="material-symbols-outlined text-zinc-700 text-[48px] mb-3 block">inventory_2</span>
                        <p className="text-zinc-500 text-sm font-medium">Aucun produit ou service défini.</p>
                        <p className="text-zinc-700 text-xs mt-1">Ajoutez votre premier article pour l'utiliser dans vos documents.</p>
                    </div>
                )}
            </div>

            {/* Create / Edit modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[20px]">
                                    {modalMode === 'edit' ? 'edit' : 'add_circle'}
                                </span>
                                {modalMode === 'edit' ? 'Modifier le produit' : 'Nouveau service / produit'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 text-zinc-500 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <input type="hidden" name="workspace_id" value={workspaceId} />

                            <div>
                                <label className={labelClass}>Nom <span className="text-rose-400">*</span></label>
                                <input
                                    name="name"
                                    required
                                    autoFocus
                                    defaultValue={editingProduct?.name ?? ''}
                                    placeholder="Ex: Peinture m², Consultation…"
                                    className={fieldClass}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        Prix ({formCurrency}) <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        name="price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        defaultValue={editingProduct?.price ?? ''}
                                        placeholder="0.00"
                                        className={fieldClass + ' font-mono'}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Devise de base</label>
                                    <select
                                        name="base_currency"
                                        value={formCurrency}
                                        onChange={e => setFormCurrency(e.target.value)}
                                        className={fieldClass + ' appearance-none cursor-pointer'}
                                    >
                                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Unité</label>
                                <select
                                    name="unit"
                                    defaultValue={editingProduct?.unit ?? 'Unité'}
                                    className={fieldClass + ' appearance-none cursor-pointer'}
                                >
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>Description (optionnel)</label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    defaultValue={editingProduct?.description ?? ''}
                                    placeholder="Description courte…"
                                    className={fieldClass + ' resize-none'}
                                />
                            </div>

                            {formError && (
                                <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                                    {formError}
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                            >
                                {loading ? (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">save</span>
                                        {modalMode === 'edit' ? 'Mettre à jour' : 'Ajouter'}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirmation */}
            <ConfirmationModal
                isOpen={!!deleteTarget}
                onCancel={() => { setDeleteTarget(null); setDeleteError(null) }}
                onConfirm={handleConfirmDelete}
                title="Supprimer ce produit ?"
                message={deleteError
                    ? `Impossible de supprimer : ${deleteError}`
                    : `"${deleteTarget?.name}" sera définitivement supprimé du catalogue.`}
                confirmLabel="Supprimer"
                danger
            />
        </>
    )
}
