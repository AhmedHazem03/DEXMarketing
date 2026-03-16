# 🔍 تقرير مراجعة ملفات Hooks

> تاريخ المراجعة: 2026-03-13

---

## ملخص سريع

| الملف | مشاكل حرجة 🔴 | مشاكل متوسطة 🟡 | ملاحظات 🔵 |
|---|---|---|---|
| index.ts | 0 | 1 | 1 |
| use-advances.ts | 1 | 1 | 0 |
| use-auth-dashboard-link.ts | 0 | 1 | 1 |
| use-chat.ts | 1 | 3 | 1 |
| use-client-accounts.ts | 0 | 2 | 1 |
| use-client-assignments.ts | 0 | 0 | 1 |
| use-client-portal.ts | 0 | 1 | 1 |
| use-clients.ts | 0 | 1 | 1 |
| use-cms.ts | 0 | 1 | 2 |
| use-current-role.ts | 0 | 0 | 0 |
| use-debounce.ts | 0 | 0 | 0 |
| use-device-capabilities.ts | 0 | 0 | 1 |
| use-logout.ts | 0 | 0 | 0 |
| use-notifications.ts | 0 | 0 | 0 |
| use-packages.ts | 0 | 0 | 1 |
| use-pagination.ts | 0 | 0 | 0 |
| use-projects.ts | 0 | 1 | 1 |
| use-realtime.ts | 0 | 1 | 1 |
| use-schedule.ts | 0 | 0 | 2 |
| use-tasks.ts | 0 | 3 | 2 |
| use-team-logs.ts | 0 | 0 | 1 |
| use-throttle.ts | 0 | 0 | 0 |
| use-treasury-logs.ts | 0 | 1 | 0 |
| use-treasury.ts | 0 | 1 | 1 |
| use-users.ts | 0 | 1 | 1 |

**الإجمالي: 2 حرجة 🔴 | 19 متوسطة 🟡 | 18 ملاحظة 🔵**

---

## التفاصيل لكل ملف

---

### 📁 `index.ts`

🟡 **تصدير ناقص - hooks غير مُصدّرة:**
- `useCreatePage`, `useDeletePage` من `use-cms.ts` غير مُصدّرة
- `useClientAccountsRealtimeSync` من `use-realtime.ts` غير مُصدّرة
- `useAuthDashboardLink` من `use-auth-dashboard-link.ts` غير مُصدّرة
- `useDeviceCapabilities` من `use-device-capabilities.ts` غير مُصدّرة
- `useThrottle` من `use-throttle.ts` غير مُصدّرة
- `useForwardTask`, `useClientTasks`, `useClientTasksStats` من `use-tasks.ts` غير مُصدّرة
- `useUpdateTransaction`, `useApproveTransaction`, `usePaymentMethodSummary` من `use-treasury.ts` غير مُصدّرة
- `useTeamMembers` من `use-users.ts` غير مُصدّرة

🔵 **ملاحظة:** الملف جيد التنظيم ولكن يحتاج مزامنة مع كل الـ hooks المتوفرة.

---

### 📁 `use-advances.ts`

🔴 **خطر Race Condition في `useDeleteAdvanceRecipient`:**
- سطر 57-60: حلقة `for...of` تحذف المعاملات واحدة واحدة بدون `Promise.all`. لو فشلت عملية حذف في المنتصف، تبقى البيانات في حالة غير متسقة (بعض المعاملات محذوفة وبعضها لا).
- **الحل:** استخدام `Promise.all` للحذف المتوازي أو تنفيذ العملية في Supabase RPC كـ transaction واحدة.

🟡 **خطأ محتمل في حذف Advance:**
- `useDeleteAdvance` (سطر ~170): يحذف الـ advance أولاً ثم الـ transaction. لو فشل حذف الـ transaction بعد حذف الـ advance، يبقى الـ transaction يتيم بدون advance مرتبط.
- **الحل:** عكس الترتيب: حذف الـ transaction أولاً ثم الـ advance.

