-- ============================================
-- MODERATOR ROLE MIGRATION — PART 2
-- Run this AFTER Part 1 has been committed
-- ============================================

-- Step 0: Drop the bad recursive policy if it was already applied
DROP POLICY IF EXISTS "moderator_select_users" ON public.users;
DROP POLICY IF EXISTS "moderator_select_tasks" ON public.tasks;
DROP POLICY IF EXISTS "moderator_select_attachments" ON public.attachments;
DROP POLICY IF EXISTS "moderator_select_comments" ON public.comments;
DROP POLICY IF EXISTS "moderator_select_projects" ON public.projects;
DROP POLICY IF EXISTS "moderator_select_clients" ON public.clients;

-- Step 1: SECURITY DEFINER helper (avoids RLS recursion on users table)
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'moderator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Tasks: moderator can view all tasks
CREATE POLICY "moderator_select_tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (public.is_moderator());

-- Attachments: moderator can view all attachments
CREATE POLICY "moderator_select_attachments"
ON public.attachments
FOR SELECT
TO authenticated
USING (public.is_moderator());

-- Comments: moderator can view all comments
CREATE POLICY "moderator_select_comments"
ON public.comments
FOR SELECT
TO authenticated
USING (public.is_moderator());

-- Users: moderator can view all user profiles (names/avatars on tasks)
-- MUST use SECURITY DEFINER function — subquery on users causes infinite recursion
CREATE POLICY "moderator_select_users"
ON public.users
FOR SELECT
TO authenticated
USING (public.is_moderator());

-- Projects: moderator can view projects linked to tasks
CREATE POLICY "moderator_select_projects"
ON public.projects
FOR SELECT
TO authenticated
USING (public.is_moderator());

-- Clients: moderator can view client names linked to tasks
CREATE POLICY "moderator_select_clients"
ON public.clients
FOR SELECT
TO authenticated
USING (public.is_moderator());

-- ============================================
-- Update get_role_dashboard_link to include moderator
-- ============================================

CREATE OR REPLACE FUNCTION public.get_role_dashboard_link(p_role TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE p_role
        WHEN 'creator'         THEN '/creator'
        WHEN 'designer'        THEN '/creator'
        WHEN 'videographer'    THEN '/videographer'
        WHEN 'photographer'    THEN '/photographer'
        WHEN 'editor'          THEN '/editor'
        WHEN 'team_leader'     THEN '/team-leader'
        WHEN 'account_manager' THEN '/account-manager'
        WHEN 'admin'           THEN '/admin/tasks'
        WHEN 'accountant'      THEN '/accountant'
        WHEN 'moderator'       THEN '/moderator'
        ELSE '/creator'
    END;
$$;
