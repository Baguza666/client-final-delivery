# Invoicify — Project Reference

> Single source of truth for everything we know about this project: what it is, who it serves, what's built, what's next, and how it's wired together.
> Last updated: 2026-05-07.

---

## 1. What we sell

**Invoicify** — a modern, French-language invoicing & business document SaaS for Moroccan and Francophone small businesses.

- **Tagline (hero):** *"Créez des factures professionnelles en quelques secondes"*
- **Sub:** *"Devis, factures, bons de commande et livraison — tout en un. Générez des PDF A4 impeccables et envoyez-les directement par email à vos clients."*
- **Positioning chip:** *"Facturation Marocaine Moderne · Version 1.0"*
- **Primary CTA:** *Commencer gratuitement* / *Créer un compte gratuit*
- **Trust signals on landing page:**
  - Gratuit pour démarrer
  - Aucune carte requise
  - PDF A4 professionnel

The product covers the full commercial cycle: **Quote (Devis) → Purchase Order (Bon de Commande) → Delivery Note (Bon de Livraison) → Invoice (Facture) → Payment / Debt tracking**, with a financial dashboard on top.

---

## 2. Audience

- **Geography:** Morocco-first; broader Francophone SMB market.
- **Industry:** Service businesses, freelancers, agencies, small SARLs.
- **Language:** UI is **100% French**. No i18n framework yet; copy is hardcoded.
- **Default currency:** **MAD (DH)**. Multi-currency supported (MAD / EUR / USD).
- **Compliance fields exposed in product:** ICE, IF (Identifiant Fiscal), RC (Registre de Commerce), CNSS, TP (Taxe Professionnelle), RIB. These are stored on `workspaces`, surfacing legal requirements specific to Moroccan businesses.

---

## 3. Branding & design system

### Colors (`tailwind.config.ts`)

| Token | Hex | Use |
|---|---|---|
| `primary` | `#6366F1` (indigo) | Buttons, links, accents |
| `primary-dark` | `#4F46E5` | Button hover |
| `primary-light` | `#818CF8` | Subtle highlights |
| `accent` | `#8B5CF6` (purple) | Secondary accent |
| `accent-dark` | `#7C3AED` | Hover |
| `surface-canvas` | `#020617` (near-black) | Body / app background |
| `surface-sidebar` | `#0F172A` | Sidebar |
| `surface-card` | `rgba(255,255,255,0.025)` | Glass cards |
| `surface-elevated` | `rgba(255,255,255,0.05)` | Hover state |
| `status-paid` | `#10B981` | Paid invoices |
| `status-pending` | `#F59E0B` | Pending |
| `status-overdue` | `#EF4444` | Overdue |
| `status-draft` | `#71717A` | Draft |

### Signature elements

- **Brand gradient:** `linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)` (used in headlines and graphics).
- **Glow shadows:** `glow` (`0 0 24px rgba(99,102,241,0.35)`), `glow-sm`, `glow-card`. Buttons and CTA sections light up.
- **Ambient orbs:** large blurred primary/accent radial glows behind hero & dashboard sections.
- **Glass morphism:** translucent cards (`bg-white/[0.025]`) on the dark canvas.
- **Logo:** `/public/invoicify-logo.png`, favicon `/public/invoicify-favicon.png`.

### Typography

- Sans: `var(--font-inter)`
- Mono: `var(--font-mono)`
- Heading: `var(--font-heading)` → falls back to Inter

### Layout tokens

- Sidebar width: **260px** expanded, **64px** collapsed
- Topbar: **56px**
- Bottom nav (mobile): **64px**

---

## 4. Tech stack (exact versions, `package.json`)

### Runtime
- **Next.js** `^15.1.0` (App Router, Server Actions, `use server`)
- **React** `^19.0.0` / **react-dom** `^19.0.0`
- **TypeScript** `^5.3.3`
- **Node types** `^20.10.0`

### Database & auth
- **Supabase SSR** `@supabase/ssr ^0.8.0`
- **Supabase JS** `@supabase/supabase-js ^2.48.0`
- Postgres + RLS policies (see `invoicify_baseline_schema.sql`)

### Styling
- **Tailwind CSS** `^3.4.1`
- **PostCSS** `^8.4.33` / autoprefixer `^10.4.16`
- `clsx ^2.1.1`, `tailwind-merge ^2.2.0`
- `lucide-react ^0.300.0` (icons)

### PDF & email
- **Puppeteer** `^24.42.0` — A4 PDF generation
- **Nodemailer** `^6.9.8` — SMTP path (per-workspace SMTP creds)
- **Resend** `^6.12.2` — fallback / transactional path