---

### 📁 `use-auth-dashboard-link.ts`

🟡 **عدم وجود `'use client'` directive:**
- الملف يستخدم `useState`, `useEffect` (React client hooks) لكنه لا يحتوي على `'use client'` في أعلى الملف.
- **الحل:** إضافة `'use client'` في أول سطر.

🔵 **ملاحظة:** `eslint-disable` مستخدم لتجاوز `react-hooks/exhaustive-deps` — مبرر منطقياً لأن `supabase` يُنشأ كـ singleton.

---

### 📁 `use-chat.ts`

🔴 **متغير `unreadQuery` غير مستخدم (Dead Code):**
- سطر ~87-91: `let unreadQuery = supabase.from('messages')...` يتم إنشاؤه لكنه لا يُستخدم أبداً. تم استبداله بـ query آخر بعده مباشرة. هذا يُنفّذ query إلى Supabase بدون سبب (يهدر bandwidth و DB resources).
- **الحل:** حذف `unreadQuery` بالكامل.

🟡 **حساب `unreadCount` غير دقيق في `useConversations`:**
- سطر ~97-103: الـ `unreadMessages` query لا يتضمن `created_at` في الـ select لكن يُستخدم لاحقاً في المقارنة `new Date(m.created_at || 0)`. الـ select يأخذ `id, conversation_id` فقط بدون `created_at`.
- **الحل:** إضافة `created_at` إلى الـ select.

🟡 **limit غير كافي في `useConversations`:**
- سطر ~76: `.limit(convIds.length * 2)` — لو عدد المحادثات 100، يجلب 200 رسالة فقط. لو بعض المحادثات فيها رسائل كثيرة، ممكن ما يجيب آخر رسالة لكل المحادثات.
- **الحل:** استخدام `distinct on` عبر RPC أو زيادة الـ limit.

🟡 **`useFindOrCreateConversation` - عدم فحص خطأ في إنشاء Participants:**
- سطر ~540+: بعد إنشاء المحادثة، يتم insert participants بدون التحقق من نجاح العملية قبل المتابعة.

🔵 **ملاحظة:** كثرة `eslint-disable` — 3 مرات لـ `react-hooks/exhaustive-deps`.

---

### 📁 `use-client-accounts.ts`

🟡 **استخدام `as any` للتعامل مع Supabase types:**
- سطور متعددة: `(supabase.from('client_accounts') as any)` — يتجاوز type checking. هذا يُخفي أخطاء Types محتملة.
- **الحل:** تحديث Supabase generated types أو إنشاء type overrides مناسبة.

🟡 **`useMyClientAccounts` - N+1 query pattern:**
- يجلب أولاً الـ client record ثم يجلب الحسابات. يمكن دمجها في query واحد.

🔵 **ملاحظة:** `sanitizeSearch` مستخدم بشكل صحيح لحماية من SQL injection.

---

### 📁 `use-client-assignments.ts`

🔵 **ملاحظة:** الملف نظيف وجيد التنظيم. لا مشاكل واضحة.

---

### 📁 `use-client-portal.ts`

🟡 **استخدام `as never` cast:**
- سطور `useApproveTask` و `useRejectTask`: `.update({...} as never)` — يتجاوز type safety تماماً.
- **الحل:** إنشاء type مناسب للـ update payload.

🔵 **ملاحظة:** `useCreateClientRequest` يبحث عن team leader ولو ما لقاه يعيّن `null` — ممكن المهمة تضيع بدون مسؤول.

---

### 📁 `use-clients.ts`

🟡 **استخدام `as any` على Supabase client:**
- سطر ~32: `(supabase.from('clients') as any)` — يتجاوز type checking.

🔵 **ملاحظة:** `useDeleteClient` لا يحذف البيانات المرتبطة (client_accounts, assignments, etc.) — الاعتماد على CASCADE في DB.

