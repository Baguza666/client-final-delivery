# Architectural Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate 137 LOC of infrastructure duplication, unify redundant quote conversion workflows, extract dashboard aggregation helpers, and add a `withWorkspace` security wrapper that eliminates the 12-line IDOR-risk boilerplate from all action files.

**Architecture:** Four strictly-sequential phases with `npx tsc --noEmit` gates between each. Phase 1 extracts shared utilities; Phase 2 consolidates duplicate workflows; Phase 3 breaks up the dashboard monolith; Phase 4 applies a `withWorkspace` HOF eliminating auth/workspace boilerplate across every action file.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (SSR via `@supabase/ssr`), `next/cache` revalidatePath, `next/navigation` redirect.

---

## File Map

| File | Action |
|---|---|
| `src/lib/document-numbering.ts` | CREATE — canonical `generateNextNumber` |
| `src/lib/document-types.ts` | CREATE — `DocumentLineItem` and row-type interfaces |
| `src/lib/action-wrapper.ts` | CREATE — `withWorkspace` HOF |
| `src/app/actions/convert.ts` | MODIFY — remove inline numbering fn; absorb `acceptQuote` logic; apply `withWorkspace`; fix workspace_id bug |
| `src/app/actions/purchaseOrders.ts` | MODIFY — remove inline numbering fn; apply `withWorkspace` |
| `src/app/actions/deliveryNotes.ts` | MODIFY — remove inline numbering fn; apply `withWorkspace` |
| `src/app/actions/acceptQuote.ts` | DELETE in Phase 2 |
| `src/app/actions/finance.ts` | DELETE in Phase 2 |
| `src/app/actions/financeActions.ts` | MODIFY — absorb `finance.ts` exports; type `formData: any`; apply `withWorkspace` |
| `src/app/actions/clients.ts` | MODIFY — apply `withWorkspace`; remove `getSupabase()` |
| `src/app/actions/createQuote.ts` | MODIFY — apply `withWorkspace` |
| `src/app/actions/invoices.ts` | MODIFY — apply `withWorkspace` to all 18 exported functions |
| `src/app/actions/dashboard.ts` | MODIFY — extract 5 pure helpers; refactor coordinator (exempt from `withWorkspace` — intentionally handles unauthenticated state) |
| `src/components/expenses/FinanceControls.tsx` | MODIFY — import `createDebt` from `financeActions` not `finance` |
| `src/components/expenses/AddExpenseModal.tsx` | MODIFY — remove `workspace_id` from `createExpense` call |

---

## Phase 1 — Foundational Abstractions

### Task 1.1: Extract `generateNextNumber` utility

**Files:**
- Create: `src/lib/document-numbering.ts`
- Modify: `src/app/actions/convert.ts`
- Modify: `src/app/actions/purchaseOrders.ts`
- Modify: `src/app/actions/deliveryNotes.ts`

- [ ] **Step 1.1.1: Create `src/lib/document-numbering.ts`**

Exact logic preserved from the three existing copies:

```typescript
import { createClient } from '@/utils/supabase/server'

type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>

export async function generateNextNumber(
    supabase: AppSupabaseClient,
    table: string,
    column: string,
    prefix: string,
): Promise<string> {
    const year = new Date().getFullYear()
    const { data } = await supabase
        .from(table)
        .select(column)
        .ilike(column, `${prefix}-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    let nextIndex = 1
    if (data?.[column as keyof typeof data]) {
        const parts = (data[column as keyof typeof data] as string).split('-')
        const lastNum = parseInt(parts[parts.length - 1])
        if (!isNaN(lastNum)) nextIndex = lastNum + 1
    }
    return `${prefix}-${year}-${nextIndex.toString().padStart(4, '0')}`
}
```

- [ ] **Step 1.1.2: Update `convert.ts` imports and remove inline copy**

Add to the import block:
```typescript
import { generateNextNumber } from '@/lib/document-numbering'
```

Delete the entire `async function generateNextNumber(supabase: any, ...)` block (~10 lines) at the top of `convert.ts`.

- [ ] **Step 1.1.3: Update `purchaseOrders.ts` — same operation**

The file uses `createSupabaseClient()` as its local alias. Add:
```typescript
import { generateNextNumber } from '@/lib/document-numbering'
```
Delete the inline `async function generateNextNumber(supabase: any, ...)` block.

- [ ] **Step 1.1.4: Update `deliveryNotes.ts` — same operation**

Add:
```typescript
import { generateNextNumber } from '@/lib/document-numbering'
```
Delete the inline `async function generateNextNumber(supabase: any, ...)` block.

---

### Task 1.2: Define `DocumentLineItem` and fix fragile index-based matching

**Files:**
- Create: `src/lib/document-types.ts`
- Modify: `src/app/actions/acceptQuote.ts`

- [ ] **Step 1.2.1: Create `src/lib/document-types.ts`**

```typescript
export interface DocumentLineItem {
    line_uid: string
    description: string
    quantity: number
    unit_price: number
    tva_rate: number
    total: number
    unit?: string | null
}

export interface PoLineItem extends DocumentLineItem {
    purchase_order_id: string
}

export interface DnLineItem {
    delivery_note_id: string
    line_uid: string
    description: string
    quantity: number
    unit?: string | null
}