### AI
- `@ai-sdk/openai ^3.0.53`
- `@ai-sdk/google ^3.0.67`
- `@ai-sdk/react ^3.0.170`
- `ai ^6.0.168`
- `tesseract.js ^7.0.0` (OCR — currently unused in shipped code; reserved for receipt OCR)

### Infra & misc
- **Upstash Redis** `^1.37.0` + **Upstash Ratelimit** `^2.0.8` (rate limiting)
- **Recharts** `^2.15.4` (dashboard charts)
- **Zod** `^4.3.6` (validation)

---

## 5. Domain model

Multi-tenant via **workspaces** (1 workspace per user, owner-scoped). Every business entity carries `workspace_id` and is gated by RLS policies that join through `workspaces.owner_id = auth.uid()`.

### Core tables (`invoicify_baseline_schema.sql`)
- `profiles` — 1:1 with `auth.users`, holds role
- `team_invitations` — admin-managed invites
- `workspaces` — company identity + Moroccan legal IDs (ICE / IF / RC / CNSS / TP / RIB)
- `workspace_settings` — per-workspace SMTP credentials, sender name
- `clients` — customers, supports type field for vendor/client distinction
- `invoices` + `invoice_items`
- `quotes` + `quote_items`
- `purchase_orders` (BC) + `purchase_order_items`
- `delivery_notes` (BL) + `delivery_note_items`
- `expenses` — categorized, with optional proof URL & recurrence
- `debts` — payment-installment tracking with progress %
- `products` — reusable catalog items
- `payments` — implied through `payDebtInstallment` and invoice status
- Reconciliation tables (per `reconciliation` route + actions)

### Document numbering
Centralized in `src/lib/document-numbering.ts` (`generateNextNumber`). Format: `{PREFIX}-{YEAR}-{0001}`.
Prefixes: `INV` (invoices), `BL` (delivery notes), `BC` / `PO` (purchase orders).

### Document linkage
- `quote → purchase_order → delivery_note → invoice` chain; conversion is atomic via `convertQuoteToDocuments` and `acceptQuote` in `src/app/actions/convert.ts`.
- Items are joined by `line_uid` (UUID-stable), not array index — fragility fix from Phase 1.

---

## 6. Architecture

### Folder map

```
src/
  app/
    actions/                 ← 20 server-action files
    api/                     ← REST routes (PDF render, AI, etc.)
    auth/, login/, register/, forgot-password/, reset-password/
    dashboard/               ← /dashboard route
    clients/, invoices/, quotes/
    purchase-orders/, delivery-notes/
    expenses/, products/, reports/, reconciliation/
    settings/                ← workspace + SMTP config
    view/                    ← public share links
    page.tsx                 ← marketing landing page
    layout.tsx, globals.css, print.css
  components/
    AppShell.tsx, Sidebar.tsx, BottomNav.tsx, OnboardingModal.tsx
    chat/                    ← AI chat surface (uses @ai-sdk/react)
    dashboard/, invoices/, quotes/, clients/, products/
    delivery-notes/, purchase-orders/, expenses/, reports/
    documents/, reconciliation/, settings/, ui/
  lib/
    action-wrapper.ts        ← withWorkspace HOF (security boundary)
    dashboard-helpers.ts     ← pure aggregation fns + types
    document-numbering.ts    ← generateNextNumber
    document-types.ts        ← DocumentLineItem + variants
    document-templates.ts
    pdf-generator.ts         ← Puppeteer A4 renderer
    rate-limit.ts            ← Upstash limiter
    workspace.ts             ← getOrCreateWorkspace
public/
  invoicify-logo.png, invoicify-favicon.png
docs/
  superpowers/plans/...      ← refactor plans
middleware.ts                ← auth + redirect middleware
next.config.ts, tailwind.config.ts, eslint.config.mjs
invoicify_baseline_schema.sql
supabase_migration_multicurrency.sql
supabase_migration_security_fixes.sql
AI_INTEGRATION_PLAN.md
```

### Server actions: `src/app/actions/`

20 files, each exporting Next.js Server Actions (`'use server'`):

```
admin.ts            ai-actions.ts       clients.ts          convert.ts
createQuote.ts      dashboard.ts        deliveryNotes.ts    documentActions.ts
email.ts            expenses.ts         financeActions.ts   invoices.ts
payments.ts         products.ts         purchaseOrders.ts   reconciliation.ts
sendEmail.ts        settings.ts         shareLinks.ts       workspace.ts
```

### `withWorkspace` HOF — the security backbone

`src/lib/action-wrapper.ts` exposes:

```ts
withWorkspace(handler: ({ supabase, user, workspaceId }) => Promise<T>)
```

Every action that mutates tenant data is wrapped. Authentication, workspace resolution, and IDOR-safe scoping happen once, in one place. **Removed** ~12 lines of repeated boilerplate per file × 7 files. Eliminated the `workspace_id: quote.workspace_id` IDOR risk in `convertQuoteToDocuments`.

