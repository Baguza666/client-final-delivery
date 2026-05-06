# Security & Logic Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate cross-workspace IDOR data leaks, patch an open redirect in the auth callback, fix hardcoded TVA rates that ignore per-item values, and repair the TVA falsy bug that treats 0% as 20%.

**Architecture:** Every fix is surgical — no new abstractions, no file restructuring. The workspace-scoping pattern already used in `clients.ts` / `invoices.ts` is extended to the two remaining unguarded surfaces (`dashboard.ts`, the overdue-invoice queries). The TVA fixes replace four arithmetic expressions with per-item aggregations matching the pattern already correct in `createInvoice` / `updateInvoice`.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), TypeScript, `@supabase/ssr`.

---

## Pre-investigation Findings

| Claim in audit | Actual status |
|---|---|
| "Missing module `@/lib/workspace`" | **False.** File exists at `src/lib/workspace.ts`. `tsc --noEmit` passes with zero errors already. No action needed. |
| Sidebar non-existent routes | **False.** All routes (`/reports`, `/reconciliation`, `/invoices/recurring`, `/products`) have `page.tsx` files. No action needed. |
| Password reset 404 | **False.** `src/app/forgot-password/page.tsx` and `src/app/reset-password/page.tsx` both exist. No action needed. |

Three real issue categories remain:
1. **IDOR** — dashboard + overdue invoice queries missing `workspace_id` filter
2. **Open redirect** — `next` param in auth callback is unsanitized
3. **TVA bugs** — hardcoded 20% and falsy-coercion of 0% to 20%

---

## File Map

| File | What changes |
|---|---|
| `src/app/actions/dashboard.ts` | Add `getOrCreateWorkspace` call; scope all 4 DB queries to `workspace_id` |
| `src/app/actions/invoices.ts` | Scope `sendOverdueReminders` and `getOverdueInvoicesCount` queries; fix `buildInvoiceEmailHtml` TVA display |
| `src/app/auth/callback/route.ts` | Validate `next` param against internal-URL allowlist |
| `src/app/actions/purchaseOrders.ts` | Replace hardcoded `* 1.20` / `* 0.20` with per-item TVA aggregation |
| `src/app/actions/convert.ts` | Replace `totalHT_Net * 0.20` with per-item TVA aggregation; fix `|| 20` falsy bug |
| `src/app/actions/createQuote.ts` | Fix `|| 20` falsy bug → `?? 20` |

---

## Task 1: Patch Open Redirect in Auth Callback

**Files:**
- Modify: `src/app/auth/callback/route.ts:9`

The `next` query param is passed directly into `NextResponse.redirect()`. An attacker can craft `?next=//evil.com` or `?next=https://evil.com` to redirect victims after sign-in.

- [ ] **Step 1: Add the safe-redirect helper inline**

Open `src/app/auth/callback/route.ts`. Replace the `next` extraction line:

```ts
// Before (line 9):
const next = requestUrl.searchParams.get('next') ?? '/'
```

With:

```ts
function safeNext(raw: string | null): string {
    if (!raw) return '/dashboard'
    // Must be a relative path: starts with / but not // (protocol-relative)
    if (raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('://')) {
        return raw
    }
    return '/dashboard'
}
const next = safeNext(requestUrl.searchParams.get('next'))
```

- [ ] **Step 2: Verify `tsc --noEmit` still passes**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Manual smoke-test**

Start the dev server (`npm run dev`) and visit:
```
http://localhost:3000/auth/callback?next=//evil.com&code=<any>
```
If `code` exchange fails (expected in dev), check that the redirect goes to `/auth/auth-code-error`, not `//evil.com`. With a valid code it should land on `/dashboard`.