export interface InvoiceLineItem extends DocumentLineItem {
    invoice_id: string
}
```

- [ ] **Step 1.2.2: Fix fragile array-index matching in `acceptQuote.ts`**

Locate the "Generate Invoice Items" section. Replace:

```typescript
// REMOVE THIS:
const invoiceItems = dnItems.map((item: any, idx: number) => {
    const originalItem = poItems[idx]
    return {
        invoice_id: invoice.id,
        line_uid: item.line_uid,
        description: item.description,
        quantity: item.quantity,
        unit_price: originalItem.unit_price,
        tva_rate: originalItem.tva_rate,
        total: item.quantity * originalItem.unit_price
    }
})
```

With:

```typescript
const poByUid = new Map(poItems.map((p) => [p.line_uid, p]))
const invoiceItems = dnItems.map((item) => {
    const original = poByUid.get(item.line_uid)
    if (!original) throw new Error(`PO item missing for line_uid: ${item.line_uid}`)
    return {
        invoice_id: invoice.id,
        line_uid: item.line_uid,
        description: item.description,
        quantity: item.quantity,
        unit_price: original.unit_price,
        tva_rate: original.tva_rate,
        total: item.quantity * original.unit_price,
    }
})
```

- [ ] **Step 1.2.3: Type-check Phase 1**

```bash
cd /Users/hichamzineddine/Desktop/invoicing-app && npx tsc --noEmit
```

Expected: 0 errors. Do not proceed to Phase 2 if errors exist.

- [ ] **Step 1.2.4: Commit Phase 1**

```bash
git add src/lib/document-numbering.ts src/lib/document-types.ts \
  src/app/actions/convert.ts \
  src/app/actions/purchaseOrders.ts \
  src/app/actions/deliveryNotes.ts \
  src/app/actions/acceptQuote.ts
git commit -m "refactor(phase1): extract generateNextNumber utility, add DocumentLineItem types, fix index-based item matching"
```

---

## Phase 2 — Workflow Consolidation

### Task 2.1: Absorb `acceptQuote.ts` into `convert.ts`

**Files:**
- Modify: `src/app/actions/convert.ts`
- Delete: `src/app/actions/acceptQuote.ts`

- [ ] **Step 2.1.1: Add `createHash` import to `convert.ts`**

```typescript
import { createHash } from 'crypto'
```

- [ ] **Step 2.1.2: Append `generateHash` helper and `acceptQuote` export to `convert.ts`**

Append at the bottom of the file:

```typescript
function generateHash(data: unknown): string {
    if (!data) return ''
    const str = JSON.stringify(data, (_key, value: unknown) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value as Record<string, unknown>)
                .sort()
                .reduce<Record<string, unknown>>((sorted, k) => {
                    sorted[k] = (value as Record<string, unknown>)[k]
                    return sorted
                }, {})
        }
        return value
    })
    return createHash('md5').update(str).digest('hex')
}

export async function acceptQuote(
    quoteId: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } },
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Non authentifié.' }

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { success: false, error: 'Espace de travail introuvable.' }

    const { data: quote } = await supabase
        .from('quotes')
        .select('*, quote_items(*)')
        .eq('id', quoteId)
        .eq('workspace_id', workspaceId)
        .single()

    if (!quote) return { success: false, error: 'Devis introuvable' }

    const { data: existing } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('quote_id', quoteId)
        .single()
    if (existing) return { success: false, message: 'Documents déjà générés' }

    const currentHash = generateHash(quote.quote_items)

    const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
            quote_id: quote.id,
            workspace_id: workspaceId,
            number: `PO-${quote.number}`,
            status: 'draft',
            content_hash: currentHash,
        })
        .select()
        .single()

    if (poError || !po)
        return { success: false, message: `Erreur création Bon de Commande: ${poError?.message}` }

    type RawQuoteItem = { id: string; description: string; quantity: number; unit_price: number; tva_rate: number | null; total: number }
    const poItems = (quote.quote_items as RawQuoteItem[]).map((item) => ({
        purchase_order_id: po.id,
        line_uid: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tva_rate: item.tva_rate != null ? Number(item.tva_rate) : 20,
        total: item.total,
    }))
    await supabase.from('purchase_order_items').insert(poItems)

    const { data: dn } = await supabase
        .from('delivery_notes')
        .insert({
            purchase_order_id: po.id,
            workspace_id: workspaceId,
            number: `DN-${quote.number}`,
            status: 'draft',
            upstream_hash_at_sync: currentHash,
        })
        .select()
        .single()

    if (!dn) return { success: false, message: 'Erreur création Bon de Livraison' }

    const dnItems = poItems.map((item) => ({
        delivery_note_id: dn.id,
        line_uid: item.line_uid,
        description: item.description,
        quantity: item.quantity,
    }))
    await supabase.from('delivery_note_items').insert(dnItems)

    const { data: invoice } = await supabase
        .from('invoices')
        .insert({
            client_id: quote.client_id,
            workspace_id: workspaceId,
            invoice_number: `INV-${quote.number}`,
            status: 'draft',
            total_ttc: quote.total_amount,
        })
        .select()
        .single()

    if (!invoice) return { success: false, message: 'Erreur création Facture' }

    const poByUid = new Map(poItems.map((p) => [p.line_uid, p]))
    const invoiceItems = dnItems.map((item) => {
        const original = poByUid.get(item.line_uid)
        if (!original) throw new Error(`PO item missing for line_uid: ${item.line_uid}`)
        return {
            invoice_id: invoice.id,
            line_uid: item.line_uid,
            description: item.description,
            quantity: item.quantity,
            unit_price: original.unit_price,
            tva_rate: original.tva_rate,
            total: item.quantity * original.unit_price,
        }
    })
    await supabase.from('invoice_items').insert(invoiceItems)

    await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', quoteId)
        .eq('workspace_id', workspaceId)

    return { success: true }
}
```

- [ ] **Step 2.1.3: Verify and update any callers of `acceptQuote`**

```bash
grep -rn "from.*acceptQuote\|require.*acceptQuote" /Users/hichamzineddine/Desktop/invoicing-app/src --include='*.ts' --include='*.tsx'
```

For each caller found, change the import to:
```typescript
import { acceptQuote } from '@/app/actions/convert'
```

- [ ] **Step 2.1.4: Delete `acceptQuote.ts`**

```bash
rm /Users/hichamzineddine/Desktop/invoicing-app/src/app/actions/acceptQuote.ts
```

---

### Task 2.2: Absorb `finance.ts` into `financeActions.ts`

**Files:**
- Modify: `src/app/actions/financeActions.ts`
- Delete: `src/app/actions/finance.ts`
- Modify: `src/components/expenses/FinanceControls.tsx`

- [ ] **Step 2.2.1: Identify what `finance.ts` exports that `financeActions.ts` does not**

```bash
grep '^export async function' /Users/hichamzineddine/Desktop/invoicing-app/src/app/actions/finance.ts
grep '^export async function' /Users/hichamzineddine/Desktop/invoicing-app/src/app/actions/financeActions.ts
```

Known functions to migrate from `finance.ts`: `updateExpense(FormData)`, `createDebt(FormData)`. If `finance.ts` also has `deleteExpense`, skip it — the typed `deleteExpense(id: string)` in `financeActions.ts` is the correct version.

- [ ] **Step 2.2.2: Append `updateExpense` and `createDebt` to `financeActions.ts`**

Copy the function bodies verbatim from `finance.ts`. The `createClient()` function already exists in `financeActions.ts` — do not duplicate it. Append:

```typescript
// --- FROM finance.ts ---

