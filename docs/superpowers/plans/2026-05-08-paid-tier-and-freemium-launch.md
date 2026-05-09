# Paid Tier & Freemium Launch — Implementation Plan (v2, post-grill)

> **Status:** All structural decisions locked through 26-question grilling session on 2026-05-08. Original plan superseded. Remaining work is execution against this spec.

**Goal:** Ship a freemium model with one Pro tier and one Business tier, no trial (free tier IS the upgrade gate), DGI-compliance-ready invoice schema, monthly-default billing with annual upsell, "Founding Customer" 30%-forever pricing for wishlist signups, customer-facing auto-issued Moroccan factures, two-tier dunning, and tiered downgrade UX with read-only historical access — all in a focused execution sprint.

**Non-goal:** Full DGI e-invoicing integration (UBL 2.1 + electronic signature + DGI clearance API). Implementing decree not yet published as of Q1 2026; we architect *for* it but defer integration. See Phase 7.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (SSR), Lemon Squeezy (MoR), `next/cache` revalidatePath. Cloudflare Turnstile already integrated for wishlist; reused for signup anti-abuse.

**Total LOC estimate:** ~5,000 new + ~700 modified across 8 phases. **Engineering time at 24/7 AI pair-coding pace:** 7–12 days realistic. Phase 5 (Lemon Squeezy webhook + dunning state machine) is the longest tail.

---

## Pre-Launch Action Items (Block Code)

These must complete before Phase 5 begins. Do them now in parallel with Phases 1–2:

1. **Lemon Squeezy MAD display verification (10 min).** Sign up at lemonsqueezy.com → create test product → check display-currency dropdown. If `MAD` listed: lock branch A (charge in MAD natively). If not: lock branch B (charge in USD, display MAD on `/pricing` with disclaimer "Paiement traité en USD via Lemon Squeezy. Frais bancaires possibles selon votre banque."). All Phase 4 + 5 copy depends on this answer.

2. **Hire Moroccan comptable for Sage 100 export validation (~500–1,000 MAD, 1–2 day lead time).** Brief: "Voici 5 fichiers exports test au format Sage 100. Importez dans votre Sage 100 et reportez les erreurs." Use freelance platforms (LaSouk.ma, Bayt, your network). Output: list of format errors + corrected mapping spec. Block Phase 6 (Business-tier accountant export) until comptable feedback lands.

3. **WhatsApp Business account setup.** Register a Moroccan number (+212), configure quick replies for: tarifs, annulation, remboursement, mot de passe, code FOUNDER30, factures comptables. Set greeting + away message. ~1–2 hours.

4. **SARL conversion planning.** Auto-entrepreneur revenue cap is 500K MAD/yr. Schedule SARL conversion at 350K MAD ARR threshold (gives 3-month runway). Engage comptable now for paperwork timeline; cost ~5,000–15,000 MAD setup. Don't wait until cap forces it.

---

## Locked Strategic Decisions

### 1. Tier Structure

| Tier | Price (MAD) | Annual (MAD) | Annual Cadence Discount | Volume Cap | Key Locks |
|---|---|---|---|---|---|
| **Gratuit** | 0 | — | — | 10 invoices/mo | Watermark, no quotes/POs/expenses/reports/AI/reconciliation |
| **Pro** | 99/mo | 950/yr | 20% (3 months free) | unlimited | Single user, single workspace, AI capped 200/mo, watermark removed |
| **Business** | 249/mo | 2,390/yr | 20% (3 months free) | unlimited | + TVA declaration prep + Sage 100/Générique CSV export, AI capped 1,000/mo |

**Deferred to Phase 9 (post-launch):** Multi-workspace, multi-user/seats, public API, FEC export, Cabinet Comptable tier. All shown on pricing page as "Coming Q3/Q4 2026."

### 2. Pricing Mechanics

- **Currency:** MAD natively if Lemon Squeezy supports (verification action item 1). USD with disclaimer otherwise.
- **Default billing cadence:** **Monthly.** Annual prominent secondary CTA labeled "Économisez 238 MAD" (Pro) / "Économisez 598 MAD" (Business).
- **Annual discount:** 20% — framed as "3 mois offerts."
- **No trial.** Free tier is the upgrade gate. Customer hits 10-invoice cap or clicks locked feature → UpgradeModal.

### 3. Founding Customer

- **30% off forever** (recurring discount on every billing cycle, not first-year-only). Locked at first redemption for the customer's lifetime as long as they stay subscribed.
- **Shared code:** `FOUNDER30`. Server-side validation: code + email exists in `wishlist_signups` + within 90-day post-launch window. Cohort closes after 90 days.
- Applies to Pro + Business, monthly + annual.
- **Resubscribe behavior:** customer who cancels and returns retains founding code (lifetime cohort membership).

### 4. Cancellation & Refunds

- **30-day money-back guarantee:** within 30 days of `subscriptions.first_paid_at`, full refund + immediate downgrade. Single-click on `/billing`.
- **Cancel-at-period-end after 30 days:** Pro access continues to period end, then downgrade. No refund.
- **Cancel-then-resubscribe:** data preserved, founding code preserved, 30-day money-back resets per `subscriptions.first_paid_at` on each new subscription event.
- **Tiered policy on /faq** (full text in Phase 4 task list):
  - <30 days: full refund, no questions
  - 30 days to period end: no refund, access through period end
  - After period end (annual unused time): no refund; account credit if return within 12 months
  - Chargebacks: de-escalation copy ("contact us before bank dispute, we refund without fee")
  - Service outage >4h cumulative/month: auto-credit
  - Force majeure (death, business closure with proof): case-by-case, typically pro-rated refund

### 5. Failed-Payment Dunning (Two-Tier)

Branch on Lemon Squeezy webhook `decline_reason`:

```
SOFT decline (insufficient_funds, exceeds_amount_limit, do_not_honor, transaction_not_permitted)
  → 7-day grace, retain Pro access
  → Email: "Paiement non abouti — vérifiez votre compte ou limite quotidienne."
  → Retry T+1, T+3, T+7
  → If retry 3 fails: email update-card prompt
  → If retry 3+1d fails: downgrade, status='expired'

HARD decline (expired_card, card_not_supported, stolen_card, lost_card)
  → 14-day grace, retain Pro access
  → Email + persistent in-app banner: "Mettez à jour votre carte"
  → Retry T+3, T+7, T+14
  → If T+14 fails: downgrade, status='expired'
```

Webhook idempotency required (`webhook_events` table, see Phase 1). WhatsApp dunning notifications deferred to Phase 9.

### 6. Downgrade UX (Tiered)

- **Never-paid free user:** sidebar shows locked Pro features with 🔒 + "Pro" badge → click opens UpgradeModal.
- **Downgraded user (`tier_at_peak != 'free'`):** read-only access to historical quotes/POs/expenses/reconciliation/AI conversations. Each row clickable → PDF view. Create/Edit buttons replaced by "Réactivez Pro pour modifier" CTAs.
- Schema: `workspaces.tier_at_peak tier_type NOT NULL DEFAULT 'free'`. Set to `'pro'` or `'business'` on first paid event, never decremented.

### 7. AI Usage Caps

- **Pro:** 200 messages/month. Calendar-month reset.
- **Business:** 1,000 messages/month. Calendar-month reset.
- UI gauge near chat input: "X / 200 messages ce mois."
- 80% threshold (160/200 or 800/1,000) shows banner: "Vous approchez votre quota mensuel. Passez à Business pour 1,000 messages/mois."
- Hit cap → block + UpgradeModal.

