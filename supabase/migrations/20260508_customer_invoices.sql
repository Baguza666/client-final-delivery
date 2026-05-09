-- Customer-facing factures auto-issued per Lemon Squeezy paid event.
-- Separate from LS receipt; this is the Moroccan auto-entrepreneur facture issued
-- by Invoicify (the seller) to the customer (the buyer).
--
-- Numbering is gap-free per year via the customer_invoice_counter row lock.

CREATE TABLE IF NOT EXISTS public.customer_invoices (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id          UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    subscription_id       UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    ls_event_id           TEXT NOT NULL UNIQUE,
    invoice_number        TEXT NOT NULL UNIQUE,
    -- Native MAD amount the buyer owes; matches what's printed on the facture.
    amount_mad            NUMERIC(10,2) NOT NULL,
    -- What was actually charged by Lemon Squeezy (may be USD if MAD unsupported).
    amount_paid_currency  TEXT NOT NULL,
    amount_paid           NUMERIC(10,2) NOT NULL,
    period_start          TIMESTAMPTZ NOT NULL,
    period_end            TIMESTAMPTZ NOT NULL,
    pdf_url               TEXT,
    void                  BOOLEAN NOT NULL DEFAULT FALSE,
    void_reason           TEXT,
    voided_at             TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_invoices_workspace
    ON public.customer_invoices(workspace_id, created_at DESC);

ALTER TABLE public.customer_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_invoices: workspace owner select"
    ON public.customer_invoices FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.workspaces w
                WHERE w.id = workspace_id AND w.owner_id = auth.uid())
    );

-- Counter table: row-level lock guarantees gap-free sequential numbering per year.

CREATE TABLE IF NOT EXISTS public.customer_invoice_counter (
    year      INTEGER PRIMARY KEY,
    last_seq  INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.customer_invoice_counter (year, last_seq)
VALUES (2026, 0)
ON CONFLICT (year) DO NOTHING;

-- Atomic increment helper. Caller wraps in transaction with INSERT into customer_invoices.

CREATE OR REPLACE FUNCTION public.next_customer_invoice_number(p_year INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_seq INTEGER;
BEGIN
    INSERT INTO public.customer_invoice_counter (year, last_seq)
    VALUES (p_year, 1)
    ON CONFLICT (year) DO UPDATE
        SET last_seq = public.customer_invoice_counter.last_seq + 1
    RETURNING last_seq INTO v_seq;

    RETURN format('FAC-AE-%s-%s', p_year::TEXT, lpad(v_seq::TEXT, 5, '0'));
END;
$$;

-- service_role only — webhook handler is the caller.
REVOKE ALL ON FUNCTION public.next_customer_invoice_number(INTEGER) FROM PUBLIC;
