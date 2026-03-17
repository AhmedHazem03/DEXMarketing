-- ============================================================
-- FIX: Allow multiple client_accounts per client
-- Problem: A UNIQUE constraint on client_id in client_accounts
--          prevents creating more than one account per client.
-- Solution: Drop any unique constraint / unique index on client_id
--            so clients can subscribe to multiple packages.
-- NOTE: The schema comment in migration_v6 already states:
--       "No UNIQUE constraint on client_id - clients can have multiple packages"
-- ============================================================

-- 1. Drop named unique constraints that may have been added manually
ALTER TABLE public.client_accounts
    DROP CONSTRAINT IF EXISTS client_accounts_client_id_key;

ALTER TABLE public.client_accounts
    DROP CONSTRAINT IF EXISTS uq_client_accounts_client_id;

ALTER TABLE public.client_accounts
    DROP CONSTRAINT IF EXISTS client_accounts_unique_client;

-- 2. Drop any unique index on client_id (covers Supabase-dashboard-created indexes)
DROP INDEX IF EXISTS public.client_accounts_client_id_key;
DROP INDEX IF EXISTS public.uq_client_accounts_client_id;
DROP INDEX IF EXISTS public.unique_client_accounts_client_id;

-- 3. Ensure the plain (non-unique) index still exists for query performance
CREATE INDEX IF NOT EXISTS idx_client_accounts_client_id
    ON public.client_accounts (client_id);

-- 4. Confirm RLS INSERT policy allows admin / accountant to create accounts freely
--    (re-creates the policy to be sure no older restrictive version is active)
DROP POLICY IF EXISTS "Admin and accountant can create client accounts" ON public.client_accounts;
CREATE POLICY "Admin and accountant can create client accounts"
    ON public.client_accounts
    FOR INSERT
    WITH CHECK (public.is_accountant_or_admin());

-- Done: clients can now have multiple accounts / package subscriptions
COMMENT ON TABLE public.client_accounts IS
    'Client package subscriptions — one client can hold multiple active packages (no unique constraint on client_id).';
