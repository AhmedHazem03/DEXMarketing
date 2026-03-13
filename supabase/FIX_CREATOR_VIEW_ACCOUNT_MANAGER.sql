-- ============================================
-- FIX: Allow creators & designers to view their account_manager
-- Date: 2026-03-13
-- ============================================
-- Root cause:
--   The users table RLS only allows team_leader/account_manager/admin to
--   SELECT other users. Creators querying for their account_manager via
--   useMyDepartmentLeader() get NULL silently → "لم يتم العثور على قائد الفريق"
--
-- IMPORTANT: Policies on public.users must NEVER contain subqueries that
--   SELECT from public.users — this causes infinite recursion → 500 errors.
--   All role checks must go through SECURITY DEFINER functions.
--
-- Fix 1: SECURITY DEFINER functions for safe role checking (no recursion)
-- Fix 2: DROP the bad recursive policies if they were applied
-- Fix 3: Add policies using the safe functions
-- Fix 4: Backfill department for account_managers and designers
-- ============================================

-- ============================================
-- 1. Drop bad recursive policies (from previous broken migration)
-- ============================================
DROP POLICY IF EXISTS "Content team can view account manager" ON public.users;
DROP POLICY IF EXISTS "Photography team can view team leader" ON public.users;

-- ============================================
-- 2. SECURITY DEFINER helper: is the current user a content team member?
--    (creator or designer)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_content_team_member()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('creator', 'designer')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 3. SECURITY DEFINER helper: is the current user a photography team member?
--    (photographer, videographer, editor)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_photography_team_member()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('photographer', 'videographer', 'editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 4. Policy: content team (creator/designer) can view account_managers
--    Uses SECURITY DEFINER function — no recursion
-- ============================================
DROP POLICY IF EXISTS "Content team can view account manager" ON public.users;

CREATE POLICY "Content team can view account manager" ON public.users
  FOR SELECT USING (
    public.is_content_team_member()
    AND role = 'account_manager'
  );

-- ============================================
-- 5. Policy: photography team can view team_leaders
--    Uses SECURITY DEFINER function — no recursion
-- ============================================
DROP POLICY IF EXISTS "Photography team can view team leader" ON public.users;

CREATE POLICY "Photography team can view team leader" ON public.users
  FOR SELECT USING (
    public.is_photography_team_member()
    AND role = 'team_leader'
  );

-- ============================================
-- 6. Backfill: set correct department for ALL roles that were created with null
--    - content dept: creator, designer, account_manager → 'content'
--    - photography dept: photographer, videographer, editor, team_leader → 'photography'
-- ============================================
UPDATE public.users
SET department = 'content'
WHERE role IN ('creator', 'designer', 'account_manager')
  AND department IS NULL;

UPDATE public.users
SET department = 'photography'
WHERE role IN ('photographer', 'videographer', 'editor', 'team_leader')
  AND department IS NULL;

-- ============================================
-- RESULT:
--   ✅ Creators and designers can now find their account_manager
--   ✅ Photography team can now find their team_leader
--   ✅ No infinite recursion — all role checks use SECURITY DEFINER functions
--   ✅ Backfills missing department values for existing users
-- ============================================