**Exempt:** `getDashboardStats` (read-only, must render before auth resolves with empty state).

### Data flow

1. Form submitted → Server Action invoked
2. `withWorkspace` resolves session + workspace
3. Action queries Supabase scoped to `workspace_id`
4. RLS double-checks at DB level
5. `revalidatePath` invalidates affected routes
6. UI re-renders with fresh data

### PDF pipeline

Puppeteer renders an HTML template (`document-templates.ts`) → A4 PDF buffer → response stream. Used for invoices, quotes, BL, BC. Marketed promise: **"PDF généré — 0.8s"**.

### Email pipeline

Two paths:
- **Per-workspace SMTP** via Nodemailer (creds stored in `workspace_settings`)
- **Resend** as fallback / transactional default

---

## 7. Features shipped

### Marketing surface (`src/app/page.tsx`)
- Hero + glowing mockup of a sample invoice (FACTURE INV-2024-0042, Casablanca → Rabat)
- 4 primary feature cards: PDF A4, email dispatch, dashboard, secure share links
- 3 secondary cards: data security, multi-currency, speed
- CTA band → `/login`
- Footer with `Mentions légales`

### App surface

| Route | Feature |
|---|---|
| `/dashboard` | KPIs (revenue, expenses, treasury, pending, debt), revenue chart, top clients, expense breakdown by category, reminders, recent invoices |
| `/clients` | CRUD + bulk delete |
| `/invoices` | CRUD, send via email, mark paid, recurring templates, overdue reminders |
| `/quotes` | CRUD, convert to invoice/BL/BC chain |
| `/purchase-orders` | CRUD |
| `/delivery-notes` | CRUD |
| `/expenses` | CRUD, categories, recurrence, debt installments |
| `/products` | Catalog |
| `/reports` | Financial reports |
| `/reconciliation` | Bank reconciliation |
| `/settings` | Workspace identity, legal IDs, SMTP, logo, signature |
| `/view/[token]` | Public, share-link document viewer |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth flows |
| `/unauthorized` | 403 / legal placeholder |
| `chat/` components | AI assistant (uses `@ai-sdk/react`) |

### Capabilities
- A4 PDF generation in <1s
- Email send with PDF attachment (per-workspace SMTP or Resend)
- Multi-currency (MAD / EUR / USD) with FX rate config
- Recurring invoices (template → schedule)
- Debt tracking with monthly installments and progress %
- Public share links for client-side document viewing
- Onboarding modal for first-time users
- Mobile-responsive (sidebar collapses, bottom nav appears)

### Security (currently in place)
- RLS policies on every tenant table
- `withWorkspace` HOF prevents IDOR
- Upstash rate-limiting (`src/lib/rate-limit.ts`)
- HTTP security headers in `next.config.ts` (CSP, HSTS, etc.)

---

## 8. What we've done — refactor history

### 4-phase architectural refactor (completed 2026-05-07)

Plan: `docs/superpowers/plans/2026-05-07-architectural-refactoring.md`

| Phase | Goal | Outcome |
|---|---|---|
| **Phase 1** | Foundational abstractions | `generateNextNumber` extracted to `src/lib/document-numbering.ts`; `DocumentLineItem` types added; fragile `poItems[idx]` → `Map<line_uid>` lookup |
| **Phase 2** | Workflow consolidation | `acceptQuote.ts` merged into `convert.ts`; `finance.ts` merged into `financeActions.ts`; redundant files deleted |
| **Phase 3** | Dashboard decoupling | 5 pure helpers extracted from `getDashboardStats`: `aggregateDebt`, `buildReminders`, `bucketExpensesByCategory`, `aggregateRevenueByMonth`, `findTopClients`. Then split out to `src/lib/dashboard-helpers.ts` to satisfy Next.js 15 `use server` constraint (no non-async exports). |
| **Phase 4** | IDOR security wrapper | `withWorkspace` HOF created and applied to `clients.ts`, `createQuote.ts`, `deliveryNotes.ts`, `purchaseOrders.ts`, `convert.ts`, `financeActions.ts`, `invoices.ts`. Fixed `workspace_id: quote.workspace_id` IDOR bug. Replaced `formData: any` with `ExpenseInput`. Removed caller-side `workspace_id` leak from `AddExpenseModal.tsx`. |

Type-check gate (`npx tsc --noEmit`) passed at the end of every phase.

