-- ════════════════════════════════════════════════════════════════════════════
-- Migration V14: Complete Notification System Overhaul
-- ════════════════════════════════════════════════════════════════════════════
-- Adds notification_type + entity_id columns, updates all existing triggers
-- to include the new columns, and introduces 10 new/expanded trigger functions
-- covering tasks, schedules, treasury, advances, users, clients, projects,
-- and client accounts.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 1: Schema changes
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS notification_type TEXT NOT NULL DEFAULT 'general',
    ADD COLUMN IF NOT EXISTS entity_id         UUID;

CREATE INDEX IF NOT EXISTS idx_notifications_type
    ON public.notifications(notification_type);

CREATE INDEX IF NOT EXISTS idx_notifications_entity
    ON public.notifications(entity_id);

-- Backfill existing rows (best-effort, keyword-based)
UPDATE public.notifications
SET    notification_type = 'task'
WHERE  notification_type = 'general'
  AND  (title ILIKE '%مهمة%' OR title ILIKE '%task%'
        OR title ILIKE '%تعيين%' OR title ILIKE '%مراجعة%'
        OR title ILIKE '%تعديل%' OR title ILIKE '%تسليم%');

UPDATE public.notifications
SET    notification_type = 'chat'
WHERE  notification_type = 'general'
  AND  (title ILIKE '%رسالة%' OR title ILIKE '%message%');

UPDATE public.notifications
SET    notification_type = 'treasury'
WHERE  notification_type = 'general'
  AND  (title ILIKE '%مصروف%' OR title ILIKE '%إيراد%' OR title ILIKE '%معاملة%');

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 2: Helper function — map a user role to its dashboard link
-- ────────────────────────────────────────────────────────────────────────────

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
        ELSE '/creator'
    END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 3: Update existing triggers to include notification_type + entity_id
-- ────────────────────────────────────────────────────────────────────────────

-- 3a. notify_task_assignment — add notification_type = 'task'
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    creator_name   TEXT;
    assignee_role  TEXT;
    assignee_link  TEXT;
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL)
    OR (TG_OP = 'UPDATE'
        AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
        AND NEW.assigned_to IS NOT NULL)
    THEN
        SELECT name        INTO creator_name  FROM public.users WHERE id = NEW.created_by;
        SELECT role::text  INTO assignee_role FROM public.users WHERE id = NEW.assigned_to;
        assignee_link := public.get_role_dashboard_link(assignee_role);

        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        VALUES (
            NEW.assigned_to,
            'مهمة جديدة',
            'تم تعيين مهمة "' || NEW.title || '" لك بواسطة '
                || COALESCE(creator_name, 'المدير'),
            assignee_link,
            'task',
            NEW.id
        );
    END IF;

    -- Notify editor if editor_id assigned/changed
    IF TG_OP = 'UPDATE'
       AND NEW.editor_id IS DISTINCT FROM OLD.editor_id
       AND NEW.editor_id IS NOT NULL
    THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        VALUES (
            NEW.editor_id,
            'مهمة مونتاج جديدة',
            'تم تعيين مهمة مونتاج "' || NEW.title || '" لك',
            '/editor',
            'task',
            NEW.id
        );
    END IF;

    -- Notify all active admins about every new task (gap: إشعار Admin بالمهام الجديدة)
    IF TG_OP = 'INSERT' THEN
        -- Ensure creator_name is fetched even if the first IF block was skipped
        IF creator_name IS NULL AND NEW.created_by IS NOT NULL THEN
            SELECT name INTO creator_name FROM public.users WHERE id = NEW.created_by;
        END IF;

        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        SELECT
            id,
            'مهمة جديدة',
            'تم إنشاء مهمة جديدة "' || NEW.title || '"'
                || CASE WHEN creator_name IS NOT NULL THEN ' بواسطة ' || creator_name ELSE '' END,
            '/admin/tasks',
            'task', NEW.id
        FROM public.users
        WHERE role = 'admin'
          AND is_active = true
          AND id IS DISTINCT FROM NEW.created_by
          AND id IS DISTINCT FROM NEW.assigned_to;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_assigned ON public.tasks;
CREATE TRIGGER on_task_assigned
    AFTER INSERT OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();


