-- Volume-counter RPCs for freemium enforcement.
-- monthly_invoice_count counts invoices the workspace has created this calendar month.
-- monthly_ai_message_count counts AI chat messages for the same window.

-- AI chat messages: created here so the counter has something to query.
-- If the AI conversation is moved to a different table later, update the function below.

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
    content       JSONB NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_chat_messages: workspace owner full access"
    ON public.ai_chat_messages FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.workspaces w
                WHERE w.id = workspace_id AND w.owner_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.workspaces w
                WHERE w.id = workspace_id AND w.owner_id = auth.uid())
    );

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_workspace_created_at
    ON public.ai_chat_messages(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_workspace_created_at
    ON public.invoices(workspace_id, created_at DESC);

-- ─── monthly_invoice_count ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.monthly_invoice_count(
    p_workspace_id UUID,
    p_year_month   TEXT  -- 'YYYY-MM'
)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::INT
    FROM public.invoices
    WHERE workspace_id = p_workspace_id
      AND to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') = p_year_month;
$$;

GRANT EXECUTE ON FUNCTION public.monthly_invoice_count(UUID, TEXT) TO authenticated;

-- ─── monthly_ai_message_count ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.monthly_ai_message_count(
    p_workspace_id UUID,
    p_year_month   TEXT
)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::INT
    FROM public.ai_chat_messages
    WHERE workspace_id = p_workspace_id
      AND role = 'user'  -- count user prompts only, not assistant/tool replies
      AND to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') = p_year_month;
$$;

GRANT EXECUTE ON FUNCTION public.monthly_ai_message_count(UUID, TEXT) TO authenticated;