- [ ] **Step 4: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "security: validate auth callback 'next' param to prevent open redirect"
```

---

## Task 2: Fix Dashboard IDOR — Scope All Queries to Workspace

**Files:**
- Modify: `src/app/actions/dashboard.ts`

`getDashboardStats()` currently fetches invoices, expenses, debts, and clients with **no** `workspace_id` filter. Every authenticated user sees data from every workspace in the database.

- [ ] **Step 1: Add the workspace import**

At the top of `src/app/actions/dashboard.ts`, add the import (after the existing imports):

```ts
import { getOrCreateWorkspace } from '@/lib/workspace'
```

- [ ] **Step 2: Resolve the workspace before the parallel queries**

Replace the opening of `getDashboardStats()` (lines 75–88):

```ts
// Before:
export async function getDashboardStats(): Promise<DashboardData> {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } },
    )

    const [{ data: invoices }, { data: expenses }, { data: debts }, { data: clients }] = await Promise.all([
        supabase.from('invoices').select('*, client:clients(name)').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('debts').select('*'),
        supabase.from('clients').select('id'),
    ])
```

With:

```ts
export async function getDashboardStats(): Promise<DashboardData> {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } },
    )

    const { data: { user } } = await supabase.auth.getUser()
    const wsId = user ? await getOrCreateWorkspace(supabase, user.id).catch(() => null) : null

    const [{ data: invoices }, { data: expenses }, { data: debts }, { data: clients }] = await Promise.all([
        wsId
            ? supabase.from('invoices').select('*, client:clients(name)').eq('workspace_id', wsId).order('created_at', { ascending: false })
            : Promise.resolve({ data: [] }),
        wsId
            ? supabase.from('expenses').select('*').eq('workspace_id', wsId).order('date', { ascending: false })
            : Promise.resolve({ data: [] }),
        wsId
            ? supabase.from('debts').select('*').eq('workspace_id', wsId)
            : Promise.resolve({ data: [] }),
        wsId
            ? supabase.from('clients').select('id').eq('workspace_id', wsId)
            : Promise.resolve({ data: [] }),
    ])
```

- [ ] **Step 3: Verify `tsc --noEmit` still passes**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Verify the dashboard still loads correctly in the browser**

Navigate to `http://localhost:3000/dashboard` while signed in. All KPI cards, charts, and reminders should render with your own data only.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/dashboard.ts
git commit -m "security: scope dashboard queries to authenticated user's workspace (IDOR fix)"
```

---

## Task 3: Fix Overdue Invoice IDOR — Scope to Workspace

**Files:**
- Modify: `src/app/actions/invoices.ts` lines 573–578 and 612–623

`sendOverdueReminders()` resolves `wsId` but never uses it in the DB query, so it iterates over every overdue invoice in the entire database and sends emails. `getOverdueInvoicesCount()` doesn't even resolve the workspace.

- [ ] **Step 1: Fix `sendOverdueReminders` — add workspace filter**

Find this block inside `sendOverdueReminders` (around line 573):

```ts
    const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('*, client:clients(*)')
        .in('status', ['sent', 'partial', 'pending', 'en_attente'])
        .not('due_date', 'is', null)
        .lt('due_date', today.toISOString().split('T')[0])
```

Replace with:

```ts
    const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('*, client:clients(*)')
        .eq('workspace_id', wsId)
        .in('status', ['sent', 'partial', 'pending', 'en_attente'])
        .not('due_date', 'is', null)
        .lt('due_date', today.toISOString().split('T')[0])
```

- [ ] **Step 2: Fix `getOverdueInvoicesCount` — add workspace resolution and filter**

Find the full function (around lines 612–623):

```ts
export async function getOverdueInvoicesCount(): Promise<number> {
    const supabase = await createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .in('status', ['sent', 'partial', 'pending', 'en_attente'])
        .not('due_date', 'is', null)
        .lt('due_date', today.toISOString().split('T')[0])
    return count || 0
}
```

Replace with:

```ts
export async function getOverdueInvoicesCount(): Promise<number> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0
    const wsId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!wsId) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', wsId)
        .in('status', ['sent', 'partial', 'pending', 'en_attente'])
        .not('due_date', 'is', null)
        .lt('due_date', today.toISOString().split('T')[0])
    return count || 0
}
```

- [ ] **Step 3: Verify `tsc --noEmit` still passes**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/invoices.ts
git commit -m "security: scope overdue invoice queries to authenticated workspace (IDOR fix)"
```

---

## Task 4: Fix TVA Falsy Bug in createQuote and convert

