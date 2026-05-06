# AI Integration Plan — Invoicify Assistant

## 1. Historical Failure Analysis

### 1.1 Frontend Freezing (`@ai-sdk/react` hydration errors)
**Root cause:** `useChat` was mounted at the app/layout level, creating a mismatch between the server-rendered HTML and the client-side hook state. React hydration fails when a hook that manages streaming state is initialized on the server.
**Fix:** Mount `useChat` exclusively inside the `{isOpen && <ChatWidget />}` conditional, which is already below a `"use client"` boundary. The hook never runs during SSR.

### 1.2 Silent Backend Hangs
**Root cause:** Unhandled promise rejections inside `tool.execute()` functions were swallowed by the `streamText` internals, leaving the stream open and the client in a permanent loading state.
**Fix:** Every `execute()` body is wrapped in `try/catch` returning `{ error: string }` — never throwing. The `onError` callback on both `streamText` and `toUIMessageStreamResponse` surfaces errors as visible stream events. No silent swallowing anywhere.

### 1.3 Supabase Context Loss
**Root cause:** Tools attempted to re-create the Supabase client inside their own scope, after the request cookies were no longer accessible.
**Fix:** `supabase` and `workspaceId` are resolved once at the top of the `POST` handler and captured in the tool closure. Tools never re-authenticate — they inherit the already-validated context.

### 1.4 TypeScript / ESLint Cascades
**Root cause:** Generated code used `any` types and imported from paths that did not match the project's strict ESLint config.
**Fix:** All tool input schemas defined with Zod. No `any` types anywhere in AI-related files. A clean `tsc --noEmit` run is the mandatory exit criterion for Phase 0 before any AI code is written.

---

## 2. Architecture Decision: Vercel AI SDK v6 (retained)

The current codebase already uses `ai@^6`, `@ai-sdk/openai@^3`, and `@ai-sdk/react@^3`. The backend speaks the UI message stream protocol via `toUIMessageStreamResponse`, and the frontend input is already decoupled from the hook via `useState`.

**Decision: Keep the Vercel AI SDK.** The previous failures were mount-location and error-handling bugs, not SDK bugs. Replacing the SDK with a custom SSE reader would add ~200 lines of untested stream-parsing and accumulation logic with no benefit.

**One strict rule:** `useChat` is only ever instantiated inside the `ChatWidget` component body, which renders conditionally. It is never hoisted to a layout, provider, or page component.

---

## 3. Complete Tool Surface

### 3.1 Existing Read Tools (retained, no changes)
| Tool | Description |
|---|---|
| `getDashboardStats` | Revenue, pending invoices, client count |
| `getClients` | Full client list (used for browsing, not resolution) |
| `getRecentInvoices` | Last N invoices with status |

### 3.2 New Read Tool
| Tool | Input | Output |
|---|---|---|
| `findClient` | `{ name: string }` | `{ clients: Client[] }` — partial, case-insensitive match |

The model uses `findClient` to resolve a client name to a UUID before proposing an invoice. If multiple matches are returned, the model asks for clarification. If zero matches, it offers to create the client first.

### 3.3 New Write Tools — A1 Two-Tool Pattern

Every write action is split into a **proposal tool** (reads only, returns preview) and a **confirmation tool** (writes to DB, re-validates workspace).

The system prompt contains a hard instruction: **"NEVER call a `confirm*` tool unless the user's most recent message explicitly contains an affirmative confirmation (yes / oui / confirme / ok / d'accord). If in doubt, call the `propose*` tool again."**

#### Create Client
| Tool | Input | Behavior |
|---|---|---|
| `proposeCreateClient` | `{ name, email?, phone?, address?, city?, ice? }` | Returns structured preview. No DB write. |
| `confirmCreateClient` | same fields | Inserts into `clients`. Re-validates `workspace_id`. Returns new client with UUID. |

