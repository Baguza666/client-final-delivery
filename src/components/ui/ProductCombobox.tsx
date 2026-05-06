'use client'

import { useState, useRef, useCallback } from 'react'

export interface CatalogProduct {
    id: string
    name: string
    description?: string | null
    price: number
    unit: string
    base_currency?: string | null
}

interface ProductComboboxProps {
    products: CatalogProduct[]
    value: string
    onChange: (value: string) => void
    onSelect: (product: CatalogProduct) => void
    placeholder?: string
    className?: string
}

export default function ProductCombobox({
    products,
    value,
    onChange,
    onSelect,
    placeholder = 'Description…',
    className = '',
}: ProductComboboxProps) {
    const [open, setOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    const inputRef = useRef<HTMLInputElement>(null)

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(value.toLowerCase())
    )

    const handleSelect = useCallback((product: CatalogProduct) => {
        onSelect(product)
        setOpen(false)
        setHighlightedIndex(-1)
    }, [onSelect])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown' && !open && products.length > 0) {
            e.preventDefault()
            setOpen(true)
            setHighlightedIndex(0)
            return
        }
        if (!open) return
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setHighlightedIndex(i => Math.min(i + 1, filtered.length - 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                setHighlightedIndex(i => Math.max(i - 1, 0))
                break
            case 'Enter':
                e.preventDefault()
                if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
                    handleSelect(filtered[highlightedIndex])
                }
                break
            case 'Escape':
                setOpen(false)
                setHighlightedIndex(-1)
                break
        }
    }

    const showDropdown = open && filtered.length > 0

    return (
        <div className="relative w-full">
            <input
                ref={inputRef}
                type="text"
                value={value}
                placeholder={placeholder}
                autoComplete="off"
                className={className}
                onChange={e => {
                    onChange(e.target.value)
                    setHighlightedIndex(-1)
                    if (!open) setOpen(true)
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 120)}
                onKeyDown={handleKeyDown}
            />

            {showDropdown && (
                <div className="absolute left-0 top-full mt-1 z-[200] w-full min-w-[200px] bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden">
                    {products.length > 0 && (
                        <div className="px-3 py-1.5 border-b border-zinc-800 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-zinc-600 text-[14px]">inventory_2</span>
                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Catalogue</span>
                        </div>
                    )}
                    <ul className="max-h-52 overflow-y-auto">
                        {filtered.map((product, idx) => (
                            <li key={product.id}>
                                <button
                                    type="button"
                                    onMouseDown={e => {
                                        e.preventDefault()
                                        handleSelect(product)
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                                        idx === highlightedIndex
                                            ? 'bg-primary/10 text-white'
                                            : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                                    }`}
                                >
                                    <div className="min-w-0 mr-3">
                                        <p className="text-sm font-medium truncate">{product.name}</p>
                                        {product.description && (
                                            <p className="text-[10px] text-zinc-600 truncate mt-0.5">{product.description}</p>
                                        )}
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-xs font-mono font-bold text-primary">
                                            {Number(product.price).toFixed(2)}
                                            <span className="font-normal text-zinc-500 ml-0.5">{product.base_currency || 'MAD'}</span>
                                        </p>
                                        <p className="text-[10px] text-zinc-600">{product.unit}</p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {filtered.length === 0 && value && (
                        <p className="px-3 py-3 text-xs text-zinc-600 text-center">Aucun produit trouvé</p>
                    )}
                </div>
            )}
        </div>
    )
}
