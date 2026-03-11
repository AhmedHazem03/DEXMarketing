# خريطة شاملة لجميع أماكن رفع الصور والفيديوهات

> تاريخ الإنشاء: 11 مارس 2026  
> يغطي هذا الملف **كل** نقطة رفع ملفات (صور / فيديو / مستندات) في المشروع

---

## البنية العامة

```
رفع الملفات
├── Cloudinary  ← الوجهة الرئيسية لتخزين الملفات
│   ├── cloudinary.ts  ← دالة الرفع المركزية
│   └── FormData (file + upload_preset + folder)
└── Supabase DB  ← حفظ metadata بعد الرفع (روابط + أحجام + أنواع)
    └── attachments table
```

---

## 1. `src/lib/cloudinary.ts` — المكتبة المركزية للرفع

**الدور:** Single source of truth — كل مكوّنات الرفع تستدعي هذه الدالة.

| البند | التفاصيل |
|---|---|
| الدالة | `uploadToCloudinary(file, folder?)` |
| السطر | ~32 |
| الرفع إلى | `https://api.cloudinary.com/v1_1/{cloud}/auto/upload` |
| الحقول المرسلة | `file`, `upload_preset`, `folder` |
| صور مسموح بها | `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, `image/avif` |
| فيديوهات مسموح بها | `video/mp4`, `video/webm`, `video/quicktime` |
| مستندات مسموح بها | `application/pdf` |
| حد الصور | ≤ 10 MB |
| حد الفيديوهات | ≤ 200 MB |

---

## 2. `src/components/ui/media-uploader.tsx` — مكوّن رفع الوسائط (Schedules)

**السياق:** مستخدم في نماذج الجداول — يتيح رفع صور وفيديوهات متعددة.

| البند | التفاصيل |
|---|---|
| المكوّن | `<MediaUploader>` |
| `<input type="file">` | سطر ~233 |
| accept | `image/*,video/*` (قابل للتخصيص) |
| الدالة المحلية | `handleFileUpload` → `uploadToCloudinary()` |
| السطور الرئيسية | 75–149 (handleFileUpload), 121 (uploadToCloudinary), 233 (input) |
| Cloudinary folder | `'schedules'` |
| maxFiles | 20 ملف |
| مُستخدم في | `src/components/schedule/schedule-form.tsx` |

---

## 3. `src/components/admin/media-upload.tsx` — مكوّن رفع CMS (الأدمن)

**السياق:** Admin Pages Manager — رفع صورة أو فيديو واحد مع Drag & Drop.

| البند | التفاصيل |
|---|---|
| المكوّن | `<MediaUpload>` |
| `<input type="file">` | سطر ~128 |
| accept | `image/*` أو `video/*` أو `image/*,video/*` (ديناميكي) |
| handleUpload | سطر 49–88 |
| handleDrop (Drag & Drop) | سطر 105–110 |
| handleFileChange | سطر 91–96 |
| Cloudinary folder | `'dex-erp/cms'` |
| maxSizeMB | 10 MB |
| مُستخدم في | `src/components/admin/pages-manager/item-editor.tsx` |

---

## 4. `src/components/tasks/file-upload-zone.tsx` — منطقة رفع مرفقات المهام

**السياق:** رفع مرفقات للمهام — يدعم صور وفيديو ومستندات متعددة مع Drag & Drop وشريط تقدم.

| البند | التفاصيل |
|---|---|
| المكوّن | `<FileUploadZone>` |
| `<input type="file">` | سطر ~312 |
| accept (default) | `image/*`, `video/*`, `application/pdf`, `.doc`, `.docx`, `.psd`, `.ai`, `.zip` |
| الدالة | دالة محلية `uploadToCloudinary` → `CLOUDINARY_UPLOAD_URL` |
| السطور الرئيسية | 169–231 (upload logic), 276–292 (Drag & Drop), 312 (input) |
| Cloudinary folder | `dex-erp/tasks/{taskId}` أو `dex-erp/client-requests` |
| حفظ في DB | `useAddAttachment()` → Supabase `attachments` table (سطر 195–209) |
| maxFileSize | 10 MB (default) |
| مُستخدم في | `creator/page.tsx`, `role-dashboard.tsx`, `today-tasks-section.tsx` |

---

## 5. `src/app/[locale]/(dashboard)/profile/profile-client.tsx` — صورة الملف الشخصي

**السياق:** User Profile — رفع avatar للمستخدم.

| البند | التفاصيل |
|---|---|
| `<input type="file">` | سطر ~163 |
| accept | `image/*` فقط |
| handleFileChange | سطر ~40 — تحقق الحجم (≤ 2 MB) والنوع |
| الرفع | `uploadToCloudinary(avatarFile, 'avatars')` (سطر ~71) |
| Cloudinary folder | `'avatars'` |
| حد الحجم | 2 MB (أصغر من الحد الافتراضي) |
| السطور الرئيسية | 40–65 (validation), 66–82 (upload), 163–164 (input) |

---

## 6. `src/components/schedule/schedule-form.tsx` — نموذج الجدولة

**السياق:** يستخدم `<MediaUploader>` لرفع وسائط الجداول.

| البند | التفاصيل |
|---|---|
| المكوّن المستخدم | `<MediaUploader>` (سطر ~554) |
| maxFiles | 20 |
| Cloudinary folder | `'schedules'` |
| السطران الرئيسيان | 23 (import), 554–557 (usage) |

---

## 7. `src/components/admin/pages-manager/item-editor.tsx` — محرر عناصر CMS

**السياق:** تحرير عناصر المحتوى في لوحة الأدمن — يستخدم `<MediaUpload>`.

| البند | التفاصيل |
|---|---|
| المكوّن المستخدم | `<MediaUpload>` (سطر ~80) |
| accept | ديناميكي: `'image'` / `'video'` / `'both'` (سطر ~84) |
| Cloudinary folder | `dex-erp/cms/{slug}` |
| الحقول التي تقبل وسائط | `services` → image, `portfolio` → image أو video |
| السطور الرئيسية | 8 (import), 74, 76–84 (usage) |

---

## 8. `src/app/[locale]/(dashboard)/creator/page.tsx` — داشبورد الكريتور

**السياق:** Creator Dashboard — رفع مرفقات للمهام المعيّنة.

| البند | التفاصيل |
|---|---|
| المكوّن المستخدم | `<FileUploadZone>` (سطر ~148) |
| taskId | من المهمة المحددة |
| maxFileSize | 25 MB (أكبر من الحد الافتراضي) |
| السطور الرئيسية | 39 (import), 61, 148–153, 185–188 |

---

## 9. `src/components/shared/role-dashboard.tsx` — داشبورد الأدوار المشتركة

**السياق:** Designer / Photographer / الأدوار الأخرى — رفع مرفقات المهام اليومية.

| البند | التفاصيل |
|---|---|
| المكوّن المستخدم | `<FileUploadZone>` (سطر ~279) |
| onUploadComplete | `handleFileUploaded` → `addAttachment.mutateAsync()` |
| السطور الرئيسية | 21 (import), 78, 84, 101–108, 248–253, 279–282 |

---

## 10. `src/components/shared/today-tasks-section.tsx` — قسم مهام اليوم

**السياق:** Today Tasks (مشترك بين الأدوار) — رفع مرفقات من قائمة المهام السريعة.

| البند | التفاصيل |
|---|---|
| المكوّن المستخدم | `<FileUploadZone>` (سطر ~249) |
| handleFileUploaded | سطر ~56 → `addAttachment.mutateAsync()` |
| السطور الرئيسية | 17–18 (import), 41, 43, 56–62, 249–252 |

---

## 11. `src/hooks/use-tasks.ts` — هوك حفظ المرفقات في DB

**السياق:** يُستدعى بعد رفع الملف — يحفظ metadata في Supabase.

| البند | التفاصيل |
|---|---|
| الهوك | `useAddAttachment()` (سطر ~783) |
| الجدول | `supabase.from('attachments').insert(...)` |
| الحقول المحفوظة | `task_id`, `file_url`, `file_name`, `file_type`, `file_size`, `uploaded_by`, `is_final` |
| السطور الرئيسية | 783–825 |

---

## ملخص سريع — جدول كامل

| # | الملف | نوع الرفع | الوجهة | السياق |
|---|---|---|---|---|
| 1 | `src/lib/cloudinary.ts` | Image / Video / PDF | Cloudinary | دالة مركزية مشتركة |
| 2 | `src/components/ui/media-uploader.tsx` | Image + Video (متعدد، حتى 20) | Cloudinary | الجداول - Schedules |
| 3 | `src/components/admin/media-upload.tsx` | Image / Video / كليهما | Cloudinary | CMS - Admin Pages |
| 4 | `src/components/tasks/file-upload-zone.tsx` | Image / Video / PDF / Docs | Cloudinary + Supabase | مرفقات المهام |
| 5 | `src/app/.../profile/profile-client.tsx` | Image فقط (≤ 2 MB) | Cloudinary | صورة الملف الشخصي |
| 6 | `src/components/schedule/schedule-form.tsx` | Image + Video | Cloudinary (via MediaUploader) | نموذج الجدولة |
| 7 | `src/components/admin/pages-manager/item-editor.tsx` | Image / Video | Cloudinary (via MediaUpload) | محرر محتوى CMS |
| 8 | `src/app/.../creator/page.tsx` | Image / Video / Docs (≤ 25 MB) | Cloudinary + Supabase | داشبورد الكريتور |
| 9 | `src/components/shared/role-dashboard.tsx` | Image / Video / Docs | Cloudinary + Supabase | داشبورد الأدوار |
| 10 | `src/components/shared/today-tasks-section.tsx` | Image / Video / Docs | Cloudinary + Supabase | مهام اليوم |
| 11 | `src/hooks/use-tasks.ts` | — (metadata فقط) | Supabase DB | حفظ بيانات المرفقات |

---

## مجلدات Cloudinary المستخدمة

| المجلد | من أين يُرفع |
|---|---|
| `avatars` | Profile - صورة المستخدم |
| `schedules` | Schedule Form / MediaUploader |
| `dex-erp/cms` | Admin Media Upload (base) |
| `dex-erp/cms/{slug}` | Item Editor — حسب اسم الصفحة |
| `dex-erp/tasks/{taskId}` | FileUploadZone — مرفقات المهام |
| `dex-erp/client-requests` | FileUploadZone — طلبات العملاء |

---

## حدود الحجم المطبّقة

| المكان | الحد |
|---|---|
| صورة الملف الشخصي (Avatar) | 2 MB |
| CMS Media Upload (Admin) | 10 MB |
| FileUploadZone (Tasks default) | 10 MB |
| Creator Dashboard Tasks | 25 MB |
| Cloudinary - الصور (مكتبة مركزية) | 10 MB |
| Cloudinary - الفيديوهات (مكتبة مركزية) | 200 MB |