**Files:**
- Modify: `src/app/actions/createQuote.ts:78`
- Modify: `src/app/actions/convert.ts:88`

`Number(item.tva_rate) || 20` coerces `0` (zero-rated items) to `20`. `??` is the correct null-coalescing operator here — it only falls back on `null` / `undefined`, not `0`.

- [ ] **Step 1: Fix `createQuote.ts`**

Find line 78:

```ts
            tva_rate: Number(item.tva_rate) || 20,
```

Replace with:

```ts
            tva_rate: item.tva_rate != null ? Number(item.tva_rate) : 20,
```

- [ ] **Step 2: Fix `convert.ts` invoice items (line ~88)**

Find the identical pattern in `convertQuoteToInvoice`:

```ts
            tva_rate: Number(item.tva_rate) || 20,
```

Replace with:

```ts
            tva_rate: item.tva_rate != null ? Number(item.tva_rate) : 20,
```

- [ ] **Step 3: Verify `tsc --noEmit` still passes**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/createQuote.ts src/app/actions/convert.ts
git commit -m "fix: use null-check instead of falsy-check for tva_rate to preserve 0% items"
```

---

## Task 5: Fix Hardcoded TVA in Purchase Orders

**Files:**
- Modify: `src/app/actions/purchaseOrders.ts:53–54` and `101–103`

`createPurchaseOrder` uses `totalHT * 1.20` and `updatePurchaseOrder` uses `totalHT * 0.20` — both ignore per-item `tva_rate`. Purchase order items do have a `tva_rate` field that should drive the calculation.

- [ ] **Step 1: Fix `createPurchaseOrder` (around line 53)**

Find:

```ts
    const totalHT = items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
    const totalTTC = totalHT * 1.20
```

Replace with:

```ts
    const totalHT = items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
    const totalTVA = items.reduce((sum, item) => {
        const lineHT = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
        const rate = item.tva_rate != null ? Number(item.tva_rate) : 20
        return sum + lineHT * (rate / 100)
    }, 0)
    const totalTTC = totalHT + totalTVA
```

- [ ] **Step 2: Fix `updatePurchaseOrder` (around line 101)**

Find:

```ts
    const totalHT = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
    const totalTVA = totalHT * 0.20
    const totalTTC = totalHT + totalTVA
```

Replace with:

```ts
    const totalHT = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
    const totalTVA = items.reduce((sum: number, item: any) => {
        const lineHT = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
        const rate = item.tva_rate != null ? Number(item.tva_rate) : 20
        return sum + lineHT * (rate / 100)
    }, 0)
    const totalTTC = totalHT + totalTVA
```

- [ ] **Step 3: Verify `tsc --noEmit` still passes**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/purchaseOrders.ts
git commit -m "fix: use per-item tva_rate in purchase order totals instead of hardcoded 20%"
```

---

## Task 6: Fix Hardcoded TVA in Quote-to-Invoice Conversion

**Files:**
- Modify: `src/app/actions/convert.ts:51–56`

`convertQuoteToInvoice` uses `totalHT_Net * 0.20` to compute TVA for the new invoice header totals, ignoring per-item rates. The individual `invoice_items` rows do carry the right `tva_rate`, but the `invoices` table header (`total_tva`, `total_ttc`) will be wrong for any non-20% items.

- [ ] **Step 1: Replace aggregate TVA calculation in `convertQuoteToInvoice`**

Find (around lines 51–56 in `convert.ts`):

```ts
        const items = quote.quote_items || []
        const totalHT_Gross = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
        const discount = quote.discount || 0
        const discountAmount = totalHT_Gross * (discount / 100)
        const totalHT_Net = totalHT_Gross - discountAmount
        const totalTVA = totalHT_Net * 0.20
        const totalTTC = totalHT_Net + totalTVA
```

Replace with:

```ts
        const items = quote.quote_items || []
        const totalHT_Gross = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
        const discount = quote.discount || 0
        const discountRatio = totalHT_Gross > 0 ? (1 - discount / 100) : 1
        const totalHT_Net = totalHT_Gross * discountRatio
        const totalTVA = items.reduce((sum: number, item: any) => {
            const lineHT = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0) * discountRatio
            const rate = item.tva_rate != null ? Number(item.tva_rate) : 20
            return sum + lineHT * (rate / 100)
        }, 0)
        const totalTTC = totalHT_Net + totalTVA
```

- [ ] **Step 2: Verify `tsc --noEmit` still passes**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/convert.ts
git commit -m "fix: use per-item tva_rate in quote-to-invoice conversion totals"
```

---

## Task 7: Fix Hardcoded TVA in Invoice Email Display

**Files:**
- Modify: `src/app/actions/invoices.ts` — `buildInvoiceEmailHtml` function (line ~278–378)

The email builder computes `const tva = netHT * 0.20` and `TVA (20%)` label, ignoring the actual per-item rates stored in `invoice_items`. The items array is available to this function.

- [ ] **Step 1: Fix the TVA calculation in `buildInvoiceEmailHtml`**

Find the top of the function body (around line 279):

```ts
function buildInvoiceEmailHtml(invoice: any, items: any[], ws: any, client: any) {
    const totalHT = items.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0)
    const discount = invoice.discount || 0
    const discountAmt = totalHT * (discount / 100)
    const netHT = totalHT - discountAmt
    const tva = netHT * 0.20
    const ttc = netHT + tva
```

Replace with:

```ts
function buildInvoiceEmailHtml(invoice: any, items: any[], ws: any, client: any) {
    const totalHT = items.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0)
    const discount = invoice.discount || 0
    const discountRatio = totalHT > 0 ? (1 - discount / 100) : 1
    const discountAmt = totalHT * (discount / 100)
    const netHT = totalHT - discountAmt
    const tva = items.reduce((s: number, i: any) => {
        const lineHT = (Number(i.total) || 0) * discountRatio
        const rate = i.tva_rate != null ? Number(i.tva_rate) : 20
        return s + lineHT * (rate / 100)
    }, 0)
    const ttc = netHT + tva
```

- [ ] **Step 2: Update the TVA row label in the HTML to be dynamic**

Find the hardcoded label string `TVA (20%)` in the totals table HTML (around line 357):

```ts
      <tr><td style="padding:6px 8px;font-size:12px;color:#374151;text-align:right;border-top:1px solid #e5e7eb">TVA (20%)</td>
```

Replace with (compute a display rate):

```ts
      <tr><td style="padding:6px 8px;font-size:12px;color:#374151;text-align:right;border-top:1px solid #e5e7eb">TVA</td>
```

(The precise rate per-item varies, so removing the hardcoded percentage is more honest than picking an arbitrary one.)

- [ ] **Step 3: Verify `tsc --noEmit` still passes**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Test email display**

Navigate to any invoice detail page and use the "Send by email" button. Check the email preview / received email: TVA total should reflect the actual item rates, not always 20%.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/invoices.ts
git commit -m "fix: invoice email uses per-item tva_rate instead of hardcoded 20%"
```

---

## Final Validation

- [ ] **Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero output (zero errors).

- [ ] **IDOR cross-workspace test**

  1. Create two accounts (Workspace A, Workspace B) — use two browser profiles or incognito.
  2. In Workspace A, create an invoice.
  3. Logged in as Workspace B, open the browser Network tab and call `getDashboardStats` / visit `/dashboard`. Verify Workspace A's invoice does NOT appear.
  4. Attempt to call `deleteInvoice(<workspace-A-invoice-id>)` from Workspace B's session. Verify it returns `{ error: 'Espace de travail introuvable.' }` or silently deletes nothing (the `.eq('workspace_id', workspaceId)` guard means the query matches 0 rows).

- [ ] **Zero-TVA test**

  1. Create a quote with an item where TVA is set to 0%.
  2. Convert it to an invoice.
  3. Verify the invoice `total_tva` is `0` and `total_ttc === total_ht`.

- [ ] **Open redirect test**

  Visit `http://localhost:3000/auth/callback?next=//evil.com`. Confirm redirect goes to `/dashboard` or `/auth/auth-code-error`, never to `//evil.com`.