### 8. DGI Compliance (Hybrid Path)

- **In v1:** schema includes UBL 2.1-aligned fields (ICE, IF, RC, CNSS, currency_code, document_type_code, document_hash, signature_blob). Settings UI captures seller fiscal info. Client form captures buyer ICE/IF. PDF accommodates fiscal blocks.
- **`document_hash` and `signature_blob`:** columns exist, NULL in v1. Populate when DGI publishes UBL spec.
- **TVA rates:** constrained to canonical Moroccan set (0/7/10/14/20) + `tva_exonere bool` flag. Auto-entrepreneur sellers default `tva_exonere = TRUE`.
- **Marketing positioning:** "Architecté pour la facturation électronique DGI." When decree publishes, ship Phase 7.5 + re-pitch as compliant.

### 9. Auto-Entrepreneur Status

- Seller (you) is registered auto-entrepreneur. Cannot collect TVA. Cap 500K MAD/yr revenue (services).
- **Auto-issue Moroccan facture per paid event** (separate from LS receipt). Format `FAC-AE-2026-00001`, annual reset, gap-free atomicity via `customer_invoice_counter` row lock. Customer downloads from `/billing`.
- **Disclosure on /pricing:** "Tarifs hors taxes (TVA non applicable, article 91 du CGI - statut auto-entrepreneur)."
- **SARL conversion threshold:** 350K MAD ARR. Block manual milestone in Phase 9.

### 10. Onboarding (Post-Signup)

- **Empty dashboard + persistent setup checklist** (sidebar panel "🚀 Démarrage rapide"):
  - ☐ Complétez les informations de votre entreprise → /settings/billing
  - ☐ Ajoutez votre premier client → /clients/new
  - ☐ Créez votre première facture → /invoices/new
  - After 3-of-3: "Vous êtes prêt à facturer · Masquer ce guide"
- **JIT fiscal-info modal at first PDF download** (when `workspaces.ice IS NULL`): "Pour une facture professionnelle, ajoutez vos informations fiscales (ICE, IF). Plus tard | Compléter maintenant."
- "Plus tard" → PDF generates with placeholders + persistent banner on /invoices.
- "Compléter maintenant" → /settings/billing pre-filled.

### 11. Anti-Abuse (v1)

- Email verification mandatory before first invoice (24h to complete; pending state otherwise).
- Cloudflare Turnstile on `/signup` (reuse existing wishlist integration).
- Log per workspace: `signup_ip`, `signup_email_domain`, `signup_user_agent`.
- Phone gate deferred to Phase 9. Build only if abuse rate > 10% in metrics review.

### 12. Customer Support Model

- **WhatsApp Business + email + FAQ** (no in-app chat at v1).
- Pricing-page commitment: "Support en français · WhatsApp et email · Réponse sous 24h."
- /faq covers ~10 questions (drafted in Phase 4 task list).
- Outsourced VA hire trigger: 50 paying customers OR support takes >2h/day, whichever first.

### 13. Wishlist Migration

- **Three-blast email sequence** with queue-position personalization in subject:
  - **T-3:** "{firstname}, plus que 3 jours · Votre invitation Founding"
  - **T+0** (9am Casablanca): "{firstname}, c'est en ligne · Votre code FOUNDER30"
  - **T+30:** "{firstname}, plus que 60 jours pour FOUNDER30"
- **Top-10 manual outreach:** position #1–10 receive personal email from founder address (T-1 day).
- Wishlist-aware cookie on `/pricing`: detects `?wl=<token>` URL param or persisted cookie → banner "🎉 Bienvenue {firstname} · Code FOUNDER30 prêt — 30% à vie."

---

## File Map

| File | Action | Phase |
|---|---|---|
| `supabase/migrations/2026XXXX_subscription_schema.sql` | CREATE — `subscriptions` table, `workspaces.tier`, `subscription_id`, `tier_at_peak`, `account_credit_mad` | 1 |
| `supabase/migrations/2026XXXX_volume_counters.sql` | CREATE — `monthly_invoice_count` + `monthly_ai_message_count` RPCs, supporting indexes | 1 |
| `supabase/migrations/2026XXXX_dgi_compliance_fields.sql` | CREATE — ICE/IF/RC/CNSS/tax_regime on workspaces+clients, currency_code/document_type_code/document_hash/signature_blob on docs, vat_amount/tva_exonere on invoice_items, TVA rate CHECK constraint | 1 |
| `supabase/migrations/2026XXXX_customer_invoices.sql` | CREATE — `customer_invoices` + `customer_invoice_counter` tables | 1 |
| `supabase/migrations/2026XXXX_webhook_events.sql` | CREATE — `webhook_events` idempotency table | 1 |
| `supabase/migrations/2026XXXX_abuse_signals.sql` | CREATE — `signup_ip`, `signup_email_domain`, `signup_user_agent` on workspaces | 1 |
| `src/lib/tiers.ts` | CREATE — single source of truth: tier definitions, feature flags, limits | 2 |
| `src/lib/action-wrapper.ts` | MODIFY — extend with `withTier(tier_required)` HOF | 2 |
| `src/lib/billing/lemonsqueezy.ts` | CREATE — LS SDK wrapper, checkout URL, webhook signature verification | 5 |
| `src/lib/billing/subscription.ts` | CREATE — getSubscription, isInMoneyBackWindow, daysUntilRenewal | 2 |
| `src/lib/billing/invoice-counter.ts` | CREATE — monthlyInvoiceCount, checkInvoiceLimit | 3 |
| `src/lib/billing/ai-message-counter.ts` | CREATE — monthlyAiMessageCount, checkAiMessageLimit | 3 |
| `src/lib/billing/customer-invoice.ts` | CREATE — generateCustomerInvoice (called from webhook), atomic counter increment | 6 |
| `src/lib/billing/dunning.ts` | CREATE — classifyDeclineReason (soft/hard), scheduleRetry, sendDunningEmail | 5 |
| `src/lib/billing/founding-code.ts` | CREATE — validateFoundingCode (code + wishlist email match + 90-day window) | 5 |
| `src/app/actions/billing.ts` | CREATE — createCheckoutSession, cancelSubscription, requestRefund, redeemFoundingCode | 5 |
| `src/app/actions/invoices.ts` | MODIFY — wrap `createInvoice` with `checkInvoiceLimit` | 3 |
| `src/app/actions/createQuote.ts` | MODIFY — wrap with `withTier('pro')` | 3 |
| `src/app/actions/purchaseOrders.ts` | MODIFY — wrap with `withTier('pro')` | 3 |
| `src/app/actions/deliveryNotes.ts` | MODIFY — wrap with `withTier('pro')` | 3 |
| `src/app/actions/financeActions.ts` | MODIFY — wrap with `withTier('pro')` | 3 |
| `src/app/actions/reconciliation.ts` | MODIFY — wrap with `withTier('pro')` | 3 |
| `src/app/actions/ai-actions.ts` | MODIFY — wrap with `withTier('pro')` + AI message counter increment | 3 |
| `src/app/actions/admin.ts` | MODIFY — feature-flag inviteTeamMember/revokeInvitation behind "Coming Q3 2026" banner | 3 |
| `src/app/api/billing/webhook/route.ts` | CREATE — LS webhook handler with idempotency | 5 |
| `src/app/api/chat/route.ts` | MODIFY — increment AI message counter per session, enforce cap | 3 |
| `src/app/pricing/page.tsx` | CREATE — public pricing page, tier comparison, wishlist banner detection | 4 |
| `src/app/pricing/faq.tsx` | CREATE — FAQ section component (10 questions) | 4 |
| `src/app/billing/page.tsx` | CREATE — current subscription, factures (LS receipts + Moroccan factures), cancel flow | 8 |
| `src/components/billing/UpgradeModal.tsx` | CREATE — triggered on tier-locked feature click | 4 |
| `src/components/billing/PricingTable.tsx` | CREATE — 3-column tier comparison, monthly/annual toggle (monthly default) | 4 |
| `src/components/billing/LimitReachedBanner.tsx` | CREATE — shown when free user hits 8/10 then 10/10 invoices | 3 |
| `src/components/billing/AiQuotaGauge.tsx` | CREATE — small gauge near chat input | 3 |
| `src/components/billing/WatermarkPdf.tsx` | CREATE — 8pt grey footer "Créé avec Invoicify · invoicify.ma" | 3 |
| `src/components/billing/ReadOnlyBanner.tsx` | CREATE — "Réactivez Pro pour modifier" banner for downgraded users | 3 |
| `src/components/billing/CancelModal.tsx` | CREATE — branches on money-back window, cancellation reason dropdown | 8 |
| `src/components/billing/RefundEdgeCaseForm.tsx` | CREATE — force-majeure refund request form | 8 |
| `src/components/AppShell.tsx` | MODIFY — sidebar locks for free users, dashboard checklist for new workspaces, ReadOnlyBanner for downgraded users; remove TrialBanner reference | 3, 4 |
| `src/components/dashboard/SetupChecklist.tsx` | CREATE — persistent 3-step onboarding sidebar panel | 4 |
| `src/components/invoices/InvoiceTemplate.tsx` | MODIFY — render watermark for free tier, accommodate fiscal block (seller + buyer ICE/IF) | 3, 7 |
| `src/components/invoices/InvoiceForm.tsx` | MODIFY — TVA rate dropdown (0/7/10/14/20), tva_exonere toggle, JIT fiscal-info modal trigger on first PDF | 4, 7 |
| `src/components/clients/ClientForm.tsx` | MODIFY — add ICE/IF fields, country_code dropdown | 7 |
| `src/components/settings/TeamManager.tsx` | MODIFY — feature-flag behind "Coming Q3 2026" banner; remove invite-actually-works UI | 3 |
| `src/lib/pdf-generator.ts` | MODIFY — accept addWatermark flag, render Moroccan facture template | 3, 6 |
| `src/lib/pdf-templates/customer-facture.tsx` | CREATE — Moroccan-format facture template for auto-issued LS-paid factures | 6 |
| `src/app/settings/billing/page.tsx` | CREATE — fiscal info form (ICE, IF, RC, CNSS, tax_regime), founding code redemption | 7 |
| `src/app/onboarding/page.tsx` | DELETE if exists from old plan — replaced by dashboard checklist | 4 |
| `src/app/api/cron/dunning-retry/route.ts` | CREATE — Vercel cron daily at 02:00 UTC, processes scheduled retries | 5 |
| `src/app/api/cron/abuse-metrics/route.ts` | CREATE — weekly cron, dashboards signup_ip frequency, email-domain counts | 8 |
| `emails/CardFailedSoft.tsx` | CREATE — react-email template, soft-decline email | 5 |
| `emails/CardFailedHard.tsx` | CREATE — react-email template, hard-decline email | 5 |
| `emails/SubscriptionCancelled.tsx` | CREATE — confirmation of cancellation, period-end date | 8 |
| `emails/RefundProcessed.tsx` | CREATE — refund confirmation email | 8 |
| `emails/WishlistTease.tsx` | CREATE — T-3 launch tease | 7 |
| `emails/WishlistLaunch.tsx` | CREATE — T+0 launch + founding code | 7 |
| `emails/WishlistReminder.tsx` | CREATE — T+30 reminder | 7 |