---

### 📁 `use-cms.ts`

🟡 **استخدام `@ts-ignore` متعدد:**
- 7 مرات على الأقل — يُخفي أخطاء types حقيقية. كل `@ts-ignore` هو خطأ type مؤجل.
- **الحل:** إضافة الجداول (site_settings, pages, team_members, portfolio, storage_settings, activity_log) إلى Supabase generated types.

🔵 **ملاحظة:** `useUpdateStorageSettings` يجلب الـ ID أولاً ثم يعمل update — يمكن تحسينها بإضافة الـ ID كـ parameter.

🔵 **ملاحظة:** `useLogActivity` لا تعمل `invalidateQueries` بعد النجاح — سجل النشاط لن يتحدث تلقائياً.

---

### 📁 `use-current-role.ts` ✅

لا مشاكل. نظيف ومختصر.

---

### 📁 `use-debounce.ts` ✅

لا مشاكل. Implementation قياسية وصحيحة.

---

### 📁 `use-device-capabilities.ts`

🔵 **ملاحظة:** استخدام `navigator.platform` (deprecated) — يعمل حالياً لكنه قد يتوقف في المتصفحات المستقبلية. البديل: `navigator.userAgentData`.

---

### 📁 `use-logout.ts` ✅

لا مشاكل. نظيف مع fallback مناسب عند الخطأ.

---

### 📁 `use-notifications.ts` ✅

لا مشاكل. نظيف ومختصر.

---

### 📁 `use-packages.ts`

🔵 **ملاحظة:** `as any` مستخدم في mutations للتعامل مع Supabase types — نفس المشكلة العامة.

---

### 📁 `use-pagination.ts` ✅

لا مشاكل. Implementation جيدة مع `useMemo` و `useCallback`.

---

### 📁 `use-projects.ts`

🟡 **Search filter غير آمن:**
- سطر ~43: `query = query.ilike('name', `%${filters.search}%`)` — لا يستخدم `sanitizeSearch` بعكس باقي الملفات (use-tasks, use-client-accounts, use-schedule).
- **الحل:** استخدام `sanitizeSearch(filters.search)` كما في باقي الملفات.

🔵 **ملاحظة:** `as any` مستخدم في mutations.

---

### 📁 `use-realtime.ts`

🟡 **Duplicate function: `useClientAccountsRealtimeSync`:**
- الدالة معرّفة مرتين — مرة في سطر ~200 ومرة في سطر ~260. النسخة الثانية تُعيد تعريف نفس الـ function بنفس المحتوى تماماً.
- **الحل:** حذف النسخة المكررة.

🔵 **ملاحظة:** Singleton pattern في `useTasksRealtime` و `useSchedulesRealtime` ممتاز للأداء.

---

### 📁 `use-schedule.ts`

🔵 **ملاحظة:** `as any` مستخدم بكثرة على Supabase client (كل query تقريباً) — يحتاج تحديث generated types.

🔵 **ملاحظة:** `useCreateSchedule` يعمل `supabase.auth.getUser()` — الأفضل استخدام `getSession()` كما في `useCurrentUser` لتوفير latency.

---

### 📁 `use-tasks.ts`

🟡 **`useForwardTask` - لا يتحقق من نجاح cloning:**
- سطر ~450+: لو فشل clone الـ attachments أو comments، يتم `console.warn` فقط بدون إخطار المستخدم. الـ task الجديد يتم إنشاؤه ناقص.
- **الحل:** إما rollback الـ task الجديد أو إبلاغ المستخدم بأن النسخ كان جزئياً.

🟡 **`useDeleteTask` - حذف يدوي بدلاً من CASCADE:**
- سطر ~490: يحذف attachments و comments يدوياً قبل الـ task. لو الـ DB عندها `ON DELETE CASCADE`، هذا مكرر. لو ما عندها، فيه خطر إنها تفشل جزئياً.
- **الحل:** التأكد من CASCADE constraint في DB أو استخدام Supabase RPC.