-- 3b. notify_client_task_review — add notification_type = 'task'
CREATE OR REPLACE FUNCTION public.notify_client_task_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status::text = 'client_review'
       AND OLD.status IS DISTINCT FROM NEW.status
       AND NEW.client_id IS NOT NULL
    THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        SELECT
            c.user_id,
            'مهمة جاهزة للمراجعة',
            'المهمة "' || NEW.title || '" جاهزة لمراجعتك والموافقة عليها',
            '/client/tasks',
            'task',
            NEW.id
        FROM public.clients c
        WHERE c.id = NEW.client_id
          AND c.user_id IS NOT NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_client_review ON public.tasks;
CREATE TRIGGER on_task_client_review
    AFTER UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.notify_client_task_review();


-- 3c. notify_team_leader_client_response — add notification_type = 'task'
CREATE OR REPLACE FUNCTION public.notify_team_leader_client_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status::text = 'client_review'
       AND NEW.status::text IN ('approved', 'client_revision', 'revision')
       AND NEW.created_by IS NOT NULL
    THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        VALUES (
            NEW.created_by,
            CASE
                WHEN NEW.status::text = 'approved'                        THEN 'تمت الموافقة على المهمة'
                WHEN NEW.status::text IN ('client_revision', 'revision')  THEN 'طلب تعديل من العميل'
            END,
            CASE
                WHEN NEW.status::text = 'approved'
                    THEN 'العميل وافق على المهمة "' || NEW.title || '"'
                WHEN NEW.status::text IN ('client_revision', 'revision')
                    THEN 'العميل طلب تعديلات على المهمة "' || NEW.title || '" — يرجى المراجعة'
            END,
            '/team-leader/revisions',
            'task',
            NEW.id
        );

        -- Also notify account_managers assigned to this client
        -- (gap: إشعار account_manager عند رد العميل بجانب TL)
        IF NEW.client_id IS NOT NULL THEN
            INSERT INTO public.notifications
                (user_id, title, message, link, notification_type, entity_id)
            SELECT
                ca.user_id,
                CASE
                    WHEN NEW.status::text = 'approved'                        THEN 'تمت الموافقة على المهمة'
                    WHEN NEW.status::text IN ('client_revision', 'revision')  THEN 'طلب تعديل من العميل'
                END,
                CASE
                    WHEN NEW.status::text = 'approved'
                        THEN 'العميل وافق على المهمة "' || NEW.title || '"'
                    WHEN NEW.status::text IN ('client_revision', 'revision')
                        THEN 'العميل طلب تعديلات على المهمة "' || NEW.title || '" — يرجى المراجعة'
                END,
                '/account-manager',
                'task',
                NEW.id
            FROM public.client_assignments ca
            JOIN public.users u ON u.id = ca.user_id
            WHERE ca.client_id = NEW.client_id
              AND u.role = 'account_manager'
              AND u.is_active = true
              AND ca.user_id IS DISTINCT FROM NEW.created_by;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_client_review_response ON public.tasks;
CREATE TRIGGER on_client_review_response
    AFTER UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.notify_team_leader_client_response();


-- 3d. notify_workflow_change — add notification_type = 'task'
CREATE OR REPLACE FUNCTION public.notify_workflow_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    worker_name TEXT;
BEGIN
    IF TG_OP != 'UPDATE' OR NEW.workflow_stage IS NOT DISTINCT FROM OLD.workflow_stage THEN
        RETURN NEW;
    END IF;

    IF NEW.workflow_stage IN ('filming_done', 'editing_done', 'shooting_done') THEN
        SELECT name INTO worker_name FROM public.users WHERE id = NEW.assigned_to;

        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        VALUES (
            NEW.created_by,
            'تم إنجاز مرحلة',
            COALESCE(worker_name, 'عضو الفريق')
                || ' أنهى العمل على "' || NEW.title || '"',
            '/team-leader',
            'task',
            NEW.id
        );
    END IF;

    IF NEW.workflow_stage = 'delivered' AND NEW.project_id IS NOT NULL THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        SELECT
            c.user_id,
            'تسليم جديد',
            'تم تسليم "' || NEW.title || '" — يرجى المراجعة',
            '/client/tasks',
            'task',
            NEW.id
        FROM public.projects  p
        JOIN public.clients   c ON c.id = p.client_id
        WHERE p.id = NEW.project_id
          AND c.user_id IS NOT NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_workflow_change ON public.tasks;