**Removed from original plan:** `src/components/billing/TrialBanner.tsx`, all trial-expiry cron logic, `redeemTrialExtension` action, `trial_ends_at` schema field. Phase 6 (was trial mechanics) deleted entirely.

---

## Phase 1 — Schema Foundation

**Goal:** All tables and columns needed for tiers, subscriptions, customer factures, abuse signals, DGI compliance prep, volume counters, and webhook idempotency exist. No application code touches them yet.

### Task 1.1: Subscription schema migration

- [ ] Create `supabase/migrations/2026XXXX_subscription_schema.sql`:
  - Enum `tier_type` with values `'free'`, `'pro'`, `'business'`
  - Enum `subscription_status` with values `'active'`, `'past_due'`, `'cancelled'`, `'expired'`
  - Add to `workspaces`:
    - `tier tier_type NOT NULL DEFAULT 'free'`
    - `tier_at_peak tier_type NOT NULL DEFAULT 'free'`
    - `subscription_id uuid` FK, nullable
    - `account_credit_mad numeric(10,2) NOT NULL DEFAULT 0`
  - New table `subscriptions`:
    - `id uuid PRIMARY KEY`
    - `workspace_id uuid NOT NULL`
    - `tier tier_type NOT NULL`
    - `status subscription_status NOT NULL`
    - `provider text NOT NULL` (e.g., `'lemonsqueezy'`)
    - `provider_subscription_id text`
    - `provider_customer_id text`
    - `cadence text` (`'monthly'` or `'annual'`)
    - `first_paid_at timestamptz NOT NULL` (used for 30-day money-back window)
    - `current_period_start timestamptz NOT NULL`
    - `current_period_end timestamptz NOT NULL`
    - `cancel_at_period_end bool NOT NULL DEFAULT false`
    - `founding_code_redeemed bool NOT NULL DEFAULT false`
    - `decline_reason text` (last decline reason for dunning state machine)
    - `dunning_state text` (null/soft/hard/expired)
    - `created_at timestamptz NOT NULL DEFAULT now()`
    - `updated_at timestamptz NOT NULL DEFAULT now()`
  - RLS policies: workspace members can SELECT their own subscription; only service role can INSERT/UPDATE
- [ ] Run migration locally; verify with `\d workspaces` and `\d subscriptions`.

### Task 1.2: Volume counter RPCs

- [ ] Create `supabase/migrations/2026XXXX_volume_counters.sql`:
  - SQL function `monthly_invoice_count(p_workspace_id uuid, p_year_month text)` returning `int`. Counts rows in `invoices` where `workspace_id = p_workspace_id AND to_char(created_at, 'YYYY-MM') = p_year_month`. STABLE, security definer.
  - SQL function `monthly_ai_message_count(p_workspace_id uuid, p_year_month text)` returning `int`. Counts rows in `ai_chat_messages` (or whatever the existing AI conversation log is) where workspace_id matches and current month. STABLE, security definer.
  - Index `idx_invoices_workspace_created_at_month` on `invoices(workspace_id, created_at)`.
  - Index `idx_ai_messages_workspace_created_at_month` on `ai_chat_messages(workspace_id, created_at)` if table exists; create it if not.
- [ ] Verify functions return expected values via psql.

### Task 1.3: DGI compliance fields