#### Mark Invoice as Paid
| Tool | Input | Behavior |
|---|---|---|
| `proposeMarkPaid` | `{ invoice_number: string }` | Fetches invoice, returns `{ id, invoice_number, client_name, total_ttc, current_status }`. No DB write. |
| `confirmMarkPaid` | `{ invoice_id: string }` | Updates `invoices.status = 'paid'`. Re-validates workspace ownership. |

#### Create Invoice
| Tool | Input | Behavior |
|---|---|---|
| `proposeInvoice` | `{ client_id, items: Item[], due_date?, currency?, discount? }` | Calculates totals, returns full preview. No DB write. |
| `confirmCreateInvoice` | same fields | Inserts invoice + invoice_items. Re-validates workspace. Returns new invoice number. |

```typescript
// Item schema (no any)
const ItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  tva_rate: z.number().min(0).max(100).default(20),
});
```

**TVA default:** 20%. Model only asks for a different rate if the user explicitly mentions one.

**Line item collection (L2):** Model asks the user to describe all items in one message ("e.g.: *Consulting 10h × 500 MAD, Frais de déplacement × 1 × 800 MAD*"). Model parses the natural language into the `Item[]` array. If parsing produces zero items or ambiguous quantities, model asks one targeted follow-up.

---

## 4. Supabase Context Protocol

**Rule: authenticate once, pass everywhere.**

```typescript
// TOP of POST handler — resolved before any tool is defined
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return new Response('Unauthorized', { status: 401 });

const workspaceId = await getOrCreateWorkspace(supabase, user.id);

// All tools close over supabase + workspaceId — never re-authenticate inside a tool
```

Every `confirm*` tool performs an independent ownership check before writing:

```typescript
// Inside confirmCreateInvoice.execute()
const { data: ws } = await supabase
  .from('workspaces')
  .select('id')
  .eq('id', workspaceId)
  .eq('owner_id', user.id)
  .single();
if (!ws) return { error: 'Workspace ownership validation failed' };
```

This ensures that even if the model passes a crafted `workspaceId`, the write is rejected server-side.

---

## 5. Error Boundary Strategy

**Rule: zero silent failures. Every error surfaces as visible UI text.**

### 5.1 Tool-level (innermost boundary)
```typescript
execute: async (input) => {
  try {
    // ... logic
    return { success: true, data: ... };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[tool:toolName] threw:', message);
    return { error: message }; // model receives this and relays it to the user
  }
}
```

### 5.2 Stream-level (middle boundary)
```typescript
const result = streamText({
  // ...
  onError: ({ error }) => {
    console.error('[chat] streamText error:', error);
  },
});

return result.toUIMessageStreamResponse({
  onError: (error) => {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[chat] stream emit error:', msg);
    return `Erreur serveur: ${msg}`; // streamed as text to frontend
  },
});
```

### 5.3 Route-level (outermost boundary)
```typescript
try {
  // entire handler
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown server error';
  console.error('[chat] top-level handler error:', message);
  return new Response(`Erreur serveur: ${message}`, { status: 500 });
}
```

### 5.4 Frontend-level
The `error` state from `useChat` is rendered as a visible error bubble in the chat UI. The input field `disabled={isLoading}` is the only AI-SDK-driven state on the input — the `value` and `onChange` remain on local `useState` throughout.

---

## 6. New Typed Server Actions Required

The existing `createInvoice` and `createClient` server actions accept `FormData`. The AI tools cannot use `FormData`. Two new typed wrapper actions are needed:

```typescript
// src/app/actions/ai-actions.ts
export async function createInvoiceFromAI(data: CreateInvoiceInput): Promise<{ invoiceId: string; invoiceNumber: string } | { error: string }>
export async function createClientFromAI(data: CreateClientInput): Promise<{ clientId: string; name: string } | { error: string }>
export async function markInvoicePaidFromAI(invoiceId: string, workspaceId: string): Promise<{ success: true } | { error: string }>
```

