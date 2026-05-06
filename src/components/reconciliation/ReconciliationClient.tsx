'use client'

import { useRef, useState } from 'react'
import { formatMAD, formatDateShort } from '@/utils/format'

interface BankTx {
    id: string
    date: string
    description: string
    credit: number
    debit: number
}

interface Invoice {
    id: string
    number: string
    clientName: string
    total: number
    date: string
    status: string
}

interface ReconciliationClientProps {
    invoices: Invoice[]
}

// Minimal CSV parser: handles comma and semicolon separators, quoted fields
function parseCsv(text: string): string[][] {
    const rows: string[][] = []
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
    const sep = text.includes(';') ? ';' : ','
    for (const line of lines) {
        if (!line.trim()) continue
        const cells: string[] = []
        let cur = ''
        let inQuote = false
        for (let i = 0; i < line.length; i++) {
            const ch = line[i]
            if (ch === '"') { inQuote = !inQuote; continue }
            if (ch === sep && !inQuote) { cells.push(cur.trim()); cur = ''; continue }
            cur += ch
        }
        cells.push(cur.trim())
        rows.push(cells)
    }
    return rows
}

// Try to detect which column is date/description/credit/debit
function detectColumns(headers: string[]): { date: number; desc: number; credit: number; debit: number } {
    const h = headers.map(h => h.toLowerCase().replace(/[^a-z]/g, ''))
    const find = (...kws: string[]) => h.findIndex(c => kws.some(k => c.includes(k)))
    return {
        date: find('date', 'jour', 'valeur'),
        desc: find('libelle', 'description', 'motif', 'intitule', 'operation', 'detail'),
        credit: find('credit', 'entree', 'revenu', 'avoir'),
        debit: find('debit', 'sortie', 'depense', 'charge'),
    }
}

function scoreMatch(tx: BankTx, inv: Invoice): number {
    let score = 0
    if (Math.abs(tx.credit - inv.total) < 0.02) score += 50
    else if (Math.abs(tx.credit - inv.total) / inv.total < 0.02) score += 30
    const txDate = new Date(tx.date)
    const invDate = new Date(inv.date)
    const diffDays = Math.abs((txDate.getTime() - invDate.getTime()) / 86400000)
    if (diffDays <= 3) score += 20
    else if (diffDays <= 10) score += 10
    else if (diffDays <= 30) score += 5
    if (inv.clientName && tx.description.toLowerCase().includes(inv.clientName.toLowerCase().split(' ')[0])) score += 20
    return score
}