🟡 **`useUpdateTaskStatus` - query إضافي غير ضروري أحياناً:**
- سطر ~380+: كل مرة يتم فيها update status إلى `approved`، يتم جلب الـ task كاملاً للتحقق من `client_id`. هذا query إضافي في كل عملية.
- **الحل:** تمرير `client_id` كـ parameter من الـ caller بدلاً من جلبه.

🔵 **ملاحظة:** `useTodayMyTasks` يفلتر completed tasks client-side — أفضل لو يتم الفلترة server-side.

🔵 **ملاحظة:** استخدام `as never` في كل `insert` و `update` — يحتاج تحديث Supabase types.

---

### 📁 `use-team-logs.ts`

🔵 **ملاحظة:** `as any` على Supabase client. نفس المشكلة العامة.

---

### 📁 `use-throttle.ts` ✅

لا مشاكل. Implementation جيدة مع trailing call support.

---

### 📁 `use-treasury-logs.ts`

🟡 **Search filter بدون sanitization:**
- سطر ~71: `const searchTerm = \`%${filters.search}%\`` — لا يستخدم `sanitizeSearch`. يمكن لمستخدم إدخال أحرف خاصة مثل `%` أو `_` تؤثر على الـ LIKE query.
- **الحل:** استخدام `sanitizeSearch(filters.search)` كما في باقي الملفات.

---

### 📁 `use-treasury.ts`

🟡 **`useTreasury` - يجلب كل المعاملات لحساب الرصيد:**
- سطر ~20-35: يجلب **كل** المعاملات المعتمدة ويحسب الرصيد client-side. مع نمو البيانات (آلاف المعاملات) سيصبح بطيئاً جداً.
- **الحل:** استخدام Supabase RPC أو Database View يحسب الـ SUM server-side.

🔵 **ملاحظة:** `useTransactionSummary` نفس المشكلة — يجلب كل المعاملات ويحسب client-side.

---

### 📁 `use-users.ts`

🟡 **`useCurrentUser` يستخدم `getSession()` بدلاً من `getUser()`:**
- سطر ~38: التعليق يقول "Use getSession() (local JWT) instead of getUser() (network call)". هذا يوفر latency لكنه يعني أن المستخدم ممكن يكون مسجل خروج من Supabase Auth (token revoked) لكن التطبيق لا يعرف.
- **قد يكون مقبول** لو الـ server-side validation كافي (كما هو مذكور في التعليق).

🔵 **ملاحظة:** `ROLE_TO_DEPARTMENT` mapping قد يحتاج تحديث لو أُضيفت أدوار جديدة. لا يشمل `team_leader` لقسم `content`.

---

## 📊 المشاكل العامة (Cross-Cutting Issues)

### 1. 🟡 استخدام `as any` / `as never` / `@ts-ignore` بكثرة
**عدد الحالات:** ~30+ عبر كل الملفات
**السبب:** Supabase generated types غير محدثة أو ناقصة للجداول الجديدة.
**الحل:** إعادة توليد Types عبر `supabase gen types typescript`.

### 2. 🟡 عدم وجود Error Boundary pattern
لا يوجد hook مركزي للتعامل مع أخطاء Supabase (مثل 401 Unauthorized). كل hook يرمي الخطأ لـ React Query الذي يعرضه في الـ UI.

### 3. 🔵 حساب بيانات ضخمة Client-Side
`useTreasury` و `useTransactionSummary` يجلبان كل الصفوف ويحسبان client-side — يحتاج migration إلى server-side aggregation.

### 4. 🔵 ESLint Disable كثيرة
`eslint-disable react-hooks/exhaustive-deps` مستخدم ~10 مرات — معظمها مبرر لكن يُفضّل توثيق السبب.