export async function createDebt(formData: FormData): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Non authentifié.' }

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { success: false, error: 'Espace de travail introuvable.' }

    const creditor = (formData.get('creditor') as string)?.trim()
    if (!creditor) return { success: false, error: 'Le nom du créancier est requis.' }

    const totalAmount = Number(formData.get('total_amount'))
    if (isNaN(totalAmount) || totalAmount <= 0) return { success: false, error: 'Montant total invalide.' }

    const monthlyPayment = Number(formData.get('monthly_payment'))
    if (isNaN(monthlyPayment) || monthlyPayment <= 0) return { success: false, error: 'Mensualité invalide.' }

    const dueDate = formData.get('due_date') as string

    const { error } = await supabase.from('debts').insert({
        workspace_id: workspaceId,
        creditor_name: creditor,
        total_amount: totalAmount,
        remaining_amount: totalAmount,
        monthly_payment: monthlyPayment,
        due_date: dueDate,
        status: 'Active',
    })

    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard')
    revalidatePath('/expenses')
    return { success: true }
}
```

Copy `updateExpense` using the same approach (read it from `finance.ts`, paste verbatim).

- [ ] **Step 2.2.3: Update `FinanceControls.tsx` import**

```bash
grep -n "from.*finance" /Users/hichamzineddine/Desktop/invoicing-app/src/components/expenses/FinanceControls.tsx
```

Change any `from '@/app/actions/finance'` to `from '@/app/actions/financeActions'`.

- [ ] **Step 2.2.4: Delete `finance.ts`**

```bash
rm /Users/hichamzineddine/Desktop/invoicing-app/src/app/actions/finance.ts
```

- [ ] **Step 2.2.5: Type-check Phase 2**

```bash
cd /Users/hichamzineddine/Desktop/invoicing-app && npx tsc --noEmit
```

Expected: 0 errors. Do not proceed to Phase 3 if errors exist.

- [ ] **Step 2.2.6: Commit Phase 2**

```bash
git add src/app/actions/convert.ts \
  src/app/actions/financeActions.ts \
  src/components/expenses/FinanceControls.tsx
git rm src/app/actions/acceptQuote.ts src/app/actions/finance.ts
git commit -m "refactor(phase2): merge acceptQuote into convert, merge finance into financeActions"
```

---

## Phase 3 — Decouple the Dashboard Monolith

### Task 3.1: Extract 5 pure helpers and refactor `getDashboardStats` as coordinator

**Files:**
- Modify: `src/app/actions/dashboard.ts`

`getDashboardStats` currently does all DB fetching AND all aggregation inline. The helpers operate purely on already-fetched data — no DB calls, fully synchronous, independently testable.

**Note:** `getDashboardStats` is deliberately NOT wrapped with `withWorkspace`. It handles the unauthenticated case gracefully (returns empty-state `DashboardData` instead of an error) because the dashboard page must render something even before auth resolves.

- [ ] **Step 3.1.1: Insert row-type aliases after the `DashboardData` interface**

Insert before the existing `buildMonthBuckets` function:

```typescript
type InvoiceRow = {
    id: string
    status: string | null
    total_ttc: string | number | null
    date?: string | null
    created_at?: string | null
    due_date?: string | null
    client_id?: string | null
    invoice_number?: string | null
    client?: { name?: string | null } | null
}

type ExpenseRow = {
    amount: string | number | null
    date?: string | null
    created_at?: string | null
    category?: string | null
}

