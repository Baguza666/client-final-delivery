-- Anti-abuse signal columns on workspaces.
-- email_verified_at gates first-invoice creation; signup_ip / domain / user_agent feed
-- a weekly metrics cron that surfaces clustered fraudulent signups.

ALTER TABLE public.workspaces
    ADD COLUMN IF NOT EXISTS signup_ip           INET,
    ADD COLUMN IF NOT EXISTS signup_email_domain TEXT,
    ADD COLUMN IF NOT EXISTS signup_user_agent   TEXT,
    ADD COLUMN IF NOT EXISTS email_verified_at   TIMESTAMPTZ;

-- Backfill: assume legacy users are verified at row creation time.
UPDATE public.workspaces
SET email_verified_at = created_at
WHERE email_verified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_signup_ip ON public.workspaces(signup_ip);
CREATE INDEX IF NOT EXISTS idx_workspaces_signup_email_domain ON public.workspaces(signup_email_domain);
