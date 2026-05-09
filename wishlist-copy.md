# Invoicify — Wishlist Landing Page Spec (Resolved)

> **For:** the coding agent building this page
> **Purpose:** capture emails for Invoicify's launch on **May 28, 2026 (21 days from May 7, 2026)**
> **Goal:** get qualified Moroccan SMBs / freelancers to drop their email in exchange for a lifetime 50%-off Pro pricing lock
> **Language:** 100% French (do not translate)
> **Tone:** confident, direct, human — no corporate fluff, no AI clichés
> **Status:** decisions resolved via grilling session 2026-05-07. This doc is now authoritative; do not re-derive choices.

---

## 1. Resolved decisions (single source of truth)

| Area | Decision |
|---|---|
| Routing | Wishlist replaces `/`. Existing landing page moves to `/preview`. |
| Storage | Supabase table `wishlist_signups`. |
| Schema | `id uuid pk, email citext unique, created_at timestamptz, consent_at timestamptz, source text, confirmed boolean` |
| Dedupe | Idempotent UPSERT on email. Always show success state, never reveal whether email already existed. |
| Spam mitigation | Honeypot hidden field + Cloudflare Turnstile. No IP rate limit (Turnstile covers it). |
| Counter source | `SELECT COUNT(DISTINCT email) FROM wishlist_signups`. Real number only. Pre-seeded with 30-50 real consenting Moroccan founders before launch. **Never fake.** |
| Email delivery | Resend transactional. From: `Hicham — Invoicify <hello@invoicify.ma>`. Reply-To: same. |
| Reply receiving | Cloudflare Email Routing forwards `hello@invoicify.ma` to founder's personal Gmail. |
| Launch date | `2026-05-28T09:00:00+01:00` (Africa/Casablanca). Single config constant `LAUNCH_DATE` in `lib/launch-date.ts`. Live countdown computes days from now → `LAUNCH_DATE` and renders everywhere "21 jours" appears. |
| Founder pricing | "50% à vie sur le tarif Pro." Implemented via perpetual Stripe coupon `FOUNDER_LIFETIME_50` attached to user at account creation. Codified in ToS, not on landing copy. |
| Card 03 onboarding | Tiered. `signupCount < 30` → render call-promise variant. `signupCount >= 30` → render async-guide variant. Server-rendered flip. |
| Section 5 screenshots | Real screenshots from a seeded demo workspace with Moroccan SMB data (Atlas Trading SARL, Rabat Logistics, etc.). Day-1 ship: static images. Fast-follow before launch: short MP4 of Devis → Facture conversion. |
| Section 6 testimonials | Three real beta users with written permission to publish name + company. If permissions not secured 48h before ship, **the section is cut**, not shipped with placeholders. |
| OG image | Dynamic via Next.js `ImageResponse` at `/api/og`. Reads `LAUNCH_DATE`, renders current day count. |
| Typography | Inter (body) + Space Grotesk (display, already loaded). **No Fraunces.** |
| CNDP / consent | Implicit-consent line under form. No checkbox. Server records `consent_at` as audit trail. |
| Mentions légales | One-page route at `/mentions-legales` shipped pre-launch. Includes legal entity, ICE, RC, contact email, data treatment description, deletion mechanism (email `hello@invoicify.ma`). |
| Launch-day mechanism | Phase 2 (separate work). Magic-link email → token-to-account creation → coupon attached at user creation → free trial. No card required at launch. |

---

## 2. Hard prelaunch gates (founder responsibility, not coding)

These block launch independently of code. Track them.

- [ ] DNS: SPF (`include:_spf.resend.com`) and DKIM (CNAMEs from Resend dashboard) verified for `invoicify.ma`.
- [ ] DNS: MX records → Cloudflare Email Routing; `hello@invoicify.ma` forwards to founder's inbox.
- [ ] 30-50 real Moroccan founder pre-signups collected (consent: explicit yes) and inserted into `wishlist_signups` before page goes live.
- [ ] 3 written testimonial permissions secured within 48h of ship; otherwise Section 6 is cut, not faked.
- [ ] Demo workspace seeded with realistic Moroccan SMB data (clients, invoices, dashboard activity, sample PDF).
- [ ] First 30 onboarding-call slots reserved on founder's calendar.
- [ ] ToS section codifying "tarif fondateur = 50% off Pro tier for life of subscription" published before launch.
- [ ] Stripe coupon `FOUNDER_LIFETIME_50` (50% off Pro, forever, no expiry) created — Phase 2.

---