type DebtRow = {
    status?: string | null
    remaining_amount?: string | number | null
    total_amount?: string | number | null
    due_date?: string | null
}
```

- [ ] **Step 3.1.2: Insert `aggregateDebt` before `getDashboardStats`**

```typescript
export function aggregateDebt(debts: DebtRow[]): DebtSummary {
    const activeDebts = debts.filter((d) => (d.status || '').toLowerCase() !== 'paid')
    const totalRemaining = activeDebts.reduce((sum, d) => sum + (Number(d.remaining_amount) || 0), 0)
    const totalAmount = debts.reduce((sum, d) => sum + (Number(d.total_amount) || 0), 0)
    const progressPct =
        totalAmount > 0 ? Math.round(((totalAmount - totalRemaining) / totalAmount) * 100) : 0
    const nextDueDate =
        activeDebts.map((d) => d.due_date).filter((d): d is string => !!d).sort()[0] ?? null
    return { activeCount: activeDebts.length, totalRemaining, totalAmount, progressPct, nextDueDate }
}
```

- [ ] **Step 3.1.3: Insert `buildReminders` before `getDashboardStats`**

```typescript
export function buildReminders(invoices: InvoiceRow[], todayStr: string): Reminder[] {
    const reminders: Reminder[] = []
    for (const inv of invoices) {
        const status = (inv.status || '').toLowerCase()
        const clientName = inv.client?.name || 'Client inconnu'
        const invoiceNumber = inv.invoice_number || inv.id.slice(0, 8).toUpperCase()
        const amount = Number(inv.total_ttc) || 0
        const dueDate: string | null = inv.due_date || null
        if (status === 'overdue') {
            reminders.push({ id: inv.id, invoiceNumber, clientName, amount, dueDate, type: 'overdue' })
        } else if (
            (status === 'sent' || status === 'pending' || status === 'en_attente') &&
            dueDate && dueDate < todayStr
        ) {
            reminders.push({ id: inv.id, invoiceNumber, clientName, amount, dueDate, type: 'overdue' })
        } else if (status === 'draft') {
            reminders.push({ id: inv.id, invoiceNumber, clientName, amount, dueDate, type: 'pending' })
        }
    }
    return reminders
}
```

- [ ] **Step 3.1.4: Insert `bucketExpensesByCategory` before `getDashboardStats`**

```typescript
export function bucketExpensesByCategory(expenses: ExpenseRow[]): Record<string, number> {
    const result: Record<string, number> = {}
    for (const exp of expenses) {
        const cat = exp.category || 'Autre'
        result[cat] = (result[cat] || 0) + (Number(exp.amount) || 0)
    }
    return result
}
```

- [ ] **Step 3.1.5: Insert `aggregateRevenueByMonth` before `getDashboardStats`**

```typescript
export function aggregateRevenueByMonth(invoices: InvoiceRow[], keys: string[]): number[] {
    const bucketMap = new Map<string, number>(keys.map((k) => [k, 0]))
    for (const inv of invoices) {
        if ((inv.status || '').toLowerCase() !== 'paid') continue
        const ref = new Date(inv.date || inv.created_at || '')
        if (isNaN(ref.getTime())) continue
        const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`
        if (bucketMap.has(key)) bucketMap.set(key, (bucketMap.get(key) || 0) + (Number(inv.total_ttc) || 0))
    }
    return keys.map((k) => bucketMap.get(k) || 0)
}
```

- [ ] **Step 3.1.6: Insert `findTopClients` before `getDashboardStats`**

```typescript
export function findTopClients(invoices: InvoiceRow[]): TopClient[] {
    const clientMap = new Map<string, { name: string; revenue: number; invoiceCount: number }>()
    for (const inv of invoices) {
        if ((inv.status || '').toLowerCase() !== 'paid') continue
        const name = inv.client?.name || 'Inconnu'
        const id = inv.client_id || name
        const existing = clientMap.get(id) || { name, revenue: 0, invoiceCount: 0 }
        existing.revenue += Number(inv.total_ttc) || 0
        existing.invoiceCount++
        clientMap.set(id, existing)
    }
    return [...clientMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
}
```

- [ ] **Step 3.1.7: Refactor `getDashboardStats` body to call helpers**

Inside `getDashboardStats`, after the `Promise.all` fetch, replace the inline aggregation blocks with helper calls. The before/after for the relevant section:

```typescript
// REMOVE these inline blocks:
//   totalRevenue / totalExpenses / pendingCount — keep as-is (simple reduces)
//   the inline debt aggregation loop
//   the inline expensesByCategory loop
//   the inline topClients loop
//   the inline revenueByMonth/expensesByMonth bucketing loops
//   the inline reminders loop

// REPLACE WITH:
const safeInvoices: InvoiceRow[] = (invoices as InvoiceRow[] | null) ?? []
const safeExpenses: ExpenseRow[] = (expenses as ExpenseRow[] | null) ?? []
const safeDebts: DebtRow[] = (debts as DebtRow[] | null) ?? []
const safeClients = clients ?? []

const { keys, labels } = buildMonthBuckets(now)

const totalRevenue = safeInvoices
    .filter((i) => (i.status || '').toLowerCase() === 'paid')
    .reduce((sum, i) => sum + (Number(i.total_ttc) || 0), 0)
const totalExpenses = safeExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
const pendingCount = safeInvoices.filter((i) => {
    const s = (i.status || '').toLowerCase()
    return s === 'sent' || s === 'pending' || s === 'en_attente' || s === 'en attente'
}).length

const debt = aggregateDebt(safeDebts)
const expensesByCategory = bucketExpensesByCategory(safeExpenses)
const topClients = findTopClients(safeInvoices)
const revenueByMonth = aggregateRevenueByMonth(safeInvoices, keys)

const expBucketMap = new Map<string, number>(keys.map((k) => [k, 0]))
for (const exp of safeExpenses) {
    const ref = new Date(exp.date || exp.created_at || '')
    if (isNaN(ref.getTime())) continue
    const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`
    if (expBucketMap.has(key)) expBucketMap.set(key, (expBucketMap.get(key) || 0) + (Number(exp.amount) || 0))
}
const expensesByMonth = keys.map((k) => expBucketMap.get(k) || 0)

const lastMonthRev = revenueByMonth[revenueByMonth.length - 2] || 0
const thisMonthRev = revenueByMonth[revenueByMonth.length - 1] || 0
const momGrowthPct =
    lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100
    : thisMonthRev > 0 ? 100 : 0

const pendingAmount = safeInvoices
    .filter((i) => { const s = (i.status || '').toLowerCase(); return s === 'pending' || s === 'draft' })
    .reduce((sum, i) => sum + (Number(i.total_ttc) || 0), 0)

const nowDate = new Date()
const curYear = nowDate.getFullYear()
const curMonth = nowDate.getMonth()

const invoicesThisMonth = safeInvoices.filter((i) => {
    const d = new Date(i.date || i.created_at || '')
    return !isNaN(d.getTime()) && d.getFullYear() === curYear && d.getMonth() === curMonth
}).length

const clientCount = safeClients.length

const MONTH_LABELS_FR = ['Jan','Fév','Mar','Avr','Mai','Jui','Jul','Aoû','Sep','Oct','Nov','Déc']
const revenueByYear: MonthBar[] = Array.from({ length: curMonth + 1 }, (_, m) => ({
    label: MONTH_LABELS_FR[m], revenue: 0,
}))
for (const inv of safeInvoices) {
    if ((inv.status || '').toLowerCase() !== 'paid') continue
    const d = new Date(inv.date || inv.created_at || '')
    if (isNaN(d.getTime()) || d.getFullYear() !== curYear) continue
    const m = d.getMonth()
    if (m <= curMonth) revenueByYear[m].revenue += Number(inv.total_ttc) || 0
}

const todayStr = nowDate.toISOString().slice(0, 10)
const reminders = buildReminders(safeInvoices, todayStr)

return {
    stats: {
        revenue: totalRevenue, expenses: totalExpenses,
        treasury: totalRevenue - totalExpenses,
        pending: pendingCount, debt: debt.totalRemaining,
    },
    debt,
    recentTransactions: safeInvoices.slice(0, 5),
    recentExpenses: safeExpenses.slice(0, 5),
    revenueByMonth, expensesByMonth, monthLabels: labels,
    expensesByCategory, topClients, momGrowthPct,
    hasAnyData: safeInvoices.length > 0 || safeExpenses.length > 0 || safeDebts.length > 0 || safeClients.length > 0,
    pendingAmount, invoicesThisMonth, clientCount, revenueByYear, reminders,
}
```

- [ ] **Step 3.1.8: Type-check Phase 3**

```bash
cd /Users/hichamzineddine/Desktop/invoicing-app && npx tsc --noEmit
```

Expected: 0 errors. Do not proceed to Phase 4 if errors exist.

- [ ] **Step 3.1.9: Commit Phase 3**

```bash
git add src/app/actions/dashboard.ts
git commit -m "refactor(phase3): extract aggregateDebt, buildReminders, bucketExpensesByCategory, aggregateRevenueByMonth, findTopClients from getDashboardStats"
```

---

## Phase 4 — IDOR Security Wrapper

### Task 4.1: Create `withWorkspace` HOF

**Files:**
- Create: `src/lib/action-wrapper.ts`

- [ ] **Step 4.1.1: Create `src/lib/action-wrapper.ts`**

```typescript
import { createClient } from '@/utils/supabase/server'
import { getOrCreateWorkspace } from '@/lib/workspace'
import type { User } from '@supabase/supabase-js'

type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>

export type WorkspaceContext = {
    supabase: AppSupabaseClient
    user: User
    workspaceId: string
}

export async function withWorkspace<T>(
    handler: (ctx: WorkspaceContext) => Promise<T>,
): Promise<T | { error: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }
    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }
    return handler({ supabase, user, workspaceId })
}
```

---

### Task 4.2: Apply `withWorkspace` to `clients.ts`

**Files:**
- Modify: `src/app/actions/clients.ts`

- [ ] **Step 4.2.1: Update imports — remove `getSupabase()`, add wrapper**

Replace:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getOrCreateWorkspace } from '@/lib/workspace'
```
With:
```typescript
import { withWorkspace } from '@/lib/action-wrapper'
```

