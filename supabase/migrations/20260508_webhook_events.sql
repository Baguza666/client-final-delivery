-- Lemon Squeezy webhook deduplication.
-- The handler INSERTs ON CONFLICT DO NOTHING; if no row is returned, the event
-- has already been processed and the handler is a no-op.

CREATE TABLE IF NOT EXISTS public.webhook_events (
    event_id      TEXT PRIMARY KEY,
    event_type    TEXT NOT NULL,
    payload       JSONB NOT NULL,
    received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at
    ON public.webhook_events(received_at);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- service_role only; no policies for authenticated/anon.
