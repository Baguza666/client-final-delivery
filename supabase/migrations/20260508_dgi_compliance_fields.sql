-- DGI e-invoicing compliance preparation.
-- Adds fiscal-classification fields to workspaces + clients, currency / document-type /
-- hash / signature columns to invoices, quotes, purchase_orders, delivery_notes,
-- VAT amount + exoneration flag and rate constraint to invoice_items.
--
-- document_hash and signature_blob remain NULL until the DGI publishes the UBL spec.
-- Backfill assumes existing rows are MAD invoices (document_type_code='380').

-- ─── 1. Tax-regime enum ──────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE public.tax_regime_type AS ENUM (
        'auto_entrepreneur',
        'cpu',         -- Contribution Professionnelle Unique
        'rns',         -- Régime du Résultat Net Simplifié
        'rnr',         -- Régime du Résultat Net Réel
        'forfait',     -- Régime du Forfait
        'none'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. Workspaces (seller fiscal info) ──────────────────────────────────────
-- workspaces.tax_id already stores IF; ice/rc/cnss/tp/bank_name/rib already exist.

ALTER TABLE public.workspaces
    ADD COLUMN IF NOT EXISTS tax_regime public.tax_regime_type NOT NULL DEFAULT 'auto_entrepreneur';

-- ─── 3. Clients (buyer fiscal info) ──────────────────────────────────────────
-- clients.ice already exists.

ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS "if"           TEXT,
    ADD COLUMN IF NOT EXISTS tax_regime     public.tax_regime_type,
    ADD COLUMN IF NOT EXISTS country_code   TEXT NOT NULL DEFAULT 'MA';

-- ─── 4. Document-level fiscal columns ────────────────────────────────────────

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS currency_code      TEXT NOT NULL DEFAULT 'MAD',
    ADD COLUMN IF NOT EXISTS document_type_code TEXT,
    ADD COLUMN IF NOT EXISTS document_hash      TEXT,
    ADD COLUMN IF NOT EXISTS signature_blob     TEXT;

ALTER TABLE public.quotes
    ADD COLUMN IF NOT EXISTS currency_code      TEXT NOT NULL DEFAULT 'MAD',
    ADD COLUMN IF NOT EXISTS document_type_code TEXT,
    ADD COLUMN IF NOT EXISTS document_hash      TEXT,
    ADD COLUMN IF NOT EXISTS signature_blob     TEXT;

ALTER TABLE public.purchase_orders
    ADD COLUMN IF NOT EXISTS currency_code      TEXT NOT NULL DEFAULT 'MAD',
    ADD COLUMN IF NOT EXISTS document_type_code TEXT,
    ADD COLUMN IF NOT EXISTS document_hash      TEXT,
    ADD COLUMN IF NOT EXISTS signature_blob     TEXT;

ALTER TABLE public.delivery_notes
    ADD COLUMN IF NOT EXISTS currency_code      TEXT NOT NULL DEFAULT 'MAD',
    ADD COLUMN IF NOT EXISTS document_type_code TEXT,
    ADD COLUMN IF NOT EXISTS document_hash      TEXT,
    ADD COLUMN IF NOT EXISTS signature_blob     TEXT;

-- Backfill: invoices get the UBL "commercial invoice" type code.
UPDATE public.invoices SET document_type_code = '380' WHERE document_type_code IS NULL;

-- ─── 5. Invoice line items: VAT amount + exoneration ─────────────────────────

ALTER TABLE public.invoice_items
    ADD COLUMN IF NOT EXISTS vat_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tva_exonere   BOOLEAN NOT NULL DEFAULT FALSE;

-- Recompute vat_amount for legacy rows: quantity * unit_price * tva_rate / 100.
UPDATE public.invoice_items
SET vat_amount = ROUND(quantity * unit_price * (COALESCE(tva_rate, 0) / 100.0), 2)
WHERE vat_amount = 0;

-- For auto-entrepreneur sellers, mark all existing line items as TVA-exonérée and rate=0.
UPDATE public.invoice_items
SET tva_exonere = TRUE,
    tva_rate    = 0,
    vat_amount  = 0
WHERE invoice_id IN (
    SELECT i.id FROM public.invoices i
    JOIN public.workspaces w ON w.id = i.workspace_id
    WHERE w.tax_regime = 'auto_entrepreneur'
);

-- Constrain TVA rate to canonical Moroccan set + 0 for exonerated lines.
DO $$ BEGIN
    ALTER TABLE public.invoice_items
        ADD CONSTRAINT invoice_items_tva_rate_check
        CHECK (tva_rate IN (0, 7, 10, 14, 20));
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN check_violation THEN
            RAISE NOTICE 'tva_rate constraint not added: legacy rows hold a non-canonical rate. Clean up data first.';
END $$;