Delete the entire `async function getSupabase() { ... }` block.

- [ ] **Step 4.2.2: Wrap `createNewClient`**

```typescript
export async function createNewClient(formData: FormData): Promise<ClientActionResult | { error: string }> {
    return withWorkspace(async ({ supabase, workspaceId }) => {
        const name = (formData.get('name') as string)?.trim()
        // ... all the original field extractions and validation ...
        // Replace every reference to the old `supabase` and `workspaceId` locals with context values
        const { data, error } = await supabase.from('clients').insert({ workspace_id: workspaceId, name, /* ... */ }).select().single()
        if (error) return { success: false, message: error.message }
        revalidatePath('/clients')
        return { success: true, message: 'Client créé avec succès !', id: data?.id }
    })
}
```

Apply the same pattern to `updateClient`, `deleteClient`, `deleteClientsBulk`. The internal logic is unchanged — only the boilerplate setup lines are removed.

---

### Task 4.3: Apply `withWorkspace` to `createQuote.ts`

**Files:**
- Modify: `src/app/actions/createQuote.ts`

- [ ] **Step 4.3.1: Update imports**

Add:
```typescript
import { withWorkspace } from '@/lib/action-wrapper'
```
Remove the inline `createClient()` / `createServerClient` / `cookies` boilerplate and its function definition.