export default function ReconciliationClient({ invoices }: ReconciliationClientProps) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [transactions, setTransactions] = useState<BankTx[]>([])
    const [parseError, setParseError] = useState('')
    const [matches, setMatches] = useState<Record<string, string>>({}) // txId -> invoiceId
    const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
    const [saving, setSaving] = useState<string | null>(null)
    const [saveMsg, setSaveMsg] = useState<Record<string, string>>({})

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setParseError('')
        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const text = ev.target?.result as string
                const rows = parseCsv(text)
                if (rows.length < 2) { setParseError('Fichier vide ou non reconnu.'); return }
                const headers = rows[0]
                const cols = detectColumns(headers)
                if (cols.date === -1 || cols.desc === -1) {
                    setParseError('Colonnes non detectees. Verifiez que le CSV contient les colonnes date, libelle, credit/debit.')
                    return
                }
                const txs: BankTx[] = []
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i]
                    if (!row[cols.date]) continue
                    const rawCredit = cols.credit !== -1 ? row[cols.credit] : ''
                    const rawDebit = cols.debit !== -1 ? row[cols.debit] : ''
                    const credit = parseFloat((rawCredit || '').replace(/[\s,]/g, '.').replace(/[^0-9.]/g, '')) || 0
                    const debit = parseFloat((rawDebit || '').replace(/[\s,]/g, '.').replace(/[^0-9.]/g, '')) || 0
                    txs.push({
                        id: crypto.randomUUID(),
                        date: row[cols.date],
                        description: row[cols.desc] || '',
                        credit,
                        debit,
                    })
                }
                setTransactions(txs)
                // Auto-suggest matches
                const autoMatches: Record<string, string> = {}
                for (const tx of txs) {
                    if (tx.credit <= 0) continue
                    let bestScore = 20 // minimum threshold
                    let bestInvId = ''
                    for (const inv of invoices) {
                        if (inv.status === 'paid') continue
                        const s = scoreMatch(tx, inv)
                        if (s > bestScore) { bestScore = s; bestInvId = inv.id }
                    }
                    if (bestInvId) autoMatches[tx.id] = bestInvId
                }
                setMatches(autoMatches)
            } catch {
                setParseError('Erreur lors de la lecture du fichier.')
            }
        }
        reader.readAsText(file, 'utf-8')
    }

    const handleConfirm = async (txId: string) => {
        const invId = matches[txId]
        if (!invId) return
        setSaving(txId)
        const { markInvoicePaid } = await import('@/app/actions/reconciliation')
        const res = await markInvoicePaid(invId)
        setSaving(null)
        if (res.success) {
            setConfirmed(prev => new Set([...prev, txId]))
            setSaveMsg(prev => ({ ...prev, [txId]: 'Facture marquee payee' }))
        } else {
            setSaveMsg(prev => ({ ...prev, [txId]: res.error || 'Erreur' }))
        }
    }

    const creditTxs = transactions.filter(tx => tx.credit > 0)
    const debitTxs = transactions.filter(tx => tx.debit > 0)

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-3xl">account_balance</span>
                        Rapprochement bancaire
                    </h1>
                    <p className="text-zinc-500 mt-2 text-sm">Importez un releve bancaire CSV pour rapprocher automatiquement vos factures.</p>
                </div>
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="bg-brand-gradient text-white font-bold py-2.5 px-5 rounded-lg shadow-glow-sm hover:shadow-glow flex items-center gap-2 text-sm self-start md:self-auto"
                >
                    <span className="material-symbols-outlined text-base">upload_file</span>
                    Importer un CSV
                </button>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            </div>

            {parseError && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-400">
                    {parseError}
                </div>
            )}

            {transactions.length === 0 && !parseError && (
                <div className="bg-white/[0.025] border border-dashed border-white/[0.1] rounded-2xl py-16 flex flex-col items-center gap-4 text-center">
                    <span className="material-symbols-outlined text-zinc-600 text-5xl">upload_file</span>
                    <div>
                        <p className="text-white font-bold mb-1">Aucun releve importe</p>
                        <p className="text-zinc-500 text-sm max-w-sm">Importez un fichier CSV avec les colonnes: date, libelle, credit, debit.</p>
                    </div>
                    <p className="text-xs text-zinc-600">Formats acceptes: CSV BNP, CIH, Attijariwafa, Maroc Telecommerce, etc.</p>
                </div>
            )}

            {transactions.length > 0 && (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-4 text-center">
                            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Transactions</p>
                            <p className="text-2xl font-bold text-white">{transactions.length}</p>
                        </div>
                        <div className="bg-green-500/[0.08] border border-green-500/20 rounded-2xl p-4 text-center">
                            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Credits</p>
                            <p className="text-xl font-bold text-green-400 font-mono">
                                {formatMAD(creditTxs.reduce((s, t) => s + t.credit, 0))}
                            </p>
                        </div>
                        <div className="bg-rose-500/[0.08] border border-rose-500/20 rounded-2xl p-4 text-center">
                            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Debits</p>
                            <p className="text-xl font-bold text-rose-400 font-mono">
                                {formatMAD(debitTxs.reduce((s, t) => s + t.debit, 0))}
                            </p>
                        </div>
                    </div>

                    {/* Transactions table */}
                    <div>
                        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
                            Rapprochement des entrees ({creditTxs.length})
                        </h2>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-500 uppercase text-[10px] tracking-wider">
                                        <th className="px-4 py-3 text-left font-bold">Date</th>
                                        <th className="px-4 py-3 text-left font-bold">Libelle</th>
                                        <th className="px-4 py-3 text-right font-bold">Montant</th>
                                        <th className="px-4 py-3 text-left font-bold">Facture suggeree</th>
                                        <th className="px-4 py-3 text-right font-bold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {creditTxs.map(tx => {
                                        const matchedInvId = matches[tx.id]
                                        const matchedInv = invoices.find(i => i.id === matchedInvId)
                                        const isConfirmed = confirmed.has(tx.id)
                                        const msg = saveMsg[tx.id]
                                        return (
                                            <tr key={tx.id} className={"transition-colors " + (isConfirmed ? "opacity-40" : "hover:bg-zinc-800/40")}>
                                                <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">{tx.date}</td>
                                                <td className="px-4 py-3 text-zinc-300 max-w-[200px] truncate">{tx.description}</td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-green-400">+{formatMAD(tx.credit)}</td>
                                                <td className="px-4 py-3">
                                                    {isConfirmed ? (
                                                        <span className="text-xs text-green-400 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                                            {msg}
                                                        </span>
                                                    ) : (
                                                        <select
                                                            value={matchedInvId || ''}
                                                            onChange={e => setMatches(prev => ({ ...prev, [tx.id]: e.target.value }))}
                                                            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white outline-none w-full max-w-[220px]"
                                                        >
                                                            <option value="">-- Aucune --</option>
                                                            {invoices.filter(i => i.status !== 'paid').map(inv => (
                                                                <option key={inv.id} value={inv.id}>
                                                                    {inv.number} | {inv.clientName} | {formatMAD(inv.total)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {msg && !isConfirmed && (
                                                        <p className="text-xs text-rose-400 mt-1">{msg}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {!isConfirmed && matchedInvId && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleConfirm(tx.id)}
                                                            disabled={saving === tx.id}
                                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all disabled:opacity-50"
                                                        >
                                                            {saving === tx.id ? (
                                                                <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                            ) : (
                                                                <span className="material-symbols-outlined text-[13px]">check</span>
                                                            )}
                                                            Confirmer
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Debits section */}
                    {debitTxs.length > 0 && (
                        <div>
                            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
                                Debits / Sorties ({debitTxs.length})
                            </h2>
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-500 uppercase text-[10px] tracking-wider">
                                            <th className="px-4 py-3 text-left font-bold">Date</th>
                                            <th className="px-4 py-3 text-left font-bold">Libelle</th>
                                            <th className="px-4 py-3 text-right font-bold">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {debitTxs.map(tx => (
                                            <tr key={tx.id} className="hover:bg-zinc-800/40 transition-colors">
                                                <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">{tx.date}</td>
                                                <td className="px-4 py-3 text-zinc-300">{tx.description}</td>
                                                <td className="px-4 py-3 text-right font-mono text-rose-400">-{formatMAD(tx.debit)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