These actions re-use the same Supabase insert logic as the FormData versions but accept plain typed objects with Zod validation at the boundary.

---

## 7. Phased Execution Plan

### Phase 0 — Green TypeScript Baseline
**Goal:** `tsc --noEmit --incremental false` passes with zero errors.
**Tasks:**
1. Inspect `src/components/dashboard/DebtCard.tsx:15` — align `payDebtInstallment` call site with its 3-argument signature.
2. Run `tsc --noEmit --incremental false` and fix any other pre-existing errors.
**Exit criterion:** `tsc` exits 0. No errors.

### Phase 1 — Verify Existing Stream
**Goal:** The current read-only assistant works end-to-end with no regressions.
**Tasks:**
1. Confirm `ChatWidget` is mounted only inside `{isOpen && ...}` (already the case).
2. Manually test: "Combien de clients ai-je ?" → model calls `getClients` → returns count.
3. Manually test: "Montre-moi mes dernières factures" → model calls `getRecentInvoices` → returns list.
4. Confirm input field never freezes during streaming.
**Exit criterion:** All three existing tools return correct data. No hydration warnings in browser console.

### Phase 2 — Create Client Action
**Goal:** First write action working end-to-end with A1 confirm gate.
**Tasks:**
1. Add `createClientFromAI` typed server action.
2. Add `findClient` tool to `route.ts`.
3. Add `proposeCreateClient` + `confirmCreateClient` tools.
4. Update system prompt with confirm-gate instruction.
5. Test: "Crée un client nommé Test SARL, email test@sarl.ma" → proposal card shown → user types "oui" → client appears in Supabase.
6. Run `tsc --noEmit` — must exit 0.
**Exit criterion:** Client created in DB via conversation. Zero TS errors.

### Phase 3 — Mark Invoice as Paid
**Goal:** Financial write action with confirm gate.
**Tasks:**
1. Add `markInvoicePaidFromAI` typed server action.
2. Add `proposeMarkPaid` + `confirmMarkPaid` tools.
3. Test: "Marque la facture INV-2025-001 comme payée" → model calls `proposeMarkPaid` → shows invoice details → user confirms → status updated in Supabase.
4. Test error case: non-existent invoice number → model reports "Facture introuvable".
5. Run `tsc --noEmit` — must exit 0.
**Exit criterion:** Invoice status updated in DB. Error case handled visibly.

### Phase 4 — Create Invoice (Full Flow)
**Goal:** Most complex action: multi-turn collection, client resolution, line items, proposal, confirm.
**Tasks:**
1. Add `createInvoiceFromAI` typed server action.
2. Add `proposeInvoice` + `confirmCreateInvoice` tools with `ItemSchema`.
3. Test happy path: "Crée une facture pour Dupont SARL, consulting 10h × 500 MAD, échéance 30 juin" → model calls `findClient` → collects items → calls `proposeInvoice` → shows preview → user confirms → invoice in DB.
4. Test client-not-found path: unknown client name → model offers to create client first → chains Phase 2 flow → then creates invoice.
5. Test ambiguous items: model asks follow-up for missing quantity/price.
6. Run `tsc --noEmit` — must exit 0.
**Exit criterion:** Full invoice with line items created in DB. Client-not-found path handled. Zero TS errors.

---

## 8. Constraints (Non-Negotiable)

- **No `any` types.** All tool input/output typed via Zod schemas.
- **Input field never controlled by AI SDK.** `value={input}` and `onChange` always on local `useState`.
- **Every tool `execute()` wrapped in `try/catch`.** Returns `{ error: string }` on failure, never throws.
- **`confirm*` tools re-validate workspace ownership** server-side on every call, regardless of model-provided values.
- **System prompt hard constraint:** Model may not call `confirm*` tools without explicit user affirmation in the immediately preceding message.
- **`useChat` mounted conditionally only,** never in a layout or provider.
