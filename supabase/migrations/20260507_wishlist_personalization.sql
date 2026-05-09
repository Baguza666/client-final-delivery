-- Adds optional first-name field to wishlist signups and replaces the upsert RPC
-- to also return the queue position and whether the row was newly inserted.
-- Apply after 20260507_wishlist_signups.sql.

ALTER TABLE public.wishlist_signups
    ADD COLUMN IF NOT EXISTS name TEXT;

DROP FUNCTION IF EXISTS public.upsert_wishlist_signup(CITEXT, TEXT);

CREATE OR REPLACE FUNCTION public.upsert_wishlist_signup(
    p_email  CITEXT,
    p_name   TEXT,
    p_source TEXT
)
RETURNS TABLE(queue_position BIGINT, was_new BOOLEAN)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rows_inserted INTEGER := 0;
BEGIN
    INSERT INTO public.wishlist_signups (email, name, source)
    VALUES (p_email, NULLIF(p_name, ''), p_source)
    ON CONFLICT (email) DO NOTHING;

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;

    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::BIGINT
         FROM public.wishlist_signups w2
         WHERE w2.created_at <= ws.created_at) AS queue_position,
        (rows_inserted = 1) AS was_new
    FROM public.wishlist_signups ws
    WHERE ws.email = p_email
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_wishlist_signup(CITEXT, TEXT, TEXT) TO anon, authenticated;
