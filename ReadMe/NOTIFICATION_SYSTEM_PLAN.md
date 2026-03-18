# خطة ترقية نظام الإشعارات الشاملة

## 📋 الفهرس

1. [تحليل الوضع الحالي](#-تحليل-الوضع-الحالي)
2. [الأدوار في النظام](#-الأدوار-في-النظام)
3. [الفجوات المكتشفة لكل موديول](#-الفجوات-المكتشفة-لكل-موديول)
4. [خريطة الإشعارات المطلوبة لكل Role](#-خريطة-الإشعارات-المطلوبة-لكل-role)
5. [خطة التنفيذ التفصيلية](#-خطة-التنفيذ-التفصيلية)
6. [SQL Triggers المطلوبة](#-sql-triggers-المطلوبة)
7. [تعديلات الـ Frontend](#-تعديلات-الـ-frontend)
8. [تغييرات الـ Database Schema](#-تغييرات-الـ-database-schema)

---

## 🔍 تحليل الوضع الحالي

### البنية التحتية الموجودة

| المكون | الملف | الوصف |
|--------|-------|-------|
| Notifications Table | `supabase/schema.sql` | جدول بسيط: `id, user_id, title, message, link, is_read, created_at` |
| Hook: قراءة الإشعارات | `src/hooks/use-notifications.ts` | `useNotifications`, `useMarkNotificationRead`, `useMarkAllNotificationsRead` |
| Hook: Realtime | `src/hooks/use-realtime.ts` | `useNotificationsRealtime` — يسمع INSERT على notifications filtered by user_id |
| UI: Popover | `src/components/shared/notifications-popover.tsx` | Bell icon + popover مع قائمة الإشعارات |
| RLS Policies | `supabase/FIX_NOTIFICATIONS_RLS.sql` | كل مستخدم يشوف إشعاراته فقط |
| Browser Notifications | `notifications-popover.tsx` | يطلب إذن المتصفح ويعرض native notification |

### Database Triggers الموجودة حالياً (8 triggers)

| # | Trigger Function | الجدول | الحدث | مين بيتبلغ | الوصف |
|---|------------------|--------|-------|-----------|-------|
| 1 | `notify_task_assignment()` | `tasks` | INSERT / UPDATE | `assigned_to` + `editor_id` | لما مهمة تتعين لحد أو يتغير التعيين |
| 2 | `notify_client_task_review()` | `tasks` | UPDATE | العميل (عبر `client_id`) | لما حالة المهمة تتغير لـ `client_review` |
| 3 | `notify_team_leader_client_response()` | `tasks` | UPDATE | `created_by` (TL) | لما العميل يوافق أو يطلب تعديل |
| 4 | `notify_workflow_change()` | `tasks` | UPDATE | TL + العميل | لما `workflow_stage` يتغير (`*_done`, `delivered`) |
| 5 | `notify_client_request_created()` | `tasks` | INSERT | Team Leaders (القسم) | لما عميل يعمل طلب جديد |
| 6 | `notify_request_status_changed()` | `tasks` | UPDATE | `created_by` (العميل) | لما طلب العميل يتوافق عليه أو يترفض |
| 7 | `notify_new_message()` | `messages` | INSERT | كل المشاركين ماعدا المرسل | لما رسالة جديدة تتبعت |
| 8 | `notify_on_transaction_change()` | `transactions` | INSERT | العميل (عبر `client_id`) | لما معاملة مالية جديدة visible للعميل |

### Client-side Notification Inserts (1 فقط)

| الملف | الـ Hook | الوصف |
|-------|---------|-------|
| `src/hooks/use-tasks.ts` (سطر 627) | `useForwardTask()` | لما مهمة تتحول لمصمم — يعمل insert مباشر من الـ client |

---

## 👥 الأدوار في النظام

```
UserRole = 'admin' | 'accountant' | 'team_leader' | 'account_manager' 
         | 'creator' | 'designer' | 'client' 
         | 'videographer' | 'editor' | 'photographer'
```

| الدور | القسم | المسؤوليات الأساسية |
|-------|-------|---------------------|
| **admin** | — | إدارة كل حاجة: مستخدمين، خزينة، مهام، جداول، باقات، إعدادات |
| **accountant** | — | الخزينة، حسابات العملاء، السلف، التقارير المالية |
| **team_leader** | photography / content | إدارة المهام، المراجعات، الجداول، سجل النشاط |
| **account_manager** | content | إدارة المهام، المراجعات، الجداول، مراسلة العملاء |
| **creator** | content | تنفيذ مهام المحتوى، الجداول |
| **designer** | content | تنفيذ مهام التصميم، الجداول |
| **videographer** | photography | تنفيذ مهام التصوير، الجداول |
| **photographer** | photography | تنفيذ مهام التصوير الفوتوغرافي، الجداول |
| **editor** | photography | مونتاج الفيديو، الجداول |
| **client** | — | مراجعة المهام، طلب تعديلات، الحساب المالي، المراسلات |

---

## 🕳️ الفجوات المكتشفة لكل موديول

### 1. المهام (Tasks) — ⚠️ تغطية جزئية

**الموجود:**
- ✅ تعيين مهمة → إشعار `assigned_to`
- ✅ مهمة → `client_review` → إشعار العميل
- ✅ العميل يوافق/يرفض → إشعار TL
- ✅ `workflow_stage` يتغير لـ `*_done` → إشعار TL
- ✅ `workflow_stage` يتغير لـ `delivered` → إشعار العميل
- ✅ طلب عميل جديد → إشعار TLs
- ✅ طلب عميل approved/rejected → إشعار العميل

**المفقود:**
- ❌ تغيير الحالة `new → in_progress` — لا يُخطر أحد
- ❌ تغيير الحالة `in_progress → review` — لا يُخطر TL/AM
- ❌ تغيير الحالة `review → approved` (بدون عميل) — لا يُخطر assigned_to
- ❌ تغيير الحالة `review → revision` — لا يُخطر assigned_to
- ❌ تغيير الحالة `revision → in_progress` — لا يُخطر TL
- ❌ تغيير الحالة `approved → completed` — لا يُخطر أحد
- ❌ تغيير الأولوية (priority) — لا يُخطر assigned_to
- ❌ تغيير الـ deadline — لا يُخطر assigned_to
- ❌ حذف مهمة — لا يُخطر أحد
- ❌ إشعار Admin بالمهام الجديدة
- ❌ إشعار account_manager عند رد العميل (بجانب TL)

### 2. الجداول (Schedules) — ❌ صفر إشعارات

| العملية | الحالة |
|---------|------|
| إنشاء جدول جديد (INSERT) | ❌ لا إشعار |
| تعديل جدول (UPDATE) | ❌ لا إشعار |
| حذف جدول (DELETE) | ❌ لا إشعار |
| تغيير حالة الجدول (status) | ❌ لا إشعار |
| Account Manager يوافق/يرفض (approval_status) | ❌ لا إشعار |
| تحديث missing_items_status | ❌ لا إشعار |

### 3. الخزينة / المعاملات (Treasury) — ⚠️ تغطية ضعيفة

**الموجود:**
- ✅ إنشاء معاملة → إشعار العميل (لو visible_to_client)

**المفقود:**
- ❌ إنشاء معاملة → لا إشعار للـ admin أو accountant
- ❌ تعديل معاملة → لا إشعار لأي حد
- ❌ اعتماد معاملة (approve) → لا إشعار للـ created_by ولا العميل
- ❌ حذف معاملة → لا إشعار لأي حد

### 4. السلف (Advances) — ❌ صفر إشعارات

| العملية | الحالة |
|---------|------|
| إنشاء سلفة جديدة | ❌ لا إشعار |
| اعتماد سلفة (approve) | ❌ لا إشعار |
| حذف سلفة أو مستلم سلفة | ❌ لا إشعار |

### 5. المستخدمين (Users) — ❌ صفر إشعارات

| العملية | الحالة |
|---------|------|
| تسجيل مستخدم جديد | ❌ لا إشعار للـ admin |
| تعديل بيانات مستخدم | ❌ لا إشعار |
| تعطيل/تفعيل مستخدم | ❌ لا إشعار |
| حذف مستخدم | ❌ لا إشعار |

### 6. العملاء (Clients) — ❌ صفر إشعارات

| العملية | الحالة |
|---------|------|
| إنشاء عميل جديد | ❌ لا إشعار |
| تعديل بيانات عميل | ❌ لا إشعار |
| حذف عميل | ❌ لا إشعار |

### 7. المشاريع (Projects) — ❌ صفر إشعارات

| العملية | الحالة |
|---------|------|
| إنشاء مشروع جديد | ❌ لا إشعار |
| تعديل مشروع | ❌ لا إشعار |
| حذف مشروع | ❌ لا إشعار |

### 8. حسابات العملاء (Client Accounts) — ❌ صفر إشعارات

| العملية | الحالة |
|---------|------|
| إنشاء حساب عميل | ❌ لا إشعار |
| تعديل حساب عميل | ❌ لا إشعار |

### 9. الباقات (Packages) — ❌ صفر إشعارات

| العملية | الحالة |
|---------|------|
| إنشاء باقة | ❌ لا إشعار |
| تعديل باقة | ❌ لا إشعار |
| حذف باقة | ❌ لا إشعار |

### 10. الرسائل (Chat) — ✅ مكتمل

| العملية | الحالة |
|---------|------|
| رسالة جديدة | ✅ إشعار لكل المشاركين ماعدا المرسل |

---

## 🎯 خريطة الإشعارات المطلوبة لكل Role

### 🔴 Admin
| المصدر | الأحداث التي تصله |
|--------|-------------------|
| المهام | مهمة جديدة أُنشئت، مهمة اتحذفت |
| الجداول | — (اختياري — الأدمن يشوف كل حاجة من الـ dashboard) |
| الخزينة | معاملة جديدة أُنشئت، معاملة اتعدلت، معاملة اتحذفت |
| السلف | سلفة جديدة أُنشئت، سلفة اتحذفت |
| المستخدمين | مستخدم جديد سجل، مستخدم اتعطل/اتفعل |
| العملاء | عميل جديد أُضيف، عميل اتحذف |
| المشاريع | مشروع جديد أُنشئ، مشروع اتحذف |
| حسابات العملاء | حساب عميل جديد أُنشئ |
| الباقات | باقة أُنشئت/اتعدلت/اتحذفت |

### 🟡 Accountant
| المصدر | الأحداث التي تصله |
|--------|-------------------|
| الخزينة | معاملة جديدة، معاملة اتعدلت، معاملة اعتُمدت، معاملة اتحذفت |
| السلف | سلفة جديدة، سلفة اعتُمدت |
| حسابات العملاء | حساب عميل جديد |
| الباقات | باقة اتعدلت/اتحذفت (بتأثر على الأسعار) |

### 🟢 Team Leader
| المصدر | الأحداث التي تصله |
|--------|-------------------|
| المهام | عضو فريقه بدأ مهمة (`new → in_progress`)، عضو خلص مهمة (`in_progress → review`)، عضو رجع من تعديل (`revision → in_progress`)، عميل وافق/طلب تعديل |
| الجداول | جدول جديد في قسمه، جدول اتعدل، جدول اتحذف، missing items اتحدثت |
| طلبات العملاء | طلب عميل جديد (موجود بالفعل ✅) |
| المشاريع | مشروع جديد في قسمه |

### 🔵 Account Manager
| المصدر | الأحداث التي تصله |
|--------|-------------------|
| المهام | مهام المحتوى: عضو بدأ/خلص مهمة، عميل وافق/طلب تعديل |
| الجداول | جدول جديد في قسمه، جدول اتعدل |
| العملاء | عميل جديد أُضيف (مسؤول عنه) |
| طلبات العملاء | طلب عميل جديد |

### 🟣 Creator / Designer / Videographer / Photographer / Editor
| المصدر | الأحداث التي تصله |
|--------|-------------------|
| المهام | مهمة جديدة معينه ليه (موجود ✅)، حالة مهمته اتغيرت (approved/revision/completed)، أولوية مهمته اتغيرت، deadline مهمته اتغير، مهمته اتحذفت |
| الجداول | جدول معين فيه، جدول اتعدل، جدول اتلغى |

### 🟠 Client
| المصدر | الأحداث التي تصله |
|--------|-------------------|
| المهام | مهمة جاهزة للمراجعة (موجود ✅)، تسليم جديد (موجود ✅)، طلبه اتوافق عليه/اترفض (موجود ✅) |
| الجداول | جدول متعلق بيه (تصوير/اجتماع) |
| الخزينة | معاملة مالية جديدة (موجود ✅)، معاملة اعتُمدت |
| حسابات العملاء | حساب جديد اتفتح ليه |
| المشاريع | مشروع جديد ليه، مشروع اتعدل |

---

## 🛠️ خطة التنفيذ التفصيلية

### المرحلة 1: تغييرات الـ Database Schema

#### 1.1 إضافة عمود `notification_type` للتصنيف

```sql
-- إضافة نوع الإشعار للتصنيف والفلترة
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'general';

-- القيم الممكنة:
-- 'task'              — إشعارات المهام
-- 'schedule'          — إشعارات الجداول
-- 'treasury'          — إشعارات الخزينة/المعاملات
-- 'advance'           — إشعارات السلف
-- 'user'              — إشعارات المستخدمين
-- 'client'            — إشعارات العملاء
-- 'project'           — إشعارات المشاريع
-- 'client_account'    — إشعارات حسابات العملاء
-- 'package'           — إشعارات الباقات
-- 'chat'              — إشعارات الرسائل
-- 'general'           — عام

-- Index للفلترة السريعة حسب النوع
CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON public.notifications(notification_type);
```

#### 1.2 إضافة عمود `entity_id` للربط بالكيان الأصلي

```sql
-- لربط الإشعار بالكيان المصدر (مهمة، جدول، معاملة، إلخ)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Index
CREATE INDEX IF NOT EXISTS idx_notifications_entity 
ON public.notifications(entity_id);
```

---

### المرحلة 2: SQL Triggers الجديدة والمعدّلة

---

## 📝 SQL Triggers المطلوبة

### Trigger 1: `notify_task_status_change()` — جديد 🆕

> يغطي **كل** تغييرات حالة المهمة التي لا تغطيها الـ triggers الحالية

```sql
CREATE OR REPLACE FUNCTION public.notify_task_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignee_name TEXT;
  creator_role TEXT;
  assignee_link TEXT;
  creator_link TEXT;
BEGIN
  -- فقط عند تغيير الحالة
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- الحالات المغطاة بـ triggers أخرى — نتخطاها
  -- client_review → مغطاة بـ notify_client_task_review
  -- client_review → approved/revision → مغطاة بـ notify_team_leader_client_response
  IF NEW.status::text = 'client_review' THEN RETURN NEW; END IF;
  IF OLD.status::text = 'client_review' THEN RETURN NEW; END IF;

  -- جلب اسم المنفذ ودور المنشئ
  SELECT name INTO assignee_name FROM users WHERE id = NEW.assigned_to;
  SELECT role::text INTO creator_role FROM users WHERE id = NEW.created_by;

  -- تحديد رابط المنشئ (TL أو AM)
  creator_link := CASE creator_role
    WHEN 'team_leader'     THEN '/team-leader'
    WHEN 'account_manager' THEN '/account-manager'
    WHEN 'admin'           THEN '/admin/tasks'
    ELSE '/admin/tasks'
  END;

  -- 1. new → in_progress: إخطار created_by
  IF OLD.status::text = 'new' AND NEW.status::text = 'in_progress' THEN
    IF NEW.created_by IS NOT NULL AND NEW.created_by != NEW.assigned_to THEN
      INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
      VALUES (
        NEW.created_by,
        'بدأ العمل على مهمة',
        COALESCE(assignee_name, 'عضو الفريق') || ' بدأ العمل على "' || NEW.title || '"',
        creator_link,
        'task', NEW.id
      );
    END IF;
  END IF;

  -- 2. in_progress → review: إخطار created_by
  IF OLD.status::text = 'in_progress' AND NEW.status::text = 'review' THEN
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
      VALUES (
        NEW.created_by,
        'مهمة جاهزة للمراجعة',
        COALESCE(assignee_name, 'عضو الفريق') || ' أنهى العمل على "' || NEW.title || '" وتحتاج مراجعتك',
        creator_link,
        'task', NEW.id
      );
    END IF;
  END IF;

  -- 3. review → approved (بدون عميل): إخطار assigned_to
  IF OLD.status::text = 'review' AND NEW.status::text = 'approved' THEN
    IF NEW.assigned_to IS NOT NULL THEN
      DECLARE a_role TEXT; a_link TEXT;
      BEGIN
        SELECT role::text INTO a_role FROM users WHERE id = NEW.assigned_to;
        a_link := CASE a_role
          WHEN 'creator' THEN '/creator' WHEN 'designer' THEN '/creator'
          WHEN 'videographer' THEN '/videographer' WHEN 'photographer' THEN '/photographer'
          WHEN 'editor' THEN '/editor' ELSE '/creator'
        END;
        INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
        VALUES (
          NEW.assigned_to,
          'تمت الموافقة على مهمتك',
          'تمت الموافقة على المهمة "' || NEW.title || '"',
          a_link, 'task', NEW.id
        );
      END;
    END IF;
  END IF;

  -- 4. review → revision: إخطار assigned_to
  IF OLD.status::text = 'review' AND NEW.status::text = 'revision' THEN
    IF NEW.assigned_to IS NOT NULL THEN
      DECLARE a_role2 TEXT; a_link2 TEXT;
      BEGIN
        SELECT role::text INTO a_role2 FROM users WHERE id = NEW.assigned_to;
        a_link2 := CASE a_role2
          WHEN 'creator' THEN '/creator' WHEN 'designer' THEN '/creator'
          WHEN 'videographer' THEN '/videographer' WHEN 'photographer' THEN '/photographer'
          WHEN 'editor' THEN '/editor' ELSE '/creator'
        END;
        INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
        VALUES (
          NEW.assigned_to,
          'مطلوب تعديلات على مهمتك',
          'تم طلب تعديلات على المهمة "' || NEW.title || '"' ||
            CASE WHEN NEW.client_feedback IS NOT NULL THEN ' — ' || LEFT(NEW.client_feedback, 100) ELSE '' END,
          a_link2, 'task', NEW.id
        );
      END;
    END IF;
  END IF;

  -- 5. revision → in_progress: إخطار created_by (العضو بدأ يشتغل على التعديلات)
  IF OLD.status::text = 'revision' AND NEW.status::text = 'in_progress' THEN
    IF NEW.created_by IS NOT NULL AND NEW.created_by != NEW.assigned_to THEN
      INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
      VALUES (
        NEW.created_by,
        'بدأ العمل على التعديلات',
        COALESCE(assignee_name, 'عضو الفريق') || ' بدأ العمل على تعديلات "' || NEW.title || '"',
        creator_link, 'task', NEW.id
      );
    END IF;
  END IF;

  -- 6. approved → completed: إخطار assigned_to + admin
  IF OLD.status::text = 'approved' AND NEW.status::text = 'completed' THEN
    -- أخطر المنفذ
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
      VALUES (
        NEW.assigned_to,
        'مهمة مكتملة',
        'المهمة "' || NEW.title || '" تم تحديدها كمكتملة',
        '/creator', 'task', NEW.id
      );
    END IF;
    -- أخطر كل الأدمنز
    INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
    SELECT id, 'مهمة مكتملة', 'المهمة "' || NEW.title || '" تم إكمالها', '/admin/tasks', 'task', NEW.id
    FROM users WHERE role = 'admin' AND is_active = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_status_change ON public.tasks;
CREATE TRIGGER on_task_status_change
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_status_change();
```

### Trigger 2: `notify_task_field_change()` — جديد 🆕

> يغطي تغيير الأولوية والـ deadline

```sql
CREATE OR REPLACE FUNCTION public.notify_task_field_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a_role TEXT;
  a_link TEXT;
BEGIN
  -- فقط لو assigned_to موجود وليس هو اللي عدّل
  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;

  SELECT role::text INTO a_role FROM users WHERE id = NEW.assigned_to;
  a_link := CASE a_role
    WHEN 'creator' THEN '/creator' WHEN 'designer' THEN '/creator'
    WHEN 'videographer' THEN '/videographer' WHEN 'photographer' THEN '/photographer'
    WHEN 'editor' THEN '/editor' ELSE '/creator'
  END;

  -- تغيير الأولوية
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
    VALUES (
      NEW.assigned_to,
      'تغيير أولوية مهمة',
      'تم تغيير أولوية المهمة "' || NEW.title || '" إلى ' ||
        CASE NEW.priority WHEN 'urgent' THEN 'عاجلة 🔴' WHEN 'high' THEN 'عالية 🟠' WHEN 'medium' THEN 'متوسطة 🟡' ELSE 'منخفضة 🟢' END,
      a_link, 'task', NEW.id
    );
  END IF;

  -- تغيير الـ deadline
  IF OLD.deadline IS DISTINCT FROM NEW.deadline AND NEW.deadline IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
    VALUES (
      NEW.assigned_to,
      'تغيير موعد تسليم مهمة',
      'تم تغيير موعد تسليم المهمة "' || NEW.title || '" إلى ' || NEW.deadline::text,
      a_link, 'task', NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_field_change ON public.tasks;
CREATE TRIGGER on_task_field_change
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_field_change();
```

### Trigger 3: `notify_task_deleted()` — جديد 🆕

```sql
CREATE OR REPLACE FUNCTION public.notify_task_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- إخطار assigned_to
  IF OLD.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, link, notification_type)
    VALUES (
      OLD.assigned_to,
      'تم حذف مهمة',
      'تم حذف المهمة "' || OLD.title || '" التي كانت معينة لك',
      '/creator', 'task'
    );
  END IF;

  -- إخطار الأدمنز
  INSERT INTO notifications (user_id, title, message, link, notification_type)
  SELECT id, 'تم حذف مهمة', 'تم حذف المهمة "' || OLD.title || '"', '/admin/tasks', 'task'
  FROM users WHERE role = 'admin' AND is_active = true
    AND id != COALESCE(OLD.assigned_to, '00000000-0000-0000-0000-000000000000');

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_task_deleted ON public.tasks;
CREATE TRIGGER on_task_deleted
  BEFORE DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_deleted();
```

### Trigger 4: `notify_schedule_change()` — جديد 🆕

```sql
CREATE OR REPLACE FUNCTION public.notify_schedule_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_id UUID;
  members UUID[];
  creator_name TEXT;
  schedule_title TEXT;
  op_type TEXT;
  client_user_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    schedule_title := OLD.title;
    members := COALESCE(OLD.assigned_members, ARRAY[]::UUID[]);
    op_type := 'deleted';
  ELSE
    schedule_title := NEW.title;
    members := COALESCE(NEW.assigned_members, ARRAY[]::UUID[]);
    op_type := CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'updated' END;
  END IF;

  SELECT name INTO creator_name FROM users WHERE id = COALESCE(NEW.created_by, OLD.created_by);

  -- INSERT: إخطار assigned_members + العميل
  IF TG_OP = 'INSERT' THEN
    FOREACH member_id IN ARRAY members LOOP
      IF member_id != NEW.created_by THEN
        INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
        VALUES (
          member_id,
          'جدول جديد',
          COALESCE(creator_name, 'مستخدم') || ' أنشأ جدول "' || schedule_title || '" في ' || NEW.scheduled_date::text,
          '/team-leader/schedule', 'schedule', NEW.id
        );
      END IF;
    END LOOP;

    -- إخطار العميل لو مرتبط بعميل
    IF NEW.client_id IS NOT NULL THEN
      SELECT user_id INTO client_user_id FROM clients WHERE id = NEW.client_id;
      IF client_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
        VALUES (
          client_user_id,
          'موعد جديد',
          'تم تحديد موعد "' || schedule_title || '" في ' || NEW.scheduled_date::text,
          '/client/schedule', 'schedule', NEW.id
        );
      END IF;
    END IF;
  END IF;

  -- UPDATE: تغيير الحالة أو approval
  IF TG_OP = 'UPDATE' THEN
    -- تغيير status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      FOREACH member_id IN ARRAY members LOOP
        INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
        VALUES (
          member_id,
          'تحديث حالة جدول',
          'تم تغيير حالة الجدول "' || schedule_title || '" إلى ' || NEW.status,
          '/team-leader/schedule', 'schedule', NEW.id
        );
      END LOOP;
      -- أخطر created_by لو مش هو اللي غيّر
      IF NEW.created_by IS NOT NULL AND NOT (NEW.created_by = ANY(members)) THEN
        INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
        VALUES (
          NEW.created_by,
          'تحديث حالة جدول',
          'تم تغيير حالة الجدول "' || schedule_title || '" إلى ' || NEW.status,
          '/team-leader/schedule', 'schedule', NEW.id
        );
      END IF;
    END IF;

    -- تغيير approval_status (AM يوافق/يرفض)
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status AND NEW.approval_status IN ('approved', 'rejected') THEN
      IF NEW.created_by IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
        VALUES (
          NEW.created_by,
          CASE NEW.approval_status
            WHEN 'approved' THEN 'تمت الموافقة على الجدول'
            WHEN 'rejected' THEN 'تم رفض الجدول'
          END,
          CASE NEW.approval_status
            WHEN 'approved' THEN 'تمت الموافقة على الجدول "' || schedule_title || '"'
            WHEN 'rejected' THEN 'تم رفض الجدول "' || schedule_title || '"' ||
              CASE WHEN NEW.manager_notes IS NOT NULL THEN ' — ' || LEFT(NEW.manager_notes, 100) ELSE '' END
          END,
          '/team-leader/schedule', 'schedule', NEW.id
        );
      END IF;
    END IF;

    -- تغيير missing_items_status
    IF OLD.missing_items_status IS DISTINCT FROM NEW.missing_items_status AND NEW.missing_items_status = 'resolved' THEN
      IF NEW.team_leader_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
        VALUES (
          NEW.team_leader_id,
          'تم حل النواقص',
          'تم حل نواقص الجدول "' || schedule_title || '"',
          '/team-leader/schedule', 'schedule', NEW.id
        );
      END IF;
    END IF;

    -- تغييرات عامة (وقت، مكان، إلخ) — إخطار assigned_members
    IF OLD.start_time IS DISTINCT FROM NEW.start_time 
       OR OLD.scheduled_date IS DISTINCT FROM NEW.scheduled_date
       OR OLD.location IS DISTINCT FROM NEW.location THEN
      FOREACH member_id IN ARRAY members LOOP
        INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
        VALUES (
          member_id,
          'تحديث تفاصيل جدول',
          'تم تحديث تفاصيل الجدول "' || schedule_title || '" (الوقت/المكان/التاريخ)',
          '/team-leader/schedule', 'schedule', NEW.id
        );
      END LOOP;
    END IF;
  END IF;

  -- DELETE: إخطار assigned_members
  IF TG_OP = 'DELETE' THEN
    FOREACH member_id IN ARRAY members LOOP
      INSERT INTO notifications (user_id, title, message, link, notification_type)
      VALUES (
        member_id,
        'تم إلغاء جدول',
        'تم حذف الجدول "' || schedule_title || '"',
        '/team-leader/schedule', 'schedule'
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
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_schedule_change();
```

### Trigger 5: `notify_transaction_full()` — تعديل وتوسعة 🔄

> بدل `notify_on_transaction_change` الحالي — يغطي INSERT + UPDATE + DELETE

```sql
CREATE OR REPLACE FUNCTION public.notify_transaction_full()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_user_id UUID;
  transaction_desc TEXT;
  creator_name TEXT;
BEGIN
  -- ═══ INSERT ═══
  IF TG_OP = 'INSERT' THEN
    -- إخطار العميل (لو visible)
    IF NEW.client_id IS NOT NULL AND NEW.visible_to_client = true THEN
      SELECT user_id INTO client_user_id FROM clients WHERE id = NEW.client_id;
      IF client_user_id IS NOT NULL THEN
        transaction_desc := COALESCE(NEW.description, 'معاملة مالية');
        INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
        VALUES (
          client_user_id,
          CASE WHEN NEW.type = 'expense' THEN 'مصروف جديد' ELSE 'إيراد جديد' END,
          'تم تسجيل معاملة: ' || transaction_desc || ' — المبلغ: ' || NEW.amount::text || ' ج.م',
          '/client/account', 'treasury', NEW.id
        );
      END IF;
    END IF;

    -- إخطار admin + accountant
    INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
    SELECT id, 'معاملة مالية جديدة',
      CASE WHEN NEW.type = 'expense' THEN 'مصروف' ELSE 'إيراد' END || ' جديد: ' || COALESCE(NEW.description, '') || ' — ' || NEW.amount::text || ' ج.م',
      CASE WHEN role = 'admin' THEN '/admin/treasury' ELSE '/accountant' END,
      'treasury', NEW.id
    FROM users
    WHERE role IN ('admin', 'accountant') AND is_active = true
      AND id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000');
  END IF;

  -- ═══ UPDATE: Approval ═══
  IF TG_OP = 'UPDATE' AND OLD.is_approved = false AND NEW.is_approved = true THEN
    -- إخطار created_by
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
      VALUES (
        NEW.created_by,
        'تم اعتماد معاملتك',
        'تم اعتماد المعاملة "' || COALESCE(NEW.description, 'معاملة') || '" — ' || NEW.amount::text || ' ج.م',
        '/accountant', 'treasury', NEW.id
      );
    END IF;

    -- إخطار العميل (لو visible)
    IF NEW.client_id IS NOT NULL AND NEW.visible_to_client = true THEN
      SELECT user_id INTO client_user_id FROM clients WHERE id = NEW.client_id;
      IF client_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
        VALUES (
          client_user_id,
          'تم اعتماد معاملة في حسابك',
          'تم اعتماد المعاملة: ' || COALESCE(NEW.description, 'معاملة مالية') || ' — ' || NEW.amount::text || ' ج.م',
          '/client/account', 'treasury', NEW.id
        );
      END IF;
    END IF;
  END IF;

  -- ═══ DELETE ═══
  IF TG_OP = 'DELETE' THEN
    INSERT INTO notifications (user_id, title, message, link, notification_type)
    SELECT id, 'تم حذف معاملة',
      'تم حذف معاملة: ' || COALESCE(OLD.description, 'معاملة مالية') || ' — ' || OLD.amount::text || ' ج.م',
      CASE WHEN role = 'admin' THEN '/admin/treasury' ELSE '/accountant' END,
      'treasury'
    FROM users
    WHERE role IN ('admin', 'accountant') AND is_active = true;
    RETURN OLD;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- استبدال الـ trigger القديم
DROP TRIGGER IF EXISTS on_transaction_notify ON public.transactions;
DROP TRIGGER IF EXISTS on_transaction_full ON public.transactions;
CREATE TRIGGER on_transaction_full
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_transaction_full();
```

### Trigger 6: `notify_advance_change()` — جديد 🆕

```sql
CREATE OR REPLACE FUNCTION public.notify_advance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- إخطار admin بسلفة جديدة
    INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
    SELECT id, 'سلفة جديدة',
      'تم إنشاء سلفة لـ ' || COALESCE(NEW.recipient_name, 'مستلم') || ' — ' || NEW.amount::text || ' ج.م',
      '/admin/advances', 'advance', NEW.id
    FROM users WHERE role = 'admin' AND is_active = true;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO notifications (user_id, title, message, link, notification_type)
    SELECT id, 'تم حذف سلفة',
      'تم حذف سلفة لـ ' || COALESCE(OLD.recipient_name, 'مستلم') || ' — ' || OLD.amount::text || ' ج.م',
      '/admin/advances', 'advance'
    FROM users WHERE role = 'admin' AND is_active = true;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_advance_change ON public.advances;
CREATE TRIGGER on_advance_change
  AFTER INSERT OR DELETE ON public.advances
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_advance_change();
```

### Trigger 7: `notify_user_change()` — جديد 🆕

```sql
CREATE OR REPLACE FUNCTION public.notify_user_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
    SELECT id, 'مستخدم جديد',
      'تم تسجيل مستخدم جديد: ' || COALESCE(NEW.name, NEW.email) || ' — الدور: ' || NEW.role::text,
      '/admin/users', 'user', NEW.id
    FROM users WHERE role = 'admin' AND is_active = true AND id != NEW.id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
    SELECT id,
      CASE WHEN NEW.is_active THEN 'تم تفعيل مستخدم' ELSE 'تم تعطيل مستخدم' END,
      CASE WHEN NEW.is_active
        THEN 'تم تفعيل حساب ' || COALESCE(NEW.name, NEW.email)
        ELSE 'تم تعطيل حساب ' || COALESCE(NEW.name, NEW.email)
      END,
      '/admin/users', 'user', NEW.id
    FROM users WHERE role = 'admin' AND is_active = true AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_change ON public.users;
CREATE TRIGGER on_user_change
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_change();
```

### Trigger 8: `notify_client_change()` — جديد 🆕

```sql
CREATE OR REPLACE FUNCTION public.notify_client_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- إخطار admin + account_managers
    INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
    SELECT id, 'عميل جديد',
      'تم إضافة عميل جديد: ' || COALESCE(NEW.name, 'بدون اسم'),
      CASE WHEN role = 'admin' THEN '/admin/users' ELSE '/account-manager' END,
      'client', NEW.id
    FROM users
    WHERE role IN ('admin', 'account_manager') AND is_active = true;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO notifications (user_id, title, message, link, notification_type)
    SELECT id, 'تم حذف عميل',
      'تم حذف العميل: ' || COALESCE(OLD.name, 'بدون اسم'),
      '/admin/users', 'client'
    FROM users WHERE role = 'admin' AND is_active = true;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_client_change ON public.clients;
CREATE TRIGGER on_client_change
  AFTER INSERT OR DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_change();
```

### Trigger 9: `notify_project_change()` — جديد 🆕

```sql
CREATE OR REPLACE FUNCTION public.notify_project_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_user_id UUID;
  client_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- جلب بيانات العميل
    SELECT c.name, c.user_id INTO client_name, client_user_id
    FROM clients c WHERE c.id = NEW.client_id;

    -- إخطار admin
    INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
    SELECT id, 'مشروع جديد',
      'تم إنشاء مشروع "' || NEW.name || '" للعميل ' || COALESCE(client_name, ''),
      '/admin/tasks', 'project', NEW.id
    FROM users WHERE role = 'admin' AND is_active = true;

    -- إخطار team_leaders (القسم المعني)
    INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
    SELECT id, 'مشروع جديد',
      'مشروع جديد "' || NEW.name || '" للعميل ' || COALESCE(client_name, ''),
      '/team-leader', 'project', NEW.id
    FROM users WHERE role = 'team_leader' AND is_active = true;

    -- إخطار العميل
    IF client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
      VALUES (
        client_user_id,
        'مشروع جديد لك',
        'تم إنشاء مشروع جديد "' || NEW.name || '"',
        '/client', 'project', NEW.id
      );
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO notifications (user_id, title, message, link, notification_type)
    SELECT id, 'تم حذف مشروع', 'تم حذف المشروع "' || OLD.name || '"',
      '/admin/tasks', 'project'
    FROM users WHERE role = 'admin' AND is_active = true;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_project_change ON public.projects;
CREATE TRIGGER on_project_change
  AFTER INSERT OR DELETE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_project_change();
```

### Trigger 10: `notify_client_account_change()` — جديد 🆕

```sql
CREATE OR REPLACE FUNCTION public.notify_client_account_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_user_id UUID;
  client_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT c.name, c.user_id INTO client_name, client_user_id
    FROM clients c WHERE c.id = NEW.client_id;

    -- إخطار العميل
    IF client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
      VALUES (
        client_user_id,
        'تم فتح حساب لك',
        'تم فتح حساب جديد باسمك — الباقة: ' || COALESCE(NEW.package_name, ''),
        '/client/account', 'client_account', NEW.id
      );
    END IF;

    -- إخطار admin
    INSERT INTO notifications (user_id, title, message, link, notification_type, entity_id)
    SELECT id, 'حساب عميل جديد',
      'تم فتح حساب للعميل ' || COALESCE(client_name, '') || ' — الباقة: ' || COALESCE(NEW.package_name, ''),
      '/admin/treasury/client-accounts', 'client_account', NEW.id
    FROM users WHERE role = 'admin' AND is_active = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_client_account_change ON public.client_accounts;
CREATE TRIGGER on_client_account_change
  AFTER INSERT ON public.client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_account_change();
```

---

### المرحلة 3: تعديل الـ Triggers الحالية

#### تعديل `notify_task_assignment()` — إضافة `notification_type`

```sql
-- في الـ INSERT الموجود، أضف notification_type = 'task' و entity_id = NEW.id
-- هيتعمل في نفس ملف الـ migration
```

#### تعديل `notify_new_message()` — إضافة `notification_type`

```sql
-- أضف notification_type = 'chat' و entity_id = NEW.conversation_id
```

#### حذف `notify_on_transaction_change()` — استُبدل بـ `notify_transaction_full()`

```sql
DROP TRIGGER IF EXISTS on_transaction_notify ON public.transactions;
DROP FUNCTION IF EXISTS notify_on_transaction_change();
```

---

## 🖥️ تعديلات الـ Frontend

### الملفات المتأثرة

| # | الملف | التعديل |
|---|-------|---------|
| 1 | `src/types/database.ts` | إضافة `notification_type` و `entity_id` لـ Notification type |
| 2 | `src/hooks/use-notifications.ts` | إضافة `notification_type` و `entity_id` في الـ select query |
| 3 | `src/components/shared/notifications-popover.tsx` | تحسين أيقونات الإشعارات بناءً على `notification_type` بدل تحليل النص |
| 4 | `src/hooks/use-tasks.ts` | إزالة الـ client-side notification insert من `useForwardTask()` (سطر 627) |
| 5 | `src/hooks/use-realtime.ts` | لا تغيير مطلوب (يسمع INSERT على notifications — شغال) |

### تفاصيل التعديلات

#### 1. `src/types/database.ts`

```typescript
export type NotificationType = 
  | 'task' | 'schedule' | 'treasury' | 'advance' 
  | 'user' | 'client' | 'project' | 'client_account' 
  | 'package' | 'chat' | 'general'

export type Notification = {
    id: string
    user_id: string | null
    title: string
    message: string | null
    link: string | null
    is_read: boolean
    created_at: string
    notification_type: NotificationType  // 🆕
    entity_id: string | null             // 🆕
}
```

#### 2. `src/hooks/use-notifications.ts`

```typescript
// تعديل الـ select query
.select('id, title, message, is_read, link, created_at, user_id, notification_type, entity_id')
```

#### 3. `src/components/shared/notifications-popover.tsx`

```typescript
// تحسين getIcon ليستخدم notification_type
const getIcon = (notification: Notification) => {
    switch (notification.notification_type) {
        case 'task': return <ClipboardList className="h-4 w-4 text-orange-500" />
        case 'schedule': return <Calendar className="h-4 w-4 text-blue-500" />
        case 'treasury': return <DollarSign className="h-4 w-4 text-emerald-500" />
        case 'advance': return <Banknote className="h-4 w-4 text-amber-500" />
        case 'user': return <UserPlus className="h-4 w-4 text-purple-500" />
        case 'client': return <UserCircle className="h-4 w-4 text-cyan-500" />
        case 'project': return <FolderOpen className="h-4 w-4 text-indigo-500" />
        case 'chat': return <MessageSquare className="h-4 w-4 text-purple-500" />
        default: return <Info className="h-4 w-4 text-blue-500" />
    }
}
```

#### 4. `src/hooks/use-tasks.ts` — إزالة client-side insert

```typescript
// حذف هذا الكود (سطر 626-632) — الـ trigger هيعمل الشغل
// ── Step 4: Notify the designer ──
// await supabase.from('notifications').insert({...})
```

---

## 📊 تغييرات الـ Database Schema — ملف Migration واحد

```sql
-- ════════════════════════════════════════════════
-- MIGRATION: Complete Notification System Overhaul
-- ════════════════════════════════════════════════

-- 1. Schema changes
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'general';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_id UUID;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications(entity_id);

-- 2. Backfill existing notifications (best-effort based on title keywords)
UPDATE public.notifications SET notification_type = 'task' WHERE notification_type = 'general' AND (title LIKE '%مهمة%' OR title LIKE '%task%' OR title LIKE '%مونتاج%' OR title LIKE '%تعيين%');
UPDATE public.notifications SET notification_type = 'chat' WHERE notification_type = 'general' AND (title LIKE '%رسالة%' OR title LIKE '%message%');
UPDATE public.notifications SET notification_type = 'treasury' WHERE notification_type = 'general' AND (title LIKE '%مصروف%' OR title LIKE '%إيراد%' OR title LIKE '%معاملة%');

-- 3. New trigger functions (paste all 10 triggers from above)
-- ...

-- 4. Update existing triggers to include notification_type
-- ...

-- 5. Drop old trigger
DROP TRIGGER IF EXISTS on_transaction_notify ON public.transactions;
```

---

## 📋 ملخص الأرقام

| البند | العدد |
|-------|------|
| Triggers حالية | 8 |
| Triggers جديدة | 10 (7 جديد + 3 توسعة) |
| إجمالي الإشعارات المغطاة بعد التنفيذ | ~45+ حدث |
| الفجوات المسدودة | ~35 حدث كان بلا إشعار |
| ملفات Frontend متأثرة | 4 ملفات |
| أعمدة DB جديدة | 2 (`notification_type`, `entity_id`) |

---

## ⚡ ترتيب التنفيذ

```
الخطوة 1 → ملف SQL واحد شامل (schema + triggers)
الخطوة 2 → تعديل types/database.ts
الخطوة 3 → تعديل hooks/use-notifications.ts
الخطوة 4 → تعديل components/shared/notifications-popover.tsx
الخطوة 5 → إزالة client-side insert من hooks/use-tasks.ts
الخطوة 6 → اختبار شامل لكل سيناريو
```