## 3. Phase 1 — Wishlist page build list (~3-5 days)

- Supabase migration: `wishlist_signups` table per schema above.
- Move existing `src/app/page.tsx` → `src/app/preview/page.tsx`.
- New `src/app/page.tsx` = wishlist landing (sections 1-8 below).
- `src/app/actions/createWishlistSignup.ts` — server action: verify Turnstile token → reject if honeypot non-empty → UPSERT email + consent_at + source → trigger Resend confirmation → return success.
- `src/app/api/og/route.ts` — dynamic OG image using `next/og`.
- `src/app/mentions-legales/page.tsx` — legal one-pager.
- `src/lib/launch-date.ts` — exports `LAUNCH_DATE` and `daysUntilLaunch()`.
- `src/components/wishlist/Countdown.tsx` — live countdown component.
- `src/components/wishlist/WishlistForm.tsx` — form with honeypot, Turnstile widget, success state replacement.
- Seed script: `scripts/seed-demo-workspace.ts` for screenshot capture.
- Env vars (`.env.local` and prod): `RESEND_API_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.

## 4. Phase 2 — Launch-day cohort migration (~1-2 days, week 2)

- `wishlist_launch_dispatch` table: `(wishlist_id fk, magic_link_token, sent_at, clicked_at, account_id fk nullable)`.
- Magic-link route `app/launch/[token]/page.tsx` — verify token → create Supabase user from email → attach `FOUNDER_LIFETIME_50` coupon to workspace → redirect into onboarding.
- Batch dispatch script — sends magic-link email to all wishlist subscribers 48h before public launch (May 26).
- Stripe coupon creation + per-user attachment logic.

---

## 5. Brand system (already defined in `tailwind.config.ts`)

- **Primary:** `#6366F1` (indigo) — buttons, links, accents
- **Accent:** `#8B5CF6` (purple) — secondary highlights
- **Brand gradient:** `linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)` — H1 keywords, CTAs, logo mark
- **Canvas:** `#020617` (near-black) — body background
- **Card surface:** `rgba(255,255,255,0.025)` — glass morphism
- **Glow shadow:** `0 0 24px rgba(99,102,241,0.35)` — CTAs and key cards
- **Ambient orbs:** large blurred indigo + purple radial glows behind hero and final CTA

### Typography
- **Body:** Inter (already loaded)
- **Display (H1, H2, stat numbers):** Space Grotesk (already loaded). Apply italic on the gradient phrase in the H1.

### Layout rules
- 2 email capture forms (hero + final CTA card). Both submit to the **same server action**.
- Counter appears in 3 places (hero, final CTA stats, anywhere else needed). All read from a **single server-side count query** so the number stays consistent.
- Mobile: stack everything single-column, full-width CTA button, form input + button stack vertically.
- Animations: staggered fade-up on hero load (chip → H1 → subhead → form → counter), subtle hover lift on benefit cards. Tasteful only.