CREATE TRIGGER on_workflow_change
    AFTER UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.notify_workflow_change();


-- 3e. notify_new_message — add notification_type = 'chat'
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sender_name TEXT;
BEGIN
    SELECT name INTO sender_name FROM public.users WHERE id = NEW.sender_id;

    INSERT INTO public.notifications
        (user_id, title, message, link, notification_type, entity_id)
    SELECT
        cp.user_id,
        'رسالة جديدة',
        COALESCE(sender_name, 'مستخدم') || ': '
            || LEFT(COALESCE(NEW.content, ''), 80),
        '/team-leader/chat',
        'chat',
        NEW.conversation_id
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id != NEW.sender_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();


-- 3f. notify_request_status_changed — add notification_type = 'task'
CREATE OR REPLACE FUNCTION public.notify_request_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status::text = 'pending_approval'
       AND NEW.status::text IN ('approved', 'rejected')
       AND NEW.created_by IS NOT NULL
    THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        VALUES (
            NEW.created_by,
            CASE
                WHEN NEW.status::text = 'approved' THEN 'تمت الموافقة على طلبك'
                ELSE 'تم رفض طلبك'
            END,
            CASE
                WHEN NEW.status::text = 'approved'
                    THEN 'تمت الموافقة على طلبك "' || NEW.title || '"'
                ELSE
                    'تم رفض طلبك "' || NEW.title || '"'
            END,
            '/client',
            'task',
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_request_status_changed ON public.tasks;
CREATE TRIGGER on_request_status_changed
    AFTER UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.notify_request_status_changed();


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 4: New trigger — task status transitions
-- Covers: new→in_progress, in_progress→review, review→approved,
--         review→revision, revision→in_progress, approved→completed
-- Intentionally skips client_review transitions (handled by existing triggers)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_task_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    assignee_name  TEXT;
    creator_role   TEXT;
    creator_link   TEXT;
    assignee_role  TEXT;
    assignee_link  TEXT;
BEGIN
    -- Skip when status didn't change
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    -- Skip transitions already handled by notify_client_task_review
    --   and notify_team_leader_client_response
    IF NEW.status::text = 'client_review'
       OR OLD.status::text = 'client_review'
    THEN
        RETURN NEW;
    END IF;

    SELECT name       INTO assignee_name FROM public.users WHERE id = NEW.assigned_to;
    SELECT role::text INTO creator_role  FROM public.users WHERE id = NEW.created_by;
    creator_link := public.get_role_dashboard_link(creator_role);

    -- ── new → in_progress: notify created_by ──
    IF OLD.status::text = 'new' AND NEW.status::text = 'in_progress'
       AND NEW.created_by IS NOT NULL
       AND NEW.created_by IS DISTINCT FROM NEW.assigned_to
    THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        VALUES (
            NEW.created_by,
            'بدأ العمل على مهمة',
            COALESCE(assignee_name, 'عضو الفريق')
                || ' بدأ العمل على "' || NEW.title || '"',
            creator_link,
            'task', NEW.id
        );
    END IF;

    -- ── in_progress → review: notify created_by ──
    IF OLD.status::text = 'in_progress' AND NEW.status::text = 'review'
       AND NEW.created_by IS NOT NULL
    THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        VALUES (
            NEW.created_by,
            'مهمة جاهزة للمراجعة',
            COALESCE(assignee_name, 'عضو الفريق')
                || ' أنهى العمل على "' || NEW.title || '" وتحتاج مراجعتك',
            creator_link,
            'task', NEW.id
        );
    END IF;

    -- ── review → approved (internal, no client): notify assigned_to ──
    IF OLD.status::text = 'review' AND NEW.status::text = 'approved'
       AND NEW.assigned_to IS NOT NULL
    THEN
        SELECT role::text INTO assignee_role FROM public.users WHERE id = NEW.assigned_to;
        assignee_link := public.get_role_dashboard_link(assignee_role);

        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        VALUES (
            NEW.assigned_to,
            'تمت الموافقة على مهمتك',
            'تمت الموافقة على المهمة "' || NEW.title || '"',
            assignee_link,
            'task', NEW.id
        );
    END IF;

    -- ── review → revision: notify assigned_to ──
    IF OLD.status::text = 'review' AND NEW.status::text = 'revision'
       AND NEW.assigned_to IS NOT NULL
    THEN
        SELECT role::text INTO assignee_role FROM public.users WHERE id = NEW.assigned_to;
        assignee_link := public.get_role_dashboard_link(assignee_role);

        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        VALUES (
            NEW.assigned_to,
            'مطلوب تعديلات على مهمتك',
            'تم طلب تعديلات على المهمة "' || NEW.title || '"'
                || CASE
                    WHEN NEW.client_feedback IS NOT NULL
                    THEN ' — ' || LEFT(NEW.client_feedback, 100)
                    ELSE ''
                   END,
            assignee_link,
            'task', NEW.id
        );
    END IF;

    -- ── revision → in_progress: notify created_by ──
    IF OLD.status::text = 'revision' AND NEW.status::text = 'in_progress'
       AND NEW.created_by IS NOT NULL
       AND NEW.created_by IS DISTINCT FROM NEW.assigned_to
    THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        VALUES (
            NEW.created_by,
            'بدأ العمل على التعديلات',
            COALESCE(assignee_name, 'عضو الفريق')
                || ' بدأ العمل على تعديلات "' || NEW.title || '"',
            creator_link,
            'task', NEW.id
        );
    END IF;

    -- ── approved → completed: notify assigned_to + all admins ──
    IF OLD.status::text = 'approved' AND NEW.status::text = 'completed' THEN
        IF NEW.assigned_to IS NOT NULL THEN
            SELECT role::text INTO assignee_role FROM public.users WHERE id = NEW.assigned_to;
            assignee_link := public.get_role_dashboard_link(assignee_role);

            INSERT INTO public.notifications
                (user_id, title, message, link, notification_type, entity_id)
            VALUES (
                NEW.assigned_to,
                'مهمة مكتملة',
                'المهمة "' || NEW.title || '" تم تحديدها كمكتملة',
                assignee_link,
                'task', NEW.id
            );
        END IF;

        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        SELECT
            id,
            'مهمة مكتملة',
            'المهمة "' || NEW.title || '" تم إكمالها',
            '/admin/tasks',
            'task', NEW.id
        FROM public.users
        WHERE role = 'admin'
          AND is_active = true
          AND id IS DISTINCT FROM NEW.assigned_to;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_status_change ON public.tasks;
CREATE TRIGGER on_task_status_change
    AFTER UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.notify_task_status_change();


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 5: New trigger — task field changes (priority, deadline)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_task_field_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    assignee_role TEXT;
    assignee_link TEXT;
BEGIN
    IF NEW.assigned_to IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT role::text INTO assignee_role FROM public.users WHERE id = NEW.assigned_to;
    assignee_link := public.get_role_dashboard_link(assignee_role);

    -- Priority changed
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        VALUES (
            NEW.assigned_to,
            'تغيير أولوية مهمة',
            'تم تغيير أولوية المهمة "' || NEW.title || '" إلى '
                || CASE NEW.priority
                    WHEN 'urgent' THEN 'عاجلة 🔴'
                    WHEN 'high'   THEN 'عالية 🟠'
                    WHEN 'medium' THEN 'متوسطة 🟡'
                    ELSE 'منخفضة 🟢'
                   END,
            assignee_link,
            'task', NEW.id
        );
    END IF;

    -- Deadline changed
    IF OLD.deadline IS DISTINCT FROM NEW.deadline AND NEW.deadline IS NOT NULL THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        VALUES (
            NEW.assigned_to,
            'تغيير موعد تسليم مهمة',
            'تم تغيير موعد تسليم المهمة "' || NEW.title || '" إلى '
                || to_char(NEW.deadline AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
            assignee_link,
            'task', NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_field_change ON public.tasks;
CREATE TRIGGER on_task_field_change
    AFTER UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.notify_task_field_change();


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 6: New trigger — task deletion
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_task_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Notify the assignee
    IF OLD.assigned_to IS NOT NULL THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type)
        VALUES (
            OLD.assigned_to,
            'تم حذف مهمة',
            'تم حذف المهمة "' || OLD.title || '" التي كانت معينة لك',
            '/creator',
            'task'
        );
    END IF;

    -- Notify all active admins (skip if they are the assignee)
    INSERT INTO public.notifications
        (user_id, title, message, link, notification_type)
    SELECT
        id,
        'تم حذف مهمة',
        'تم حذف المهمة "' || OLD.title || '"',
        '/admin/tasks',
        'task'
    FROM public.users
    WHERE role = 'admin'
      AND is_active = true
      AND id IS DISTINCT FROM OLD.assigned_to;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_task_deleted ON public.tasks;
CREATE TRIGGER on_task_deleted
    AFTER DELETE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.notify_task_deleted();


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 7: New trigger — schedule CRUD
-- Schedules table uses team_leader_id (not created_by)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_schedule_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    member_id      UUID;
    members        UUID[];
    tl_id          UUID;
    creator_name   TEXT;
    schedule_title TEXT;
    client_user_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        schedule_title := OLD.title;
        members        := COALESCE(OLD.assigned_members, ARRAY[]::UUID[]);
        tl_id          := OLD.team_leader_id;
    ELSE
        schedule_title := NEW.title;
        members        := COALESCE(NEW.assigned_members, ARRAY[]::UUID[]);
        tl_id          := NEW.team_leader_id;
    END IF;

    SELECT name INTO creator_name FROM public.users WHERE id = tl_id;

    -- ── INSERT: notify assigned_members and client ──
    IF TG_OP = 'INSERT' THEN
        FOREACH member_id IN ARRAY members LOOP
            IF member_id IS DISTINCT FROM tl_id THEN
                INSERT INTO public.notifications
                    (user_id, title, message, link, notification_type, entity_id)
                VALUES (
                    member_id,
                    'جدول جديد',
                    COALESCE(creator_name, 'قائد الفريق')
                        || ' أنشأ جدول "' || schedule_title
                        || '" في ' || NEW.scheduled_date::text,
                    '/team-leader/schedule',
                    'schedule', NEW.id
                );
            END IF;
        END LOOP;

        IF NEW.client_id IS NOT NULL THEN
            SELECT user_id INTO client_user_id
            FROM public.clients
            WHERE id = NEW.client_id;

            IF client_user_id IS NOT NULL THEN
                INSERT INTO public.notifications
                    (user_id, title, message, link, notification_type, entity_id)
                VALUES (
                    client_user_id,
                    'موعد جديد',
                    'تم تحديد موعد "' || schedule_title
                        || '" في ' || NEW.scheduled_date::text,
                    '/client/schedule',
                    'schedule', NEW.id
                );
            END IF;
        END IF;
    END IF;

    -- ── UPDATE ──
    IF TG_OP = 'UPDATE' THEN

        -- Status changed → notify members + team_leader
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            FOREACH member_id IN ARRAY members LOOP
                INSERT INTO public.notifications
                    (user_id, title, message, link, notification_type, entity_id)
                VALUES (
                    member_id,
                    'تحديث حالة جدول',
                    'تم تغيير حالة الجدول "' || schedule_title
                        || '" إلى ' || NEW.status::text,
                    '/team-leader/schedule',
                    'schedule', NEW.id
                );
            END LOOP;

            -- Notify team_leader if not already in members
            IF tl_id IS NOT NULL AND NOT (tl_id = ANY(members)) THEN
                INSERT INTO public.notifications
                    (user_id, title, message, link, notification_type, entity_id)
                VALUES (
                    tl_id,
                    'تحديث حالة جدول',
                    'تم تغيير حالة الجدول "' || schedule_title
                        || '" إلى ' || NEW.status::text,
                    '/team-leader/schedule',
                    'schedule', NEW.id
                );
            END IF;
        END IF;

        -- approval_status changed → notify team_leader
        IF OLD.approval_status IS DISTINCT FROM NEW.approval_status
           AND NEW.approval_status::text IN ('approved', 'rejected')
           AND tl_id IS NOT NULL
        THEN
            INSERT INTO public.notifications
                (user_id, title, message, link, notification_type, entity_id)
            VALUES (
                tl_id,
                CASE NEW.approval_status::text
                    WHEN 'approved' THEN 'تمت الموافقة على الجدول'
                    ELSE 'تم رفض الجدول'
                END,
                CASE NEW.approval_status::text
                    WHEN 'approved'
                        THEN 'تمت الموافقة على الجدول "' || schedule_title || '"'
                    ELSE
                        'تم رفض الجدول "' || schedule_title || '"'
                        || CASE WHEN NEW.manager_notes IS NOT NULL
                                THEN ' — ' || LEFT(NEW.manager_notes, 100)
                                ELSE '' END
                END,
                '/team-leader/schedule',
                'schedule', NEW.id
            );
        END IF;

        -- missing_items resolved → notify team_leader
        IF OLD.missing_items_status IS DISTINCT FROM NEW.missing_items_status
           AND NEW.missing_items_status::text = 'resolved'
           AND tl_id IS NOT NULL
        THEN
            INSERT INTO public.notifications
                (user_id, title, message, link, notification_type, entity_id)
            VALUES (
                tl_id,
                'تم حل نواقص الجدول',
                'تم حل نواقص الجدول "' || schedule_title || '"',
                '/team-leader/schedule',
                'schedule', NEW.id
            );
        END IF;

        -- Time/date/location changed → notify members
        IF OLD.start_time         IS DISTINCT FROM NEW.start_time
        OR OLD.scheduled_date     IS DISTINCT FROM NEW.scheduled_date
        OR OLD.location           IS DISTINCT FROM NEW.location
        THEN
            FOREACH member_id IN ARRAY members LOOP
                INSERT INTO public.notifications
                    (user_id, title, message, link, notification_type, entity_id)
                VALUES (
                    member_id,
                    'تحديث تفاصيل جدول',
                    'تم تحديث تفاصيل الجدول "' || schedule_title
                        || '" (الوقت/المكان/التاريخ)',
                    '/team-leader/schedule',
                    'schedule', NEW.id
                );
            END LOOP;
        END IF;
    END IF;

    -- ── DELETE: notify assigned_members ──
    IF TG_OP = 'DELETE' THEN
        FOREACH member_id IN ARRAY members LOOP
            INSERT INTO public.notifications
                (user_id, title, message, link, notification_type)
            VALUES (
                member_id,
                'تم إلغاء جدول',
                'تم حذف الجدول "' || schedule_title || '"',
                '/team-leader/schedule',
                'schedule'
            );
        END LOOP;

        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_schedule_change ON public.schedules;
CREATE TRIGGER on_schedule_change
    AFTER INSERT OR UPDATE OR DELETE ON public.schedules
    FOR EACH ROW EXECUTE FUNCTION public.notify_schedule_change();


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 8: Replace notify_on_transaction_change with notify_transaction_full
-- Covers: INSERT (notify client + admin + accountant),
--         UPDATE approval (notify creator + client),
--         DELETE (notify admin + accountant)
-- ────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_transaction_notify ON public.transactions;

CREATE OR REPLACE FUNCTION public.notify_transaction_full()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    client_user_id UUID;
    tx_label       TEXT;
BEGIN
    -- ── INSERT ──
    IF TG_OP = 'INSERT' THEN
        tx_label := CASE WHEN NEW.type = 'expense' THEN 'مصروف' ELSE 'إيراد' END;

        -- Notify client if visible
        IF NEW.client_id IS NOT NULL AND NEW.visible_to_client = true THEN
            SELECT user_id INTO client_user_id
            FROM public.clients WHERE id = NEW.client_id;

            IF client_user_id IS NOT NULL THEN
                INSERT INTO public.notifications
                    (user_id, title, message, link, notification_type, entity_id)
                VALUES (
                    client_user_id,
                    tx_label || ' جديد',
                    'تم تسجيل معاملة: '
                        || COALESCE(NEW.description, 'معاملة مالية')
                        || ' — المبلغ: ' || NEW.amount::text || ' ج.م',
                    '/client/account',
                    'treasury', NEW.id
                );
            END IF;
        END IF;

        -- Notify admin + accountant (skip the creator)
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        SELECT
            id,
            'معاملة مالية جديدة',
            tx_label || ' جديد: '
                || COALESCE(NEW.description, '') || ' — '
                || NEW.amount::text || ' ج.م',
            CASE WHEN role = 'admin' THEN '/admin/treasury' ELSE '/accountant' END,
            'treasury', NEW.id
        FROM public.users
        WHERE role IN ('admin', 'accountant')
          AND is_active = true
          AND id IS DISTINCT FROM NEW.created_by;
    END IF;

    -- ── UPDATE: approval ──
    IF TG_OP = 'UPDATE'
       AND (OLD.is_approved IS NULL OR OLD.is_approved = false)
       AND NEW.is_approved = true
    THEN
        -- Notify creator
        IF NEW.created_by IS NOT NULL THEN
            INSERT INTO public.notifications
                (user_id, title, message, link, notification_type, entity_id)
            VALUES (
                NEW.created_by,
                'تم اعتماد معاملتك',
                'تم اعتماد المعاملة "'
                    || COALESCE(NEW.description, 'معاملة') || '" — '
                    || NEW.amount::text || ' ج.م',
                '/accountant',
                'treasury', NEW.id
            );
        END IF;

        -- Notify client if visible
        IF NEW.client_id IS NOT NULL AND NEW.visible_to_client = true THEN
            SELECT user_id INTO client_user_id
            FROM public.clients WHERE id = NEW.client_id;

            IF client_user_id IS NOT NULL THEN
                INSERT INTO public.notifications
                    (user_id, title, message, link, notification_type, entity_id)
                VALUES (
                    client_user_id,
                    'تم اعتماد معاملة في حسابك',
                    'تم اعتماد المعاملة: '
                        || COALESCE(NEW.description, 'معاملة مالية') || ' — '
                        || NEW.amount::text || ' ج.م',
                    '/client/account',
                    'treasury', NEW.id
                );
            END IF;
        END IF;
    END IF;

    -- ── DELETE ──
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type)
        SELECT
            id,
            'تم حذف معاملة',
            'تم حذف معاملة: '
                || COALESCE(OLD.description, 'معاملة مالية') || ' — '
                || OLD.amount::text || ' ج.م',
            CASE WHEN role = 'admin' THEN '/admin/treasury' ELSE '/accountant' END,
            'treasury'
        FROM public.users
        WHERE role IN ('admin', 'accountant')
          AND is_active = true;

        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_transaction_full ON public.transactions;
CREATE TRIGGER on_transaction_full
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.notify_transaction_full();


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 9: New trigger — advances CRUD
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_advance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        SELECT
            id,
            'سلفة جديدة',
            'تم إنشاء سلفة لـ '
                || COALESCE(NEW.recipient_name, 'مستلم') || ' — '
                || NEW.amount::text || ' ج.م',
            '/admin/advances',
            'advance', NEW.id
        FROM public.users
        WHERE role IN ('admin', 'accountant')
          AND is_active = true;
    END IF;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type)
        SELECT
            id,
            'تم حذف سلفة',
            'تم حذف سلفة لـ '
                || COALESCE(OLD.recipient_name, 'مستلم') || ' — '
                || OLD.amount::text || ' ج.م',
            '/admin/advances',
            'advance'
        FROM public.users
        WHERE role IN ('admin', 'accountant')
          AND is_active = true;

        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_advance_change ON public.advances;
