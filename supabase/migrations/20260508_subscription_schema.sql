-- Subscription schema foundation for Pro/Business tiers.
-- Adds tier columns to workspaces and a subscriptions table tracking the
-- Lemon Squeezy subscription, money-back window, and dunning state.

-- ─── 1. Enums ────────────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE public.tier_type AS ENUM ('free', 'pro', 'business');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. Subscriptions table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id             UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    tier                     public.tier_type NOT NULL,
    status                   public.subscription_status NOT NULL,
    provider                 TEXT NOT NULL DEFAULT 'lemonsqueezy',
    provider_subscription_id TEXT,
    provider_customer_id     TEXT,
    cadence                  TEXT CHECK (cadence IN ('monthly', 'annual')),
    first_paid_at            TIMESTAMPTZ NOT NULL,
    current_period_start     TIMESTAMPTZ NOT NULL,
    current_period_end       TIMESTAMPTZ NOT NULL,
    cancel_at_period_end     BOOLEAN NOT NULL DEFAULT FALSE,
    founding_code_redeemed   BOOLEAN NOT NULL DEFAULT FALSE,
    decline_reason           TEXT,
    dunning_state            TEXT CHECK (dunning_state IN ('soft', 'hard', 'expired')),
    next_retry_at            TIMESTAMPTZ,
    retry_attempts           INTEGER NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id
    ON public.subscriptions(workspace_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_id
    ON public.subscriptions(provider, provider_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_dunning_retry
    ON public.subscriptions(next_retry_at)
    WHERE dunning_state IS NOT NULL AND next_retry_at IS NOT NULL;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions: workspace owner select"
    ON public.subscriptions FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.workspaces w
                WHERE w.id = workspace_id AND w.owner_id = auth.uid())
    );

-- INSERT/UPDATE/DELETE intentionally restricted to service role (webhook handler).

-- ─── 3. Workspaces tier columns ──────────────────────────────────────────────

ALTER TABLE public.workspaces
    ADD COLUMN IF NOT EXISTS tier              public.tier_type NOT NULL DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS tier_at_peak      public.tier_type NOT NULL DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS subscription_id   UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS account_credit_mad NUMERIC(10,2) NOT NULL DEFAULT 0;

-- updated_at trigger for subscriptions

CREATE OR REPLACE FUNCTION public.touch_subscription_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.touch_subscription_updated_at();