### Recent commits (head)
```
26d7e58 refactor: move dashboard helpers and types to lib module
ba5855c refactor(phase4): apply withWorkspace to convert, financeActions, invoices; fix workspace_id bug
0447551 refactor(phase4): apply withWorkspace to clients, createQuote, deliveryNotes, purchaseOrders
fcc8460 feat(phase4): create withWorkspace HOF for secure action context
95e0cc3 refactor(phase3): extract dashboard aggregation helpers
```

### Currently uncommitted (working tree)
```
M src/components/dashboard/DashboardUI.tsx
M src/components/dashboard/ExpenseCategoryCard.tsx
M src/components/dashboard/KpiCard.tsx
M src/components/dashboard/RecentInvoicesTable.tsx
M src/components/dashboard/TrendChartCard.tsx
?? docs/superpowers/plans/2026-05-07-architectural-refactoring.md
```

These are dashboard polish edits (background unification, removal of hardcoded `bg-zinc-950`) that follow the lib-extraction commit. The refactor plan doc is also untracked.

---

## 9. What's next

### Immediate
- **Run `next build`** to confirm production compilation after the dashboard helper extraction.
- **Browser smoke test** the dashboard: ambient glows, sidebar inheritance, KPI rendering.
- **Commit** the 5 modified dashboard components and the plan doc.

### Near-term gaps to close
- **Pricing / monetization**: no Stripe, no subscription tier, no trial logic. Landing page advertises "free to start" but there is no paid plan path.
- **i18n**: French-only, hardcoded strings. Adding EN would require a framework (next-intl).
- **Tests**: zero test files. Unit tests for the 5 pure dashboard helpers + the `withWorkspace` HOF would be the highest-leverage addition.
- **Migrations**: SQL files at repo root (`invoicify_baseline_schema.sql`, two migration patches) but **no `supabase/migrations/` versioned folder**. Schema drift risk.
- **CI/CD**: no `.github/workflows`. No automated build/lint/typecheck on PR.
- **`.env.example`** missing — onboarding new devs requires reverse-engineering env vars from code.
- **`tsc` strict gate**: `next.config.ts` has `ignoreBuildErrors: true` (per audit) — TypeScript errors do not fail the build today.
- **Unused dependency**: `tesseract.js` is installed but not referenced in shipped code.

### Strategic / product
- **AI assistant** (`chat/` + `ai-actions.ts` + `AI_INTEGRATION_PLAN.md`) is partially scaffolded — formal eval & integration plan exists; needs execution.
- **Receipt OCR** is a likely next AI feature given `tesseract.js` already in deps.
- Bank reconciliation route exists; depth of feature unclear — candidate for productization.

---

## 10. What success looks like

The repo and landing page imply (no formal PRD found, success criteria inferred):

### Product success
- A Moroccan SMB owner can sign up free, configure their workspace once (legal IDs, logo, SMTP), and emit a professional, legally-compliant **PDF A4 invoice** within minutes.
- The full commercial chain (devis → BC → BL → facture) can be executed without ever leaving the app.
- Clients receive professionally branded emails and can self-serve via share links.

### Engineering success
- **Zero IDOR exposure**: every tenant query passes through `withWorkspace` + RLS.
- **Zero type-`any` in critical paths**: enforced through Phase 4 typed `ExpenseInput`.
- **Sub-second PDF**: marketing claim "PDF généré — 0.8s" is the perf target.
- **Atomic commits per phase**: refactor discipline is codified in the workflow.

### Business success (inferred — not yet wired in code)
- Free tier acquires Moroccan freelancers/SMBs.
- Paid tier (not implemented) gates features like multi-user, unlimited invoices, advanced reports, AI assistant.
- Geographic anchor: Morocco-first, with adjacent Francophone markets (Tunisia, Algeria, Senegal, etc.) as natural expansion.

---

## 11. Operational reference

### Local dev
```bash
npm run dev          # next dev
npm run build        # next build
npm run start        # next start
npm run lint         # eslint
npm run clean        # rm -rf .next node_modules/.cache
```

### Required env vars (referenced in code)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase service role key (server-only)
- SMTP creds (or stored per workspace)
- Resend API key
- Upstash Redis URL + token
- AI provider keys (OpenAI / Google) for `@ai-sdk/*`

### Deployment
- Inferred **Vercel** target (Next.js native, no custom Docker / netlify config found).
- Puppeteer in serverless requires Chromium binary handling — verify Vercel-compatible setup before launch.

### Files to read first when onboarding
1. `src/app/page.tsx` — what we sell
2. `tailwind.config.ts` — design language
3. `src/lib/action-wrapper.ts` — security boundary
4. `src/app/actions/convert.ts` — core business workflow
5. `src/lib/dashboard-helpers.ts` — data aggregation patterns
6. `invoicify_baseline_schema.sql` — full domain model + RLS

---

*This document is the project's living context. Update it whenever a phase completes, a major feature ships, or the business positioning shifts.*