CREATE TRIGGER on_advance_change
    AFTER INSERT OR DELETE ON public.advances
    FOR EACH ROW EXECUTE FUNCTION public.notify_advance_change();


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 10: New trigger — user registration & activation
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_user_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        SELECT
            id,
            'مستخدم جديد',
            'تم تسجيل مستخدم جديد: '
                || COALESCE(NEW.name, NEW.email)
                || ' — الدور: ' || NEW.role::text,
            '/admin/users',
            'user', NEW.id
        FROM public.users
        WHERE role = 'admin'
          AND is_active = true
          AND id IS DISTINCT FROM NEW.id;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.is_active IS DISTINCT FROM NEW.is_active THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        SELECT
            id,
            CASE WHEN NEW.is_active THEN 'تم تفعيل مستخدم' ELSE 'تم تعطيل مستخدم' END,
            CASE WHEN NEW.is_active
                THEN 'تم تفعيل حساب ' || COALESCE(NEW.name, NEW.email)
                ELSE 'تم تعطيل حساب ' || COALESCE(NEW.name, NEW.email)
            END,
            '/admin/users',
            'user', NEW.id
        FROM public.users
        WHERE role = 'admin'
          AND is_active = true
          AND id IS DISTINCT FROM NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_change ON public.users;
CREATE TRIGGER on_user_change
    AFTER INSERT OR UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.notify_user_change();


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 11: New trigger — client CRUD
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_client_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        SELECT
            id,
            'عميل جديد',
            'تم إضافة عميل جديد: ' || COALESCE(NEW.name, 'بدون اسم'),
            CASE WHEN role = 'admin' THEN '/admin/users' ELSE '/account-manager' END,
            'client', NEW.id
        FROM public.users
        WHERE role IN ('admin', 'account_manager')
          AND is_active = true;
    END IF;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type)
        SELECT
            id,
            'تم حذف عميل',
            'تم حذف العميل: ' || COALESCE(OLD.name, 'بدون اسم'),
            '/admin/users',
            'client'
        FROM public.users
        WHERE role = 'admin'
          AND is_active = true;

        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_client_change ON public.clients;
