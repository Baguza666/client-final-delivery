-- Wishlist signups for the May 28, 2026 launch.
-- Public unauthenticated INSERT (anon role); count exposed via SECURITY DEFINER function.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS public.wishlist_signups (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    email       CITEXT      UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    consent_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    source      TEXT,
    confirmed   BOOLEAN     DEFAULT false NOT NULL
);

ALTER TABLE public.wishlist_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wishlist_anon_insert" ON public.wishlist_signups;
CREATE POLICY "wishlist_anon_insert"
    ON public.wishlist_signups
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "wishlist_no_read" ON public.wishlist_signups;
CREATE POLICY "wishlist_no_read"
    ON public.wishlist_signups
    FOR SELECT
    TO anon, authenticated
    USING (false);

CREATE OR REPLACE FUNCTION public.get_wishlist_count()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(DISTINCT email)::BIGINT FROM public.wishlist_signups;
$$;

GRANT EXECUTE ON FUNCTION public.get_wishlist_count() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.upsert_wishlist_signup(p_email CITEXT, p_source TEXT)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.wishlist_signups (email, source)
    VALUES (p_email, p_source)
    ON CONFLICT (email) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_wishlist_signup(CITEXT, TEXT) TO anon, authenticated;
