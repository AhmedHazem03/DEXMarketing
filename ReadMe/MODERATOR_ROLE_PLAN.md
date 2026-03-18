# خطة إضافة رول المودريتور (Moderator)

## الهدف
إضافة دور جديد `moderator` — مستخدم عادي ينشئه الأدمن، يسجّل دخوله ويشاهد مهام قسمي التصوير والمحتوى **بدون أي صلاحية كتابة أو تعديل** (Read-Only).

---

## المتطلبات
| # | المتطلب | التفصيل |
|---|---------|---------|
| 1 | إنشاء الحساب | الأدمن ينشئ حساب المودريتور من صفحة Users مثل أي مستخدم آخر |
| 2 | تسجيل الدخول | يسجّل دخول عادي بالإيميل والباسورد |
| 3 | صفحتين فقط | **تسكات قسم التصوير** + **تسكات قسم المحتوى** |
| 4 | عرض كامل | كل بيانات التسك + الملفات المرفقة + التعليقات |
| 5 | Read-Only | مشاهدة فقط — بدون إضافة أو تعديل أو حذف |

---

## الملفات المطلوب تعديلها (بالترتيب)

### 1. إضافة الرول في Types
**الملف:** `src/types/database.ts` سطر 14

```diff
- export type UserRole = 'admin' | 'accountant' | 'team_leader' | 'account_manager' | 'creator' | 'designer' | 'client' | 'videographer' | 'editor' | 'photographer'
+ export type UserRole = 'admin' | 'accountant' | 'team_leader' | 'account_manager' | 'creator' | 'designer' | 'client' | 'videographer' | 'editor' | 'photographer' | 'moderator'
```

---

### 2. إضافة الرول في Supabase Database
**ملف SQL جديد:** `supabase/ADD_MODERATOR_ROLE.sql`

```sql
-- 1) إضافة moderator للـ enum (لو بتستخدم enum في الداتابيز)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator';

-- 2) RLS Policy للتسكات: المودريتور يشوف كل التسكات (SELECT فقط)
CREATE POLICY "moderator_view_all_tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'moderator'
);

-- 3) RLS Policy للمرفقات: يشوف المرفقات (SELECT فقط)
CREATE POLICY "moderator_view_all_attachments"
ON public.task_attachments
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'moderator'
);

-- 4) RLS Policy للتعليقات: يشوف التعليقات (SELECT فقط)
CREATE POLICY "moderator_view_all_comments"
ON public.comments
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'moderator'
);

-- 5) RLS Policy للمستخدمين: يشوف بيانات المستخدمين (للأسماء والصور)
CREATE POLICY "moderator_view_users"
ON public.users
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'moderator'
);
```

> **ملاحظة:** لو الـ policies الحالية بالفعل تغطي SELECT للـ authenticated users، يكفي فقط إضافة `moderator` في الشرط. يجب مراجعة الـ policies الحالية أولًا.

---

### 3. إضافة Routes للمودريتور
**الملف:** `src/lib/routes.tsx`

إضافة case جديد في `getRoutes()`:

```typescript
case 'moderator':
    return [
        { name: t('Photography Tasks', 'مهام التصوير'), href: '/moderator', icon: Camera },
        { name: t('Content Tasks', 'مهام المحتوى'), href: '/moderator/content', icon: FileText },
    ]
```

---

### 4. إضافة Route Protection
**الملف:** `src/app/[locale]/(dashboard)/layout.tsx`

إضافة في `ROLE_PATH_MAP` و `ROLE_HOME`:

```diff
  const ROLE_PATH_MAP: Record<string, string[]> = {
      ...
      photographer: ['/photographer'],
+     moderator: ['/moderator'],
  }

  const ROLE_HOME: Record<string, string> = {
      ...
      photographer: '/photographer',
+     moderator: '/moderator',
  }
```

---

### 5. إضافة المسار في Middleware
**الملف:** `src/proxy.ts`

إضافة `/moderator` في `protectedPrefixes`:

```diff
  const protectedPrefixes = [
      '/admin', '/client', '/team-leader', '/account-manager',
      '/creator', '/editor', '/photographer', '/videographer',
-     '/accountant', '/profile', '/account', '/settings',
+     '/accountant', '/moderator', '/profile', '/account', '/settings',
  ];
```

---

### 6. إنشاء صفحات المودريتور (صفحتين)

#### 6.1 صفحة مهام التصوير (الصفحة الرئيسية)
**ملف جديد:** `src/app/[locale]/(dashboard)/moderator/page.tsx`

- تستخدم `useAdminTasks({ department: 'photography' })` لجلب مهام قسم التصوير
- تعرض جدول مهام مع كل البيانات (العنوان، الحالة، الأولوية، المسؤول، الديدلاين، النوع، إلخ)
- زر عرض التفاصيل لكل تسك → يفتح Dialog يعرض:
  - كل بيانات التسك
  - التعليقات
  - الملفات المرفقة (مع أيقونات ورابط تحميل)
- **بدون أي أزرار إضافة أو تعديل أو حذف**

#### 6.2 صفحة مهام المحتوى
**ملف جديد:** `src/app/[locale]/(dashboard)/moderator/content/page.tsx`

- نفس الهيكل بالظبط لكن بفلتر `department: 'content'`

#### 6.3 الكمبوننت المشترك (لتجنب التكرار)
**ملف جديد:** `src/components/moderator/department-tasks-view.tsx`

كمبوننت واحد يستقبل `department: 'photography' | 'content'` كـ prop:
- يستخدم `useAdminTasks({ department })` لجلب التسكات
- يعرض جدول بالأعمدة: العنوان | الحالة | الأولوية | القسم | النوع | المسؤول | الديدلاين
- فلتر بحث بالعنوان + فلتر حالة + فلتر أولوية
- Pagination
- زر 👁️ لعرض التفاصيل الكاملة (Dialog/Sheet)
- يستخدم `useTaskDetails(taskId)` لجلب التفاصيل + التعليقات + المرفقات
- **لا يوجد أي mutation أو action** — read-only تمامًا