### Form behavior
- Email field: `type="email"`, `required`, `autocomplete="email"`.
- Hidden honeypot field (e.g., `name="company_url"`, `tabIndex={-1}`, `aria-hidden`, off-screen).
- Cloudflare Turnstile widget rendered above submit button. Token validated server-side.
- On submit: replace form with success state inline (don't redirect).
- On duplicate email: still show success state. Optionally re-send confirmation if `re-send` query param present (out of scope for v1).
- Trigger confirmation email on every successful submission.

### What NOT to do
- Don't fake the counter. Use real `COUNT(DISTINCT email)`.
- Don't add features that aren't in this spec (countdown timers beyond the live launch countdown, live signup feeds, exit-intent popups).
- Don't translate any copy to English.
- Don't soften the headlines or add hedging words ("peut-être", "essayez de"). Copy is intentionally direct.
- Don't ship Section 6 with `[Prénom Nom]` placeholders. Real names or section is cut.
- Don't load Fraunces. Decision made to skip; Space Grotesk handles display.

---

# COPY

## SECTION 1 — Nav bar

**Left:** Invoicify logo (image: `/invoicify-logo.png`)
**Right (badge with pulsing dot):** 🟣 Lancement dans `{daysUntilLaunch()}` jours

> Renders "Lancement dans 21 jours" on May 7. Updates live.

---

## SECTION 2 — Hero

**Eyebrow chip:**
🇲🇦 Pour les entrepreneurs marocains — tarif fondateur à vie

**H1:**
Bloquez votre tarif fondateur. *À vie.*

> Apply the brand gradient + italic to "À vie." only. Keep the rest in default text color.

**Subhead:**
Devis, BC, BL et factures conformes (ICE, IF, RC, CNSS) en un seul outil. Inscrivez-vous maintenant — payez le tarif du jour 1, tant que votre compte reste actif. Même dans 5 ans.

**Email field placeholder:** `vous@entreprise.ma`

**CTA button:** Réserver mon tarif

**Under form (consent line, single sentence):**
En vous inscrivant, vous acceptez de recevoir un email de confirmation et notre lien d'accès le jour du lancement. Aucun spam. [Mentions légales](/mentions-legales).

**Trust signals (inline, below consent):**
✓ 30 secondes  ✓ Sans carte  ✓ Sans engagement

**Counter (under trust signals):**
Progress bar (filled = `min(count / 100, 1) * 100%`) + text:
**`{signupCount}`** entrepreneurs déjà inscrits — places limitées au lancement

> `signupCount` is the live `COUNT(DISTINCT email)`. After pre-seeding it will read 30-50 on day 1.

**Success state (replaces form after submit):**
✓ Vous êtes inscrit. Votre tarif fondateur est gelé. On vous envoie votre lien d'accès le jour du lancement.

---

## SECTION 3 — Problem (split layout: text left, screenshot right)

**Eyebrow:** LE PROBLÈME

**H2:**
Word, Excel, papier. Et chaque devis prend 20 minutes.

**Body:**
Les relances passent à la trappe. Vous ne savez jamais qui vous doit combien — ni quand. La conformité ICE, IF, RC, CNSS se gère à la main, à chaque fois.

**Invoicify remplace tout ça.** Une chaîne, un tableau de bord, zéro double-saisie.

**Visual chain (pills with arrows between them):**
Devis → BC → BL → Facture → Paiement

**Right side:** Screenshot — sample invoice PDF generated from the seeded demo workspace.

---

## SECTION 4 — Benefits (4-card grid, 2x2)

**Eyebrow:** CE QUE VOUS OBTENEZ

**H2:**
Quatre raisons de vous inscrire aujourd'hui.

**Sub:**
Réservé aux inscrits avant le jour du lancement. Pas après.

---

**Card 01 — Tarif**
**H3:** Tarif fondateur, gelé à vie.
**Body:** Vous bénéficiez de 50% de réduction sur le tarif Pro, tant que votre abonnement reste actif. Pas d'augmentation. Pas de petites lignes.

**Card 02 — Accès**
**H3:** 48h d'avance sur tout le monde.
**Body:** Vous recevez votre lien d'accès avant l'ouverture publique. Configurez votre workspace pendant que les autres attendent.

**Card 03 — Onboarding** (TIERED — render based on `signupCount`)

> If `signupCount < 30`:
**H3:** On configure votre compte avec vous.
**Body:** Logo, ICE, SMTP, premier devis. Un appel de 20 minutes — réservé aux 30 premiers inscrits. Vous facturez le jour même.

> If `signupCount >= 30`:
**H3:** Onboarding guidé en autonomie.
**Body:** Guide pas-à-pas pour configurer logo, ICE, SMTP et premier devis en 20 minutes. Support prioritaire les 30 premiers jours.

**Card 04 — Roadmap**
**H3:** Vous votez sur les prochaines fonctionnalités.
**Body:** Les inscrits choisissent les 3 prochaines features. Vous construisez l'outil avec nous.

---

## SECTION 5 — Screenshots showcase (3-up grid or carousel)

**Eyebrow:** UN APERÇU

**H2:**
Ce que vous allez utiliser dans 21 jours.

> Subhead reads "21 jours" but should ideally also be driven by `daysUntilLaunch()` for honesty as days pass.

**Sub:**
PDF A4 conforme en moins d'une seconde. Tableau de bord en temps réel. Email automatique à vos clients.

**Captions:**
- Screenshot 1: Tableau de bord — revenus, dépenses, créances en un coup d'œil (real screenshot from seeded demo workspace)
- Screenshot 2: Devis → Facture en un clic, sans double-saisie (static image day 1; replace with short MP4 before launch)
- Screenshot 3: PDF A4 conforme — ICE, IF, RC, CNSS générés automatiquement (real PDF from seeded demo workspace)

---

## SECTION 6 — Testimonials (3 cards) — CONDITIONAL

> Render this section ONLY if 3 real testimonial permissions are secured. Otherwise omit the section entirely; do not ship placeholders.

**Eyebrow:** ILS ONT TESTÉ EN AVANT-PREMIÈRE

**H2:**
Ce que disent les premiers utilisateurs.

**Sub:**
Trois fondateurs marocains qui ont remplacé Excel par Invoicify pendant la beta.

---

**Testimonial 1, 2, 3:** real quotes from real beta users with name, role, company, city. Replaced by founder before merge.

---

## SECTION 7 — Final CTA (centered card with glow)

**Eyebrow:** DERNIÈRE ÉTAPE

**H2:**
Une seule action. Tarif gelé à vie.

**Stats row (3 numbers, gradient on numbers):**
- **`{daysUntilLaunch()}`** — jours avant le lancement
- **`{signupCount}`** — entrepreneurs déjà inscrits
- **∞** — votre tarif, à vie

**Email field placeholder:** `vous@entreprise.ma`

**CTA button:** Je réserve mon tarif

**Under form:**
✓ Lien d'accès envoyé le jour J  ✓ Aucun spam

---

## SECTION 8 — Footer

**Left:** © 2026 Invoicify · Facturation marocaine moderne
**Right:** [Mentions légales](/mentions-legales) · Contact (`mailto:hello@invoicify.ma`)

---

# AUTOMATED CONFIRMATION EMAIL

> Send via Resend immediately after successful signup.
> **From:** `Hicham — Invoicify <hello@invoicify.ma>`
> **Reply-To:** `hello@invoicify.ma` (replies forwarded to founder via Cloudflare Email Routing)

**Subject:** Vous êtes inscrit. Votre tarif est gelé.

**Body:**

Merci.

Vous êtes sur la liste Invoicify. Le jour du lancement (le 28 mai 2026), vous recevez votre lien d'accès — 48h avant tout le monde — et votre tarif fondateur est verrouillé : 50% de réduction sur le tarif Pro, tant que votre abonnement reste actif.

Une question rapide : qu'est-ce qui vous fait perdre le plus de temps dans votre facturation aujourd'hui ? Répondez à cet email, je lis tout.

À très vite,
Hicham — Fondateur, Invoicify

---

# META TAGS (SEO + social sharing)

**Title:** Invoicify — Bloquez votre tarif fondateur à vie · Lancement le 28 mai 2026

**Description:** Devis, BC, BL et factures conformes (ICE, IF, RC, CNSS) en un seul outil. Inscrivez-vous à la liste d'attente et bloquez 50% de réduction sur le tarif Pro tant que votre compte reste actif.

**OG image:** dynamic, served from `/api/og`. Renders gradient background + the H1 + a live "Lancement dans X jours" computed at request time.

---

# A/B TEST VARIATIONS (optional, hero H1 only)

Swap only the H1 — keep everything else identical:

1. **Bloquez votre tarif fondateur. À vie.** *(current — status + guarantee)*
2. **Le tarif que vous voyez aujourd'hui. Pour toujours.** *(promise-led)*
3. **Lancement le 28 mai. Tarif fondateur réservé aux inscrits.** *(urgency-led)*

---

# PRE-LAUNCH CHECKLIST

Before this page goes live, all the following must be true. Owner column shows who handles each.

| Check | Owner |
|---|---|
| Both forms submit to the same server action and store email + consent_at + source | code |
| Honeypot + Turnstile validation working (manual test with empty token rejects) | code |
| UPSERT on duplicate email shows success state (no leak) | code |
| Confirmation email fires on successful submission | code |
| `daysUntilLaunch()` is reading from `LAUNCH_DATE` constant and renders correctly in nav, Section 5, Section 7 | code |
| Counter reads `COUNT(DISTINCT email)` and is consistent across hero + Section 7 | code |
| `/mentions-legales` page exists and footer links to it | code |
| `/preview` route serves the previous landing page (archived `page.tsx`) | code |
| `/api/og` dynamic image renders correctly when shared on WhatsApp / X / LinkedIn | code |
| Favicon and logo paths resolve (`/invoicify-favicon.png`, `/invoicify-logo.png`) | code |
| Mobile tested at 375px width | code |
| Form submission tested with a fake email end-to-end (received in inbox) | code |
| DNS SPF + DKIM verified for `invoicify.ma` in Resend | founder |
| DNS MX → Cloudflare Email Routing forwarding `hello@` to founder's Gmail | founder |
| 30-50 real Moroccan founder pre-signups inserted into `wishlist_signups` | founder |
| 3 real testimonial permissions secured (or Section 6 cut) | founder |
| Demo workspace seeded with realistic Moroccan SMB data | founder |
| First 30 onboarding call slots reserved on calendar | founder |
| ToS section published codifying "50% off Pro for life of subscription" | founder |