CREATE TRIGGER on_client_change
    AFTER INSERT OR DELETE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.notify_client_change();


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 12: New trigger — project CRUD
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_project_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    client_user_id UUID;
    client_name    TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT c.user_id, c.name
        INTO   client_user_id, client_name
        FROM   public.clients c
        WHERE  c.id = NEW.client_id;

        -- Notify all admins
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        SELECT
            id,
            'مشروع جديد',
            'تم إنشاء مشروع "' || NEW.name || '" للعميل '
                || COALESCE(client_name, ''),
            '/admin/tasks',
            'project', NEW.id
        FROM public.users
        WHERE role = 'admin'
          AND is_active = true;

        -- Notify active team_leaders
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        SELECT
            id,
            'مشروع جديد',
            'مشروع جديد "' || NEW.name || '" للعميل '
                || COALESCE(client_name, ''),
            '/team-leader',
            'project', NEW.id
        FROM public.users
        WHERE role = 'team_leader'
          AND is_active = true;

        -- Notify the client
        IF client_user_id IS NOT NULL THEN
            INSERT INTO public.notifications
                (user_id, title, message, link, notification_type, entity_id)
            VALUES (
                client_user_id,
                'مشروع جديد لك',
                'تم إنشاء مشروع جديد "' || NEW.name || '"',
                '/client',
                'project', NEW.id
            );
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type)
        SELECT
            id,
            'تم حذف مشروع',
            'تم حذف المشروع "' || OLD.name || '"',
            '/admin/tasks',
            'project'
        FROM public.users
        WHERE role = 'admin'
          AND is_active = true;

        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_project_change ON public.projects;
