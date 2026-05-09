'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface SetupChecklistProps {
    /** Set true if the workspace has at least one of: ICE, IF, RC, CNSS — i.e. user has filled fiscal info. */
    hasFiscalInfo: boolean
    /** Set true if the workspace has at least one client. */
    hasClient: boolean
    /** Set true if the workspace has at least one invoice. */
    hasInvoice: boolean
}

const STORAGE_KEY = 'invoicify_setup_dismissed'

export default function SetupChecklist({ hasFiscalInfo, hasClient, hasInvoice }: SetupChecklistProps) {
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1') {
            setDismissed(true)
        }
    }, [])

    const allDone = hasFiscalInfo && hasClient && hasInvoice
    if (dismissed) return null

    const dismiss = () => {
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, '1')
        setDismissed(true)
    }

    return (
        <aside className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-sm">🚀 Démarrage rapide</h3>
                {allDone && (
                    <button
                        onClick={dismiss}
                        className="text-xs text-white/40 hover:text-white/70"
                    >
                        Masquer
                    </button>
                )}
            </div>

            {allDone ? (
                <p className="text-sm text-emerald-300">
                    ✓ Vous êtes prêt à facturer. Bonne continuation !
                </p>
            ) : (
                <ul className="space-y-2 text-sm">
                    <ChecklistItem
                        done={hasFiscalInfo}
                        href="/settings/billing"
                        label="Complétez les informations de votre entreprise"
                    />
                    <ChecklistItem
                        done={hasClient}
                        href="/clients/new"
                        label="Ajoutez votre premier client"
                    />
                    <ChecklistItem
                        done={hasInvoice}
                        href="/invoices/new"
                        label="Créez votre première facture"
                    />
                </ul>
            )}
        </aside>
    )
}

function ChecklistItem({ done, href, label }: { done: boolean; href: string; label: string }) {
    return (
        <li>
            <Link
                href={href}
                className={`flex items-start gap-3 rounded-lg p-2 -mx-2 transition ${
                    done ? 'opacity-50' : 'hover:bg-white/[0.04]'
                }`}
            >
                <span
                    className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-sm border ${
                        done ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/30'
                    }`}
                >
                    {done && <span className="text-[10px]">✓</span>}
                </span>
                <span className={done ? 'line-through text-white/50' : 'text-white/80'}>{label}</span>
            </Link>
        </li>
    )
}
