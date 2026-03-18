-- ============================================
-- FIX: Backfill department column based on role
-- Date: 2026-03-18
-- ============================================
-- Mapping:
--   photography → videographer, editor, photographer
--   content     → creator, designer, account_manager
--   NULL        → admin, accountant, client, team_leader (يختار يدوي)
-- ============================================

-- photography team
UPDATE public.users
SET department = 'photography'
WHERE role IN ('videographer', 'editor', 'photographer')
  AND department IS DISTINCT FROM 'photography'::department;

-- content team
UPDATE public.users
SET department = 'content'
WHERE role IN ('creator', 'designer', 'account_manager')
  AND department IS DISTINCT FROM 'content'::department;

-- أدوار بدون قسم محدد (تصفير القيمة الـ default الخاطئة)
UPDATE public.users
SET department = NULL
WHERE role IN ('admin', 'accountant', 'client')
  AND department IS NOT NULL;

-- team_leader: يختار يدوي — بس لو مفيش قسم محدد نحطه photography افتراضياً
UPDATE public.users
SET department = 'photography'
WHERE role = 'team_leader'
  AND department IS NULL;

-- عرض النتيجة بعد التحديث
SELECT role, department, COUNT(*) AS user_count
FROM public.users
GROUP BY role, department
ORDER BY role;