CREATE TRIGGER on_project_change
    AFTER INSERT OR DELETE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.notify_project_change();


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 13: New trigger — client account creation
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_client_account_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    client_user_id UUID;
    client_name    TEXT;
BEGIN
    SELECT c.user_id, c.name
    INTO   client_user_id, client_name
    FROM   public.clients c
    WHERE  c.id = NEW.client_id;

    -- Notify the client
    IF client_user_id IS NOT NULL THEN
        INSERT INTO public.notifications
            (user_id, title, message, link, notification_type, entity_id)
        VALUES (
            client_user_id,
            'تم فتح حساب لك',
            'تم فتح حساب جديد باسمك — الباقة: '
                || COALESCE(NEW.package_name, ''),
            '/client/account',
            'client_account', NEW.id
        );
    END IF;

    -- Notify admin + accountant
    INSERT INTO public.notifications
        (user_id, title, message, link, notification_type, entity_id)
    SELECT
        id,
        'حساب عميل جديد',
        'تم فتح حساب للعميل ' || COALESCE(client_name, '')
            || ' — الباقة: ' || COALESCE(NEW.package_name, ''),
        '/admin/treasury/client-accounts',
        'client_account', NEW.id
    FROM public.users
    WHERE role IN ('admin', 'accountant')
      AND is_active = true;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_client_account_change ON public.client_accounts;
CREATE TRIGGER on_client_account_change
    AFTER INSERT ON public.client_accounts
    FOR EACH ROW EXECUTE FUNCTION public.notify_client_account_change();

-- ────────────────────────────────────────────────────────────────────────────
-- Done
-- ────────────────────────────────────────────────────────────────────────────

COMMIT;

SELECT 'Migration V14: Notification System Overhaul completed successfully.' AS result;