- [ ] Create `supabase/migrations/2026XXXX_dgi_compliance_fields.sql`:
  - **Workspaces** (existing fields ice/if/rc/cnss/tp/bank_name/rib are already present):
    - Add `tax_regime tax_regime_type NOT NULL DEFAULT 'auto_entrepreneur'`
    - Create enum `tax_regime_type` with values: `'auto_entrepreneur'`, `'cpu'`, `'rns'`, `'rnr'`, `'forfait'`, `'none'`
  - **Clients:**
    - `ice text`
    - `if text`
    - `tax_regime tax_regime_type` (nullable — buyers may be unregistered)
    - `country_code text NOT NULL DEFAULT 'MA'`
  - **Invoices, quotes, purchase_orders, delivery_notes:**
    - `currency_code text NOT NULL DEFAULT 'MAD'`
    - `document_type_code text` (nullable; populated only on invoices = `'380'` v1; quotes/POs/deliveries stay NULL)
    - `document_hash text` (NULL in v1; populate when DGI UBL spec publishes)
    - `signature_blob text` (NULL in v1; populate when DGI signature requirement publishes)
  - **Invoice_items (or whatever line items table is named):**
    - `vat_amount numeric(10,2) NOT NULL DEFAULT 0` (computed: quantity × unit_price × tva_rate / 100)
    - `tva_exonere bool NOT NULL DEFAULT false`
    - CHECK constraint on `tva_rate IN (0, 7, 10, 14, 20)`
  - **Backfill:** existing rows get `currency_code = 'MAD'`, `document_type_code = '380'` for invoices only, `tva_exonere = TRUE` if any seller-workspace `tax_regime = 'auto_entrepreneur'`, `vat_amount` recalculated from existing rate × base.
- [ ] No app code reads these yet. Schema landed safely.

### Task 1.4: Customer-facing factures schema

- [ ] Create `supabase/migrations/2026XXXX_customer_invoices.sql`:
  - New table `customer_invoices`:
    - `id uuid PRIMARY KEY`
    - `workspace_id uuid NOT NULL`
    - `subscription_id uuid NOT NULL` FK to `subscriptions`
    - `ls_event_id text NOT NULL UNIQUE` (LS payment event UUID)
    - `invoice_number text NOT NULL UNIQUE` (e.g., `FAC-AE-2026-00001`)
    - `amount_mad numeric(10,2) NOT NULL`
    - `amount_paid_currency text NOT NULL` (e.g., `'USD'` or `'MAD'`)
    - `amount_paid numeric(10,2) NOT NULL`
    - `period_start timestamptz NOT NULL`
    - `period_end timestamptz NOT NULL`
    - `pdf_url text` (Supabase storage URL once generated)
    - `created_at timestamptz NOT NULL DEFAULT now()`
  - New table `customer_invoice_counter`:
    - `year integer PRIMARY KEY`
    - `last_seq integer NOT NULL DEFAULT 0`
  - Pre-seed counter for 2026: `INSERT INTO customer_invoice_counter (year, last_seq) VALUES (2026, 0);`
- [ ] Verify with psql.

### Task 1.5: Webhook idempotency

- [ ] Create `supabase/migrations/2026XXXX_webhook_events.sql`:
  - New table `webhook_events`:
    - `event_id text PRIMARY KEY` (LS event UUID)
    - `event_type text NOT NULL`
    - `payload jsonb NOT NULL`
    - `received_at timestamptz NOT NULL DEFAULT now()`
    - `processed_at timestamptz`
  - Index on `received_at` for retention cleanup.
  - Daily Vercel cron task to drop rows older than 90 days (defined in Phase 5).

### Task 1.6: Abuse-signal columns

- [ ] Create `supabase/migrations/2026XXXX_abuse_signals.sql`:
  - Add to `workspaces`:
    - `signup_ip inet`
    - `signup_email_domain text`
    - `signup_user_agent text`
    - `email_verified_at timestamptz`
- [ ] Backfill existing workspaces: leave NULL on signup fields; set `email_verified_at = created_at` for existing users (assume legacy verification).

### Task 1.7: Type sync