- [ ] **Step 4.3.2: Wrap all exported functions**

Pattern for each function in the file:
```typescript
export async function createQuote(formData: FormData) {
    return withWorkspace(async ({ supabase, user, workspaceId }) => {
        // original body — supabase and workspaceId come from context
    })
}
```

---

### Task 4.4: Apply `withWorkspace` to `deliveryNotes.ts`

**Files:**
- Modify: `src/app/actions/deliveryNotes.ts`

- [ ] **Step 4.4.1: Update imports**

Add:
```typescript
import { withWorkspace } from '@/lib/action-wrapper'
```
Remove inline `createClient()` definition.

- [ ] **Step 4.4.2: Wrap all exported functions**

`generateNextNumber` is already imported from `@/lib/document-numbering` (Phase 1). The `supabase` client it receives comes from the `WorkspaceContext`. Example:

```typescript
export async function createDeliveryNote(formData: FormData) {
    return withWorkspace(async ({ supabase, user, workspaceId }) => {
        const clientId = formData.get('client_id')
        const rawDate = formData.get('date') as string | null
        const date = rawDate?.trim() || new Date().toISOString().split('T')[0]
        const itemsJson = formData.get('items') as string
        const items: Array<{ description: string; quantity: number; unit?: string }> =
            itemsJson ? (JSON.parse(itemsJson) as Array<{ description: string; quantity: number; unit?: string }>) : []

        const number = await generateNextNumber(supabase, 'delivery_notes', 'number', 'BL')

        const { data: dn, error: dnError } = await supabase
            .from('delivery_notes')
            .insert({ workspace_id: workspaceId, client_id: clientId, owner_id: user.id, number, date, status: 'draft' })
            .select()
            .single()

        if (dnError || !dn) return { success: false, error: dnError?.message }

        if (items.length > 0) {
            await supabase.from('delivery_note_items').insert(
                items.map((item) => ({
                    delivery_note_id: dn.id,
                    description: item.description,
                    quantity: Number(item.quantity) || 0,
                    unit: item.unit || null,
                })),
            )
        }

        revalidatePath('/delivery-notes')
        return { success: true, id: dn.id }
    })
}
```

Apply to all other exported functions in `deliveryNotes.ts`.

---

### Task 4.5: Apply `withWorkspace` to `purchaseOrders.ts`

**Files:**
- Modify: `src/app/actions/purchaseOrders.ts`

- [ ] **Step 4.5.1: Update imports**

Add:
```typescript
import { withWorkspace } from '@/lib/action-wrapper'
```
Remove the inline `createSupabaseClient()` function definition (the file uses `createSupabaseClient` as its local alias).

- [ ] **Step 4.5.2: Wrap all exported functions**

```typescript
export async function createPurchaseOrder(formData: FormData) {
    return withWorkspace(async ({ supabase, user, workspaceId }) => {
        // original body — supabase/user/workspaceId come from context
    })
}
```

Apply to all exported functions.

---

### Task 4.6: Apply `withWorkspace` to `convert.ts`

**Files:**
- Modify: `src/app/actions/convert.ts`

This file currently mixes imports from `@supabase/ssr` and `next/headers` for client creation. After wrapping, these are no longer needed.

- [ ] **Step 4.6.1: Update imports**

Final import block for `convert.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createHash } from 'crypto'
import { generateNextNumber } from '@/lib/document-numbering'
import { withWorkspace } from '@/lib/action-wrapper'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
```

**Note:** Keep `createServerClient`, `cookies`, and `getOrCreateWorkspace` imports until Phase 4 is complete for `acceptQuote` — then remove them as part of the wrap.

- [ ] **Step 4.6.2: Wrap `convertQuoteToDocuments`**

Key change: fix `workspace_id: quote.workspace_id` (security bug) → `workspace_id: workspaceId`:

```typescript
export async function convertQuoteToDocuments(quoteId: string) {
    return withWorkspace(async ({ supabase, user, workspaceId }) => {
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select('*, quote_items(*)')
            .eq('id', quoteId)
            .eq('workspace_id', workspaceId)
            .single()
        if (quoteError || !quote) return { success: false, error: 'Devis introuvable dans la base de données.' }

        const invNum = await generateNextNumber(supabase, 'invoices', 'invoice_number', 'INV')
        const blNum = await generateNextNumber(supabase, 'delivery_notes', 'number', 'BL')
        const bcNum = await generateNextNumber(supabase, 'purchase_orders', 'number', 'BC')

        type RawItem = { id: string; description: string; unit?: string | null; quantity: number; unit_price: number; tva_rate: number | null; total: number }
        const items = (quote.quote_items as RawItem[]) || []
        const totalHT_Gross = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)
        const discount = (quote.discount as number) || 0
        const discountRatio = totalHT_Gross > 0 ? 1 - discount / 100 : 1
        const totalHT_Net = totalHT_Gross * discountRatio
        const totalTVA = items.reduce((sum, i) => {
            const lineHT = (Number(i.quantity) || 0) * (Number(i.unit_price) || 0) * discountRatio
            return sum + lineHT * ((i.tva_rate != null ? Number(i.tva_rate) : 20) / 100)
        }, 0)
        const totalTTC = totalHT_Net + totalTVA

        const { data: newInvoice, error: invError } = await supabase
            .from('invoices')
            .insert({
                invoice_number: invNum,
                date: new Date().toISOString(),
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                client_id: quote.client_id,
                workspace_id: workspaceId,  // FIX: was quote.workspace_id
                status: 'draft',
                discount,
                notes: quote.notes || null,
                total_ht: totalHT_Gross,
                total_tva: totalTVA,
                total_ttc: totalTTC,
                owner_id: user.id,
            })
            .select()
            .single()

        if (invError) return { success: false, error: `Erreur Facture: ${invError.message}` }

        await supabase.from('invoice_items').insert(
            items.map((i) => ({
                invoice_id: newInvoice.id, description: i.description, unit: i.unit || null,
                quantity: i.quantity, unit_price: i.unit_price,
                tva_rate: i.tva_rate != null ? Number(i.tva_rate) : 20, total: i.total,
            })),
        )

        const { data: newBL } = await supabase
            .from('delivery_notes')
            .insert({ number: blNum, date: new Date().toISOString(), client_id: quote.client_id, workspace_id: workspaceId, status: 'pending', owner_id: user.id })
            .select().single()
        if (newBL) {
            await supabase.from('delivery_note_items').insert(
                items.map((i) => ({ delivery_note_id: newBL.id, description: i.description, unit: i.unit || null, quantity: i.quantity })),
            )
        }

        const { data: newBC } = await supabase
            .from('purchase_orders')
            .insert({ number: bcNum, date: new Date().toISOString(), client_id: quote.client_id, workspace_id: workspaceId, status: 'pending', owner_id: user.id })
            .select().single()
        if (newBC) {
            await supabase.from('purchase_order_items').insert(
                items.map((i) => ({
                    purchase_order_id: newBC.id, description: i.description, unit: i.unit || null,
                    quantity: i.quantity, unit_price: i.unit_price,
                    tva_rate: i.tva_rate != null ? Number(i.tva_rate) : 20, total: i.total,
                })),
            )
        }

        revalidatePath('/invoices')
        revalidatePath('/delivery-notes')
        revalidatePath('/purchase-orders')
        return { success: true, invoiceId: newInvoice.id }
    })
}
```

Apply the same `withWorkspace` pattern to `convertInvoiceToDeliveryNote` and `acceptQuote`. After wrapping all three, remove `createServerClient`, `cookies`, and `getOrCreateWorkspace` from the import block.

---

### Task 4.7: Apply `withWorkspace` to `financeActions.ts`

**Files:**
- Modify: `src/app/actions/financeActions.ts`
- Modify: `src/components/expenses/AddExpenseModal.tsx`

- [ ] **Step 4.7.1: Update imports**

Add:
```typescript
import { withWorkspace } from '@/lib/action-wrapper'
```
Remove the inline `async function createClient()` definition.

- [ ] **Step 4.7.2: Define `ExpenseInput` interface — fixes `formData: any`**

Add at the top of the file, after `'use server'`:
```typescript
export interface ExpenseInput {
    description: string
    amount: number | string
    category: string
    date: string
    payment_method?: string
    proof_url?: string | null
    is_recurring?: boolean | string
    frequency?: string | null
}
```

- [ ] **Step 4.7.3: Wrap `createExpense` with typed input**

```typescript
export async function createExpense(formData: ExpenseInput) {
    return withWorkspace(async ({ supabase, workspaceId }) => {
        const amount = parseFloat(String(formData.amount))
        if (isNaN(amount) || amount <= 0) return { error: 'Montant invalide.' }

        const { error } = await supabase.from('expenses').insert({
            workspace_id: workspaceId,
            description: formData.description,
            amount,
            category: formData.category,
            date: formData.date,
            payment_method: formData.payment_method || 'Espèces',
            proof_url: formData.proof_url || null,
            is_recurring: formData.is_recurring === 'true' || formData.is_recurring === true,
            frequency: formData.frequency || null,
            status: 'paid',
        })
        if (error) return { error: error.message }
        revalidatePath('/expenses')
        revalidatePath('/')
        return { success: true }
    })
}
```

- [ ] **Step 4.7.4: Wrap remaining functions**

```typescript
export async function payDebtInstallment(debtId: string, amount: number, debtName: string) {
    return withWorkspace(async ({ supabase, workspaceId }) => {
        const { data: debt, error: fetchError } = await supabase
            .from('debts')
            .select('remaining_amount, workspace_id')
            .eq('id', debtId)
            .eq('workspace_id', workspaceId)
            .single()
        if (fetchError || !debt) return { error: 'Dette introuvable.' }

        const newRemaining = Math.max(0, (debt.remaining_amount as number) - amount)
        const newStatus = newRemaining === 0 ? 'paid' : 'active'

        const { error: updateError } = await supabase
            .from('debts')
            .update({ remaining_amount: newRemaining, status: newStatus, last_payment: new Date().toISOString() })
            .eq('id', debtId)
            .eq('workspace_id', workspaceId)
        if (updateError) return { error: `Erreur DB: ${updateError.message}` }

        await supabase.from('expenses').insert({
            workspace_id: workspaceId,
            description: `Remboursement Dette: ${debtName}`,
            amount,
            category: 'Dette',
            date: new Date().toISOString(),
            payment_method: 'Virement',
            status: 'paid',
        })

        revalidatePath('/', 'layout')
        return { success: true }
    })
}

export async function deleteExpense(id: string) {
    return withWorkspace(async ({ supabase, workspaceId }) => {
        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id)
            .eq('workspace_id', workspaceId)
        if (error) return { error: error.message }
        revalidatePath('/expenses')
        revalidatePath('/')
        return { success: true }
    })
}
```