```
moderator/page.tsx  → <DepartmentTasksView department="photography" />
moderator/content/page.tsx → <DepartmentTasksView department="content" />
```

---

### 7. تعديل نظام إنشاء المستخدمين

#### 7.1 Add User Dialog
**الملف:** `src/components/admin/add-user-dialog.tsx`

- إضافة `'moderator'` في الـ Zod schema `role` enum:
```diff
- role: z.enum(['admin', 'accountant', 'team_leader', 'account_manager', 'creator', 'designer', 'client', 'videographer', 'editor', 'photographer']),
+ role: z.enum(['admin', 'accountant', 'team_leader', 'account_manager', 'creator', 'designer', 'client', 'videographer', 'editor', 'photographer', 'moderator']),
```

- المودريتور **لا يحتاج قسم** (مثل الأدمن والمحاسب) — `department = null`

#### 7.2 Server Action
**الملف:** `src/lib/actions/users.ts`

- `resolveDepartment()` → لا تحتاج تعديل لأن المودريتور بدون قسم (يرجع `null` بشكل افتراضي)

---

### 8. تعديل عرض الرول في الجداول

#### 8.1 Users Table
**الملف:** `src/components/admin/users-table.tsx`

إضافة في `roleColors` و `ROLE_I18N_KEYS`:

```diff
  const roleColors: Record<UserRole, string> = {
      ...
      designer: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
+     moderator: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  }

  const ROLE_I18N_KEYS: Record<UserRole, string> = {
      ...
      designer: 'roleDesigner',
+     moderator: 'roleModerator',
  }
```

---

### 9. إضافة الترجمات
**الملفات:** ملفات الترجمة `src/i18n/messages/ar.json` و `en.json`

```json
// في usersTable
"roleModerator": "مودريتور"  // ar
"roleModerator": "Moderator"  // en

// في addUser (لو يوجد قائمة أدوار)
"moderator": "مودريتور"  // ar
"moderator": "Moderator"  // en
```

---

### 10. تعديل Hook الرول
**الملف:** `src/hooks/use-current-role.ts`

إضافة `isModerator` للسهولة:

```diff
  export function useCurrentRole() {
      ...
      const isModerator = role === 'moderator'

      return {
          role,
          isAdmin,
          isAccountant,
          isClient,
+         isModerator,
          isLoading
      }
  }
```

---

## ملخص الملفات

| # | الملف | نوع التعديل |
|---|-------|-------------|
| 1 | `src/types/database.ts` | تعديل — إضافة `'moderator'` للـ UserRole |
| 2 | `supabase/ADD_MODERATOR_ROLE.sql` | **جديد** — SQL migration |
| 3 | `src/lib/routes.tsx` | تعديل — إضافة case `'moderator'` |
| 4 | `src/app/[locale]/(dashboard)/layout.tsx` | تعديل — إضافة في ROLE_PATH_MAP و ROLE_HOME |
| 5 | `src/proxy.ts` | تعديل — إضافة `/moderator` في protectedPrefixes |
| 6 | `src/components/moderator/department-tasks-view.tsx` | **جديد** — كمبوننت عرض مهام القسم (read-only) |
| 7 | `src/app/[locale]/(dashboard)/moderator/page.tsx` | **جديد** — صفحة مهام التصوير |
| 8 | `src/app/[locale]/(dashboard)/moderator/content/page.tsx` | **جديد** — صفحة مهام المحتوى |
| 9 | `src/components/admin/add-user-dialog.tsx` | تعديل — إضافة moderator في schema |
| 10 | `src/components/admin/users-table.tsx` | تعديل — إضافة لون وترجمة |
| 11 | `src/hooks/use-current-role.ts` | تعديل — إضافة `isModerator` |
| 12 | `src/i18n/messages/ar.json` | تعديل — ترجمات عربي |
| 13 | `src/i18n/messages/en.json` | تعديل — ترجمات إنجليزي |

---

## التصميم المعماري

```
المودريتور يسجّل دخول
       ↓
  Middleware يتحقق (proxy.ts)
       ↓
  Layout يتحقق من الرول → يسمح بـ /moderator/* فقط
       ↓
  Sidebar تعرض صفحتين: مهام التصوير + مهام المحتوى
       ↓
  الصفحة تستخدم DepartmentTasksView(department)
       ↓
  useAdminTasks({ department }) → Supabase SELECT (RLS تسمح)
       ↓
  عرض الجدول + تفاصيل التسك + المرفقات + التعليقات
       ↓
  ❌ لا يوجد أي mutation / form / button للتعديل
```

---

## نقاط مهمة
1. **عدم التكرار:** كمبوننت واحد `DepartmentTasksView` يُستخدم في الصفحتين مع prop مختلف
2. **Read-Only بالكامل:** لا يُعرض أي زر إضافة/تعديل/حذف — ولا يُستدعى أي mutation hook
3. **RLS:** المودريتور يملك SELECT فقط على tasks, attachments, comments — بدون INSERT/UPDATE/DELETE
4. **إنشاء الحساب:** نفس flow إنشاء أي مستخدم من لوحة الأدمن
5. **بدون قسم:** المودريتور `department = null` لأنه يشاهد القسمين
6. **إعادة استخدام:** نستخدم `useAdminTasks` و `useTaskDetails` الموجودين — بدون hooks جديدة
7. **إعادة استخدام الـ UI:** نستخدم `StatusBadge`, `PriorityBadge`, `DepartmentBadge` من `task-badges.tsx`