- [ ] Regenerate Supabase types: `npx supabase gen types typescript --linked > src/lib/database.types.ts` (or whatever the project's existing type-sync command is).
- [ ] `npx tsc --noEmit` — must pass.

**Phase 1 gate:** TypeScript compiles. All migrations apply cleanly. No runtime code change yet.

---

## Phase 2 — Tier Gating Infrastructure

**Goal:** A `withTier` HOF wrapping any server action to enforce minimum tier. Unified tier-config source of truth. No trial logic (deleted).

### Task 2.1: Tier definitions module

- [ ] Create `src/lib/tiers.ts`:

```typescript
export type Tier = 'free' | 'pro' | 'business'

export const TIER_RANK: Record<Tier, number> = {
  free: 0,
  pro: 1,
  business: 2,
}

export interface TierConfig {
  name: string
  monthlyPriceMad: number
  annualPriceMad: number
  monthlyInvoiceLimit: number | null
  monthlyAiMessageLimit: number | null
  features: {
    quotes: boolean
    purchaseOrders: boolean
    deliveryNotes: boolean
    expenses: boolean
    reconciliation: boolean
    reports: boolean
    aiFeatures: boolean
    tvaReport: boolean
    accountantExport: boolean
    watermarkRemoved: boolean
  }
}

export const TIERS: Record<Tier, TierConfig> = {
  free: { name: 'Gratuit', monthlyPriceMad: 0, annualPriceMad: 0, monthlyInvoiceLimit: 10, monthlyAiMessageLimit: 0, features: { /* all false except baseline */ } },
  pro: { name: 'Pro', monthlyPriceMad: 99, annualPriceMad: 950, monthlyInvoiceLimit: null, monthlyAiMessageLimit: 200, features: { quotes: true, purchaseOrders: true, deliveryNotes: true, expenses: true, reconciliation: true, reports: true, aiFeatures: true, watermarkRemoved: true, tvaReport: false, accountantExport: false } },
  business: { name: 'Business', monthlyPriceMad: 249, annualPriceMad: 2390, monthlyInvoiceLimit: null, monthlyAiMessageLimit: 1000, features: { /* everything true */ } },
}

export function tierMeets(actual: Tier, required: Tier): boolean {
  return TIER_RANK[actual] >= TIER_RANK[required]
}

// No trial logic — getEffectiveTier just returns stored tier.
export function getEffectiveTier(workspace: { tier: Tier }): Tier {
  return workspace.tier
}

export function hasHistoricalProAccess(workspace: { tier_at_peak: Tier }): boolean {
  return TIER_RANK[workspace.tier_at_peak] >= TIER_RANK['pro']
}
```

- [ ] Unit test `tierMeets` and `hasHistoricalProAccess`.

### Task 2.2: Extend `action-wrapper.ts` with `withTier`

- [ ] Modify `src/lib/action-wrapper.ts`:

```typescript
import { Tier, getEffectiveTier, tierMeets } from './tiers'

export class TierLockError extends Error {
  constructor(public required: Tier, public actual: Tier, public from: string) {
    super(`Feature requires ${required} tier; workspace is on ${actual}`)
  }
}

export function withTier<TArgs extends any[], TResult>(
  required: Tier,
  fn: (ctx: WorkspaceContext, ...args: TArgs) => Promise<TResult>,
  fromKey: string = 'unknown',
): (...args: TArgs) => Promise<TResult> {
  return withWorkspace(async (ctx, ...args) => {
    // Refetch workspace to get current tier (cache may be stale)
    const { data: workspace } = await ctx.supabase
      .from('workspaces')
      .select('tier')
      .eq('id', ctx.workspaceId)
      .single()
    if (!workspace) throw new Error('Workspace not found')
    const effective = getEffectiveTier(workspace)
    if (!tierMeets(effective, required)) {
      throw new TierLockError(required, effective, fromKey)
    }
    return fn(ctx, ...args)
  })
}
```

- [ ] Catch `TierLockError` at the page-action boundary; convert to redirect to `/pricing?from=<fromKey>`.

### Task 2.3: Subscription helper module

- [ ] Create `src/lib/billing/subscription.ts`:
  - `getSubscription(workspaceId)` — fetch active subscription row
  - `isInMoneyBackWindow(subscription)` — boolean derived from `first_paid_at < 30 days ago`
  - `daysUntilRenewal(subscription)` — int

**Phase 2 gate:** `withTier` can be imported and applied. No actions wrapped yet — Phase 3.

---

## Phase 3 — Free Tier Enforcement & Read-Only Downgrade Mode

**Goal:** Free users hit 10-invoice cap, see watermark, can't create quotes/POs/expenses. Downgraded users see read-only history.

### Task 3.1: Invoice volume counter helper

- [ ] Create `src/lib/billing/invoice-counter.ts`:
  - `monthlyInvoiceCount(workspaceId)` — calls SQL function via `supabase.rpc`
  - `checkInvoiceLimit(ctx)` — returns `{ remaining, limit }`. Throws `LimitExceededError` if `tier === 'free'` AND count >= 10.

### Task 3.2: AI message counter helper

- [ ] Create `src/lib/billing/ai-message-counter.ts`:
  - `monthlyAiMessageCount(workspaceId)` — calls SQL function
  - `checkAiMessageLimit(ctx)` — throws `LimitExceededError` if count >= cap for tier
  - Soft-warning helper: returns `{ percentUsed, status: 'ok' | 'warning' | 'limit' }`

### Task 3.3: Wrap `createInvoice`

- [ ] Modify `src/app/actions/invoices.ts` — `createInvoice` calls `checkInvoiceLimit(ctx)` before insert. On limit hit, throws `LimitExceededError` caught by page → redirect to `/pricing?from=invoice_limit`.

### Task 3.4: Wrap Pro-locked actions

- [ ] `src/app/actions/createQuote.ts` → `withTier('pro', ..., 'quotes')`
- [ ] `src/app/actions/purchaseOrders.ts` → all exports wrapped
- [ ] `src/app/actions/deliveryNotes.ts` → wrap
- [ ] `src/app/actions/financeActions.ts` → expense/debt actions wrapped
- [ ] `src/app/actions/reconciliation.ts` → wrap
- [ ] `src/app/actions/ai-actions.ts` → wrap + increment AI message counter on each tool call

### Task 3.5: Watermark on PDFs

- [ ] Modify `src/lib/pdf-generator.ts` to accept `{ addWatermark: boolean }` flag.
- [ ] Modify `src/components/invoices/InvoiceTemplate.tsx` to render footer "Créé avec Invoicify · invoicify.ma" at 8pt grey (`#9CA3AF`), bottom-center, 5mm from bottom edge, when `tier === 'free'`.
- [ ] PDF generator passes `addWatermark = !TIERS[effectiveTier].features.watermarkRemoved`.

### Task 3.6: Sidebar gating UX

- [ ] Modify `src/components/AppShell.tsx`:
  - Each sidebar item declares `requiredTier`.
  - Free-tier users see locked items with 🔒 + "Pro" badge.
  - Click on locked item → opens `<UpgradeModal />` with `from` context.
  - **For downgraded users (`tier_at_peak` !== 'free' && tier === 'free'`):** locked items become read-only access to historical data (different navigation, see Task 3.7).
- [ ] Build `src/components/billing/UpgradeModal.tsx`: shows PricingTable inside modal, with `from` prop for context-specific copy.

### Task 3.7: Read-only mode for downgraded users

- [ ] In list pages for quotes, purchase orders, expenses, reconciliation, AI conversations:
  - If `tier === 'free' && tier_at_peak !== 'free'`: render list view with view-only links. No create button. No edit buttons. Each row clickable → PDF view (if applicable) or detail view.
  - Top-of-page banner via `<ReadOnlyBanner />`: "Réactivez Pro pour créer/modifier ces documents."
- [ ] Build `src/components/billing/ReadOnlyBanner.tsx`.

### Task 3.8: Limit-reached banner

- [ ] Build `src/components/billing/LimitReachedBanner.tsx`:
  - Soft warning at 8/10 invoices: "Plus que 2 factures avant la limite mensuelle."
  - Hard limit at 10/10: "Limite mensuelle atteinte. Passer à Pro pour des factures illimitées."
- [ ] Mounted on `/invoices` for free users.

### Task 3.9: AI quota gauge

- [ ] Build `src/components/billing/AiQuotaGauge.tsx`:
  - Small gauge near chat input showing `X / 200 messages ce mois` or `X / 1000` for Business.
  - 80% threshold: amber styling + banner "Vous approchez votre quota mensuel."
  - 100%: red, chat input disabled, replaced by upgrade CTA.

### Task 3.10: Feature-flag legacy invitation UI

- [ ] Modify `src/components/settings/TeamManager.tsx`:
  - Replace functional invite form with banner: "Invitations d'équipe disponibles à partir du Q3 2026." Disable form fields.
  - Existing `team_invitations` table data left intact.
- [ ] Modify `src/app/actions/admin.ts`:
  - `inviteTeamMember`, `revokeInvitation`, `updateUserRole` return `{ error: 'Coming Q3 2026' }`. Don't delete the functions; just stub them to no-op.

**Phase 3 gate:** Manual test — free workspace hits 10 invoices, blocked. PDF watermark appears. Quotes/POs/expenses pages show locked state. Downgraded user (manually set tier_at_peak='pro' in DB then tier='free') sees read-only mode.

---

## Phase 4 — Pricing Page, Onboarding, Upgrade UI

**Goal:** Public `/pricing` page with wishlist-aware banner, in-app upgrade modal, dashboard onboarding checklist, JIT fiscal-info prompt.

### Task 4.1: Pricing comparison component

- [ ] Build `src/components/billing/PricingTable.tsx`:
  - 3 columns: Gratuit / Pro / Business.
  - Highlight Pro as "Recommandé."
  - Monthly/Annual toggle (**monthly default-selected**).
  - Annual labels: "Économisez 238 MAD" (Pro) / "Économisez 598 MAD" (Business).
  - Each feature row uses ✓ / ✗ / "Q3 2026" indicators (Q3 for deferred features like API/multi-user).
  - CTA per tier: all three columns "Commencer gratuitement" → `/signup`.

### Task 4.2: Public `/pricing` route

- [ ] Build `src/app/pricing/page.tsx`:
  - Hero: "Tarification simple, sans surprise."
  - Wishlist-aware banner: detect `?wl=<token>` URL param OR persisted `wl_token` cookie. If matches a `wishlist_signups` row, render banner: "🎉 Bienvenue {firstname} · Votre code FOUNDER30 est prêt — 30% à vie sur Pro ou Business pendant 90 jours."
  - PricingTable.
  - FAQ section (`<Faq />` component, see Task 4.5).
  - Disclosure line below pricing: "Tarifs hors taxes (TVA non applicable, article 91 du CGI - statut auto-entrepreneur)."
  - Support promise: "Support en français · WhatsApp et email · Réponse sous 24h."

### Task 4.3: Upgrade modal mounting

- [ ] Mount `<UpgradeModal />` in AppShell. Any tier-locked click opens it.
- [ ] Modal opens with `from` context (`'invoice_limit'`, `'quotes'`, `'expenses'`, `'ai_limit'`, etc.) so headline copy is dynamic.
- [ ] Modal CTAs call `createCheckoutSession` server action (Phase 5 dependency).

### Task 4.4: Setup checklist

- [ ] Build `src/components/dashboard/SetupChecklist.tsx`:
  - Sidebar panel "🚀 Démarrage rapide."
  - 3 steps:
    - ☐ "Complétez les informations de votre entreprise" → /settings/billing
    - ☐ "Ajoutez votre premier client" → /clients/new
    - ☐ "Créez votre première facture" → /invoices/new
  - Auto-checks each step based on workspace state.
  - When all 3 checked: "Vous êtes prêt à facturer · Masquer ce guide" + dismiss button.
  - Dismissible state stored in localStorage.

### Task 4.5: FAQ component

- [ ] Build `src/components/billing/Faq.tsx` with 10 questions:
  1. Comment fonctionne la version gratuite ?
  2. Que se passe-t-il si je dépasse 10 factures par mois ?
  3. Puis-je annuler à tout moment ?
  4. Est-ce que je peux récupérer mon argent si je n'aime pas ?
  5. Mes factures sont-elles conformes DGI ?
  6. Pourquoi je paie en USD/MAD via Lemon Squeezy ?
  7. Comment redeem mon code FOUNDER30 ?
  8. Que se passe-t-il si je redowngrade vers Gratuit ?
  9. Puis-je avoir une facture comptable marocaine ?
  10. Comment vous contacter ?
- [ ] Each answer ~3–5 sentences. Include the full refund policy text under question 4.

### Task 4.6: JIT fiscal-info modal

- [ ] In `src/components/invoices/InvoiceForm.tsx` and PDF download flow:
  - Before generating PDF, check `workspaces.ice IS NULL`.
  - If NULL: open modal "Pour une facture professionnelle, ajoutez vos informations fiscales (ICE, IF). Plus tard | Compléter maintenant."
  - "Plus tard" → PDF generates with placeholders + persistent banner on /invoices "Vos factures ne sont pas conformes — complétez vos infos fiscales."
  - "Compléter maintenant" → /settings/billing pre-filled, save → return to invoice → PDF.

### Task 4.7: Wishlist cookie persistence

- [ ] Wishlist confirmation flow (existing) sets `wl_token` cookie (HTTP-only, 90-day expiry).
- [ ] /pricing reads cookie OR `?wl=` param → shows founding banner.
- [ ] /signup form auto-fills email from wishlist if cookie present.
- [ ] Founding code applied to checkout metadata if cookie present (Phase 5).

**Phase 4 gate:** /pricing loads, tier display correct, wishlist banner appears for cookie-set visitors, upgrade modal opens on locked feature clicks, dashboard checklist auto-tracks, JIT fiscal modal triggers on first PDF.

---

## Phase 5 — Lemon Squeezy Integration

**Goal:** Working checkout → webhook updates subscriptions → workspace tier flips → user sees Pro features. Two-tier dunning state machine + founding code redemption.

### Task 5.1: Lemon Squeezy account setup (manual, blocks code)

- [ ] Sign up at lemonsqueezy.com.
- [ ] **Verify MAD display support.** If supported: charge in MAD natively, products displayed in MAD. If not: charge in USD with disclaimer (action item #1 from pre-launch list).
- [ ] Create store named "Invoicify."
- [ ] Create products:
  - Pro Monthly (99 MAD or USD-equivalent ~$9.10)
  - Pro Annual (950 MAD or ~$87.50)
  - Business Monthly (249 MAD or ~$22.90)
  - Business Annual (2,390 MAD or ~$219.50)
- [ ] Generate API key. Store in `.env.local` and Vercel env: `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`.
- [ ] Create discount code `FOUNDER30`: 30% off, recurring (every cycle), no expiry on the code itself (validation logic enforces 90-day window).

### Task 5.2: SDK wrapper

- [ ] Install: `npm i @lemonsqueezy/lemonsqueezy.js`.
- [ ] Create `src/lib/billing/lemonsqueezy.ts`:
  - `createCheckout({ workspaceId, tier, cadence, foundingCode? })` → returns LS checkout URL with custom data `{ workspace_id, tier, cadence }`.
  - `verifyWebhookSignature(rawBody, signature)` — HMAC-SHA256 against `LEMONSQUEEZY_WEBHOOK_SECRET`.
  - `cancelSubscription(providerSubscriptionId)` — calls LS API.
  - `refundSubscription(providerSubscriptionId)` — full refund within 30-day window.

### Task 5.3: Founding code validation

- [ ] Create `src/lib/billing/founding-code.ts`:
  - `validateFoundingCode(code: string, email: string)`: returns `{ valid: boolean, reason?: string }`.
  - Checks: `code === 'FOUNDER30'` AND email exists in `wishlist_signups` AND `now() < launch_date + 90 days` (launch_date stored in `src/lib/launch-date.ts`).
- [ ] If valid, server action injects code into LS checkout metadata so LS applies the 30% discount.

### Task 5.4: Server actions for billing

- [ ] Create `src/app/actions/billing.ts`:
  - `createCheckoutSession({ tier, cadence, foundingCode? })` — uses `withWorkspace`, validates founding code if present, calls `createCheckout`, returns `{ url }`.
  - `cancelSubscription({ reason })` — uses `withWorkspace`, fetches subscription, branches on money-back window:
    - In window (`first_paid_at` < 30 days ago): call LS refund API, mark `subscriptions.status = 'cancelled'`, set `workspaces.tier = 'free'` immediately.
    - Outside window: call LS cancel API, set `cancel_at_period_end = true`.
    - Log `reason` field for retention analytics.
  - `requestRefundEdgeCase({ reason, evidence_url })` — out-of-band refund request for force-majeure cases. Sends email to support@invoicify.ma with attachments.

### Task 5.5: Dunning state machine

- [ ] Create `src/lib/billing/dunning.ts`:
  - `classifyDeclineReason(reason: string): 'soft' | 'hard'`:
    - Soft: `insufficient_funds`, `exceeds_amount_limit`, `do_not_honor`, `transaction_not_permitted`.
    - Hard: `expired_card`, `card_not_supported`, `stolen_card`, `lost_card`.
    - Default unknown: treat as hard (more conservative).
  - `scheduleRetry(subscription, attemptNumber)` — sets `subscriptions.dunning_state` and emits Vercel cron task for retry timing (T+1/T+3/T+7 for soft, T+3/T+7/T+14 for hard).
  - `sendDunningEmail(subscription, type)` — calls react-email template (`CardFailedSoft.tsx` or `CardFailedHard.tsx`).

### Task 5.6: Webhook endpoint

- [ ] Create `src/app/api/billing/webhook/route.ts`:
  - POST handler receives LS webhook.
  - Verify signature; reject 401 if invalid.
  - **Idempotency:** `INSERT INTO webhook_events (event_id, ...) ON CONFLICT (event_id) DO NOTHING RETURNING *`. If 0 rows, noop.
  - Switch on `event_name`:
    - `subscription_created` → if `workspaces.tier_at_peak !== 'free'`, treat as returning customer (preserve data, founding code locked); insert `subscriptions` row, update `workspaces.tier`, set `tier_at_peak = max(tier_at_peak, new_tier)`, set `first_paid_at = NOW()`.
    - `subscription_updated` → reflect tier/status changes.
    - `subscription_cancelled` → set `cancel_at_period_end = true`, schedule period-end downgrade.
    - `subscription_expired` → set `tier = 'free'` (preserve `tier_at_peak`), `subscription_id = NULL`.
    - `subscription_payment_failed` → call `classifyDeclineReason`, branch to dunning state machine.
    - `subscription_payment_success` → trigger Phase 6 customer-facture generation (in-line, same transaction).
  - All handlers update `webhook_events.processed_at`.
- [ ] `revalidatePath('/billing')` and `revalidatePath('/', 'layout')` after each handler.

### Task 5.7: Wire CTA buttons

- [ ] PricingTable CTAs and UpgradeModal CTAs call `createCheckoutSession` server action, then `window.location = url`.
- [ ] Wishlist cookie present → founding code injected automatically.

### Task 5.8: Vercel cron for dunning retries

- [ ] Create `src/app/api/cron/dunning-retry/route.ts` (daily, 02:00 UTC):
  - Query subscriptions where `dunning_state` is set AND retry due.
  - For each: call LS retry API, update state, send email.
  - On final failure: set `status = 'expired'`, downgrade workspace.
- [ ] Add cron config to `vercel.json`.

**Phase 5 gate:** Real test purchase using LS test mode. Webhook fires. Workspace tier updates. Dunning simulation: trigger soft + hard decline, verify state machine progresses correctly.

---

## Phase 6 — Customer-Facing Facture Auto-Issuance

**Goal:** Every paid event auto-generates a Moroccan-format facture (separate from LS receipt). Atomic gap-free numbering.

### Task 6.1: Counter increment helper

- [ ] Create `src/lib/billing/customer-invoice.ts`:
  - `generateNextInvoiceNumber(year)`: opens transaction, `SELECT last_seq FROM customer_invoice_counter WHERE year = ? FOR UPDATE`, increments, returns formatted string `FAC-AE-2026-00001`.
  - Year-rollover: if no row for current year, INSERT and start at 1.
- [ ] Test under concurrent load (simulated): two simultaneous calls produce sequential numbers, no gaps.

### Task 6.2: Facture generation

- [ ] In `src/app/api/billing/webhook/route.ts` `subscription_payment_success` handler:
  - Generate invoice number via `generateNextInvoiceNumber`.
  - Insert into `customer_invoices` with all fields populated.
  - Generate PDF via `src/lib/pdf-templates/customer-facture.tsx` (new template, see Task 6.3).
  - Upload PDF to Supabase Storage; update `customer_invoices.pdf_url`.
- [ ] All in same transaction as counter increment — gap-free guarantee.

### Task 6.3: Moroccan facture PDF template

- [ ] Create `src/lib/pdf-templates/customer-facture.tsx`:
  - Header: your auto-entrepreneur info (ICE, IF if registered, RC if applicable, address, phone).
  - Buyer block: customer's workspace info (their ICE/IF/etc.) — even though customer paid LS, facture is "from you to them" for accounting.
  - Line item: 1 line — "Abonnement Invoicify [Pro/Business] · [Monthly/Annual] · Période [start]–[end]."
  - Totals: HT (= TTC because no TVA), TVA = 0, "TVA non applicable selon article 91 du CGI - statut auto-entrepreneur."
  - Footer: payment confirmation note "Payé le [date] via Lemon Squeezy."
  - Format: A4, professional Moroccan business style.

### Task 6.4: Facture display in /billing

- [ ] In `src/app/billing/page.tsx` (Phase 8), add section "Factures Invoicify (votre comptabilité)":
  - List all `customer_invoices` for workspace, sorted desc.
  - Per row: invoice number, period, amount, "Télécharger PDF" + "Reçu LS" (link to LS receipt URL stored on the row).

**Phase 6 gate:** Manual test — trigger LS payment success, verify customer_invoice row created with `FAC-AE-2026-XXXXX` number, PDF generated and stored, accessible from /billing.

---

## Phase 7 — DGI Compliance Prep & Settings UI

**Goal:** Schema and UI ready for DGI compliance. v2 lift is small.

### Task 7.1: Settings → Fiscal Information form

- [ ] Build `src/app/settings/billing/page.tsx`:
  - Form with: ICE (15 digits, validated regex), IF (numeric), RC, CNSS, Tax Regime (radio: auto-entrepreneur/CPU/RNS/RNR/forfait/none).
  - Saves to `workspaces` row.
  - Banner at top: "Préparation à la facturation électronique DGI 2026."
  - Founding code redemption form (if eligible — wishlist email match): prefilled with `FOUNDER30` if cookie present, "Redeem" button calls server action.

### Task 7.2: Client form ICE/IF fields

- [ ] Modify `src/components/clients/ClientForm.tsx`:
  - Add `ice` field (15-digit regex).
  - Add `if` field (numeric).
  - Add `country_code` dropdown (default MA, options: MA + common international codes).
  - Optional `tax_regime` field (auto-detect from heuristics or leave blank).

### Task 7.3: Invoice form TVA dropdown

- [ ] Modify `src/components/invoices/InvoiceForm.tsx`:
  - TVA rate field becomes `<select>` with options: 0%, 7%, 10%, 14%, 20%, plus separate "TVA exonérée" toggle.
  - When auto-entrepreneur seller: default `tva_exonere = TRUE`, rate hidden, line shows "TVA non applicable."
  - When non-AE seller: rate selectable, exemption toggle available per line for legal exemptions.

### Task 7.4: Invoice creation populates compliance fields

- [ ] On invoice insert, set `currency_code` (default MAD; future: per-client override), `document_type_code = '380'`.
- [ ] On `vat_amount` per line: compute server-side `quantity × unit_price × (tva_rate / 100)` and store. (No longer compute on the fly from rate × base.)

### Task 7.5: PDF rendering accommodates fiscal block

- [ ] Modify `InvoiceTemplate.tsx`:
  - Render seller fiscal block (ICE/IF/RC/CNSS/tax_regime) prominently — required on Moroccan invoices.
  - Render buyer ICE/IF if present.
  - Below totals: footer line "Document N° {invoice_number} · Type: {document_type_code} · Devise: {currency_code}."
  - For auto-entrepreneur sellers: line "TVA non applicable selon article 91 du CGI - statut auto-entrepreneur."

**Phase 7 gate:** Manual test — create invoice with seller + buyer fiscal info populated. PDF shows ICE/IF correctly. TVA constraint enforced (try inserting `tva_rate = 12` → DB rejects).

---

## Phase 8 — Self-Serve Subscription Management & Refund Edge Cases

**Goal:** Customers manage subscriptions without contacting support. Refund edge cases have a path.

### Task 8.1: Billing page

- [ ] Build `src/app/billing/page.tsx`:
  - Current tier + status.
  - Next billing date + amount.
  - "Manage payment method" → LS customer portal redirect.
  - Past LS receipts list (from `subscriptions` history).
  - Past Moroccan factures list (from `customer_invoices`, see Task 6.4).
  - "Cancel subscription" button → opens `<CancelModal />`.
  - Plan switch: "Upgrade to Business" / "Downgrade to Pro" / "Cancel."
  - Account credit display if `account_credit_mad > 0`: "Crédit disponible: X MAD (utilisé au prochain renouvellement)."

### Task 8.2: Cancel modal

- [ ] Build `src/components/billing/CancelModal.tsx`:
  - Branches on money-back window:
    - In window: "Vous êtes dans votre période de garantie 30 jours. Annuler maintenant = remboursement complet immédiat. Continuer ?"
    - Outside window: "Votre accès continue jusqu'au {period_end_date}. Pas de remboursement après 30 jours. Annuler à la fin de la période ?"
  - Cancellation reason dropdown (optional): "trop cher / pas assez utilisé / fonctionnalité manquante / passe à un concurrent / autre."
  - Confirm button calls `cancelSubscription({ reason })` server action.

### Task 8.3: Refund edge case form

- [ ] Build `src/components/billing/RefundEdgeCaseForm.tsx`:
  - Reason dropdown: "force majeure / décès / cessation d'activité / panne de service / autre."
  - File upload for justificatif (PDF, image).
  - Free-text explanation.
  - Submits via `requestRefundEdgeCase` server action → emails support@invoicify.ma.

### Task 8.4: Service-outage auto-credit cron

- [ ] Create `src/app/api/cron/service-outage-credit/route.ts` (weekly):
  - Query workspace activity logs / Vercel uptime data.
  - If cumulative downtime in past 30 days > 4h: credit each affected workspace's `account_credit_mad` proportionally (= price/720h × downtime_hours).
  - Email customers about credit applied.

### Task 8.5: Email templates

- [ ] Build all email templates with react-email:
  - `emails/CardFailedSoft.tsx`
  - `emails/CardFailedHard.tsx`
  - `emails/SubscriptionCancelled.tsx`
  - `emails/RefundProcessed.tsx`
  - `emails/WishlistTease.tsx` (T-3)
  - `emails/WishlistLaunch.tsx` (T+0)
  - `emails/WishlistReminder.tsx` (T+30)
- [ ] Wire to existing Supabase Edge Functions or React Email send mechanism.

### Task 8.6: WhatsApp Business setup (manual)

- [ ] Set up WhatsApp Business with Moroccan number.
- [ ] Configure quick replies for: tarifs, annulation, remboursement, code FOUNDER30, factures comptables, mot de passe.
- [ ] Set greeting + away message.
- [ ] Add WhatsApp click-to-chat link in app footer + on /pricing.

### Task 8.7: Wishlist email blast cron

- [ ] Create cron jobs for wishlist email sequence (T-3 / T+0 / T+30):
  - `src/app/api/cron/wishlist-tease/route.ts` (3 days before launch)
  - `src/app/api/cron/wishlist-launch/route.ts` (launch day at 9am Casablanca)
  - `src/app/api/cron/wishlist-reminder/route.ts` (30 days post-launch)
- [ ] Each iterates `wishlist_signups`, sends personalized email with queue position.
- [ ] Top-10 manual outreach: NOT automated. Founder writes 10 emails personally T-1 day.

### Task 8.8: Abuse-metrics dashboard cron

- [ ] Create `src/app/api/cron/abuse-metrics/route.ts` (weekly):
  - Aggregates `signup_ip` count distribution (workspaces per IP).
  - Aggregates `signup_email_domain` clusters (e.g., gmail.com aliases).
  - Aggregates "ghost workspaces" (created but no invoice in 14 days).
  - Sends summary email to founder.
  - Phase 9 trigger: if abuse rate > 10%, ship phone gate.

**Phase 8 gate:** End-to-end test: signup → use → cancel within 30 days → full refund + downgrade. Signup → use → cancel after 30 days → access until period end → downgrade. Wishlist email sequence test (with manual date override). Force-majeure refund form submits to support inbox.

---

## Verification Checklist (Pre-Launch)

- [ ] All 8 phases pass `npx tsc --noEmit`.
- [ ] **Action item 1 complete:** Lemon Squeezy MAD display verified (or USD fallback locked).
- [ ] **Action item 2 complete:** Comptable validated Sage 100 export.
- [ ] **Action item 3 complete:** WhatsApp Business configured.
- [ ] LS test mode purchase tested with real card (test card).
- [ ] Webhook idempotency tested (LS sends duplicate event, no double-update).
- [ ] Free tier 10-invoice cap holds at exactly 10.
- [ ] Watermark appears on free PDFs, absent on Pro/Business.
- [ ] Two-tier dunning tested: simulate soft + hard decline, verify retry cadence + emails.
- [ ] Founding code redemption tested end-to-end with wishlist email match.
- [ ] Cancel-then-resubscribe tested: data preserved, founding code preserved, money-back resets.
- [ ] Read-only downgrade UX tested: manually set tier='free' for tier_at_peak='pro' workspace, verify quotes/POs/expenses load read-only.
- [ ] AI cap tested: hit 200/mo on Pro, blocked, upgrade modal opens.
- [ ] Customer-facing facture generated correctly with sequential FAC-AE-2026-XXXXX number, no gaps.
- [ ] DGI schema fields populated correctly on invoice creation.
- [ ] TVA constraint enforced (CHECK on tva_rate).
- [ ] /pricing loads in <1s, mobile-friendly.
- [ ] /faq loads with all 10 questions.
- [ ] Wishlist banner appears for cookie-set visitors.
- [ ] Dashboard checklist auto-tracks for new workspaces.
- [ ] Email verification mandatory before first invoice.
- [ ] Turnstile triggers on suspicious signup.
- [ ] Cancellation reason dropdown logs correctly.

---

## Post-Launch / Phase 9+ (Deferred)

- **Phase 9 — Multi-user / Multi-workspace / Cabinet Comptable channel:** dedicated tier (~599 MAD/mo) + multi-tenant accountant dashboard. Real `workspace_members` table + invite flow. Highest-leverage growth channel per market research.
- **Phase 9 — Annual upsell mechanic:** in-app banner at month 4 for monthly subscribers ("Économisez 238 MAD avec la facturation annuelle").
- **Phase 9 — Pause/soft-cancel:** customer pauses subscription up to 3 months, no charges, can resume.
- **Phase 9 — WhatsApp dunning notifications:** for hard-decline cases.
- **Phase 9 — Phone gate** (if abuse > 10%): SMS verification on signup.
- **Phase 9 — Public API:** REST CRUD over invoices/clients/quotes. API key gen UI, rate limiting, OpenAPI spec, hosted docs.
- **Phase 10 — DGI clearance integration:** UBL 2.1 XML generation, electronic signature integration, DGI clearance API roundtrip.
- **Phase 10 — FEC export:** Fichier des Écritures Comptables for fiscal audits.
- **Phase 11 — CMI migration:** when scale justifies (>500 paying customers), move from LS to direct CMI to recapture ~3–4% margin.
- **Phase 12 — SARL conversion** (mandatory at 350K MAD ARR): paperwork, accountant, entity transition.

---

## Risks & Open Questions

- **Lemon Squeezy MAD support unverified.** Pre-Phase-5 action item. If unsupported, USD-charge friction is meaningful for Moroccan-card customers (foreign-tx fees, banks may flag). Mitigation: explicit disclosure on /pricing.
- **Sage 100 export untested.** Pre-Phase-5 action item. If comptable testing reveals format issues, Phase 6 schedule slips by validation cycle (~1 week).
- **AI cost per heavy user:** Pro at 99 MAD with 200/mo cap holds at $10 worst-case Gemini spend. Validated. Watch for usage patterns post-launch; tighten cap if needed.
- **Customer-facture numbering legal correctness:** counter table with row lock guarantees gap-free, but: if a webhook is received but payment is later refunded within 30-day window, the facture number is "used" but the invoice is voided. Moroccan auto-entrepreneur rule on void factures: keep the number, mark VOID. Document in Phase 6 task list — handle "void facture" generation on refund event.
- **SARL conversion timing:** must trigger at 350K MAD ARR. Don't wait. Set calendar reminder + accountant relationship now.
- **Wishlist size unknown.** Plan assumes 50–200 signups. If wishlist is < 30, top-10 manual outreach covers majority; if > 500, consider segmentation.

---

**Plan version: v2 (post-grill 2026-05-08).** Original v1 plan is archived in git history (commit prior to this rewrite). All 30 locked decisions baked in. Execute against this spec.