Apply `withWorkspace` to `createDebt` and `updateExpense` (added from `finance.ts` in Phase 2) using the same pattern.

- [ ] **Step 4.7.5: Remove `workspace_id` from `AddExpenseModal.tsx` call**

```bash
grep -n "workspace_id" /Users/hichamzineddine/Desktop/invoicing-app/src/components/expenses/AddExpenseModal.tsx
```

Find the `createExpense({ ..., workspace_id: workspaceId })` call. Remove `workspace_id: workspaceId` from the object — the server now resolves it from the session. Also remove the `workspaceId` variable if it's only used for that call.

---

### Task 4.8: Apply `withWorkspace` to `invoices.ts`

**Files:**
- Modify: `src/app/actions/invoices.ts`

`invoices.ts` has 18 exported functions. All follow the same transformation pattern.

- [ ] **Step 4.8.1: Update imports**

Add:
```typescript
import { withWorkspace } from '@/lib/action-wrapper'
```
Remove the inline `async function createClient()` definition. Keep `import { createClient } from '@/utils/supabase/server'` only if `createClient` is still referenced elsewhere in the file (check — it shouldn't be after wrapping).

- [ ] **Step 4.8.2: Wrap all 18 exported functions**

The transformation is mechanical. Full example for `markInvoiceAsPaid`:

```typescript
export async function markInvoiceAsPaid(invoiceId: string) {
    return withWorkspace(async ({ supabase, workspaceId }) => {
        const { error } = await supabase
            .from('invoices')
            .update({ status: 'paid' })
            .eq('id', invoiceId)
            .eq('workspace_id', workspaceId)
        if (error) return { error: error.message }
        revalidatePath('/invoices')
        revalidatePath('/dashboard')
        revalidatePath(`/invoices/${invoiceId}`)
        return { success: true }
    })
}
```

Apply to all 18 functions. Special notes:
- `generateSingleTemplate`: currently uses `wsId2` as the workspace variable name — rename to `workspaceId` from context.
- `sendOverdueReminders` and `generateRecurringInvoices`: these are batch jobs but still scoped per workspace — `withWorkspace` is correct here.
- Functions that call `redirect(path)` at the end: `redirect` throws internally (Next.js `NEXT_REDIRECT`), which propagates through `withWorkspace` correctly. No special handling needed.

---

### Task 4.9: Final type-check and commit

- [ ] **Step 4.9.1: Full type-check**

```bash
cd /Users/hichamzineddine/Desktop/invoicing-app && npx tsc --noEmit
```

Expected: 0 errors. If errors, fix in the file where they appear before committing.

- [ ] **Step 4.9.2: Commit Phase 4**

```bash
git add src/lib/action-wrapper.ts \
  src/app/actions/clients.ts \
  src/app/actions/createQuote.ts \
  src/app/actions/deliveryNotes.ts \
  src/app/actions/purchaseOrders.ts \
  src/app/actions/convert.ts \
  src/app/actions/financeActions.ts \
  src/app/actions/invoices.ts \
  src/components/expenses/AddExpenseModal.tsx
git commit -m "refactor(phase4): apply withWorkspace HOF to all action files, eliminate IDOR-risk auth boilerplate"
```

---

## Self-Review

**Spec coverage:**
- [x] `generateNextNumber` extracted to `src/lib/document-numbering.ts` — Task 1.1
- [x] `DocumentLineItem` interface defined — Task 1.2.1
- [x] Fragile `poItems[idx]` index-matching fixed with `line_uid` Map lookup — Task 1.2.2
- [x] `acceptQuote.ts` deleted, logic absorbed into `convert.ts` — Task 2.1
- [x] `finance.ts` deleted, functions absorbed into `financeActions.ts` — Task 2.2
- [x] 5 pure helpers extracted from `getDashboardStats` — Tasks 3.1.2–3.1.6
- [x] `getDashboardStats` refactored as coordinator — Task 3.1.7
- [x] `withWorkspace` HOF created — Task 4.1
- [x] Applied to `clients.ts`, `createQuote.ts`, `deliveryNotes.ts`, `purchaseOrders.ts`, `convert.ts`, `financeActions.ts`, `invoices.ts` — Tasks 4.2–4.8
- [x] `workspace_id: quote.workspace_id` bug in `convertQuoteToDocuments` fixed — Task 4.6.2
- [x] `formData: any` in `createExpense` replaced with typed `ExpenseInput` — Task 4.7.2
- [x] Caller `workspace_id` leak removed from `AddExpenseModal.tsx` — Task 4.7.5

**Intentional exemption:** `getDashboardStats` in `dashboard.ts` is NOT wrapped with `withWorkspace`. It handles unauthenticated state gracefully (returns empty DashboardData, not an error object), which is the correct UX for a read-only data fetcher. The 3-line auth setup in that function is minimal and does not create a security risk since it only reads data.

**Type safety guarantees:**
- No `any` types introduced. All `supabase: any` → `AppSupabaseClient` via `Awaited<ReturnType<typeof createClient>>`.
- `formData: any` in `createExpense` → `ExpenseInput` interface.
- `catch (e: any)` blocks — where they remain in Phase 2 migrated code, they should be replaced with `catch (e: unknown)` and `(e instanceof Error ? e.message : 'Unknown error')`.
- All `line_uid` lookups use typed `Map<string, PoLineItem>` — no index assumptions.
