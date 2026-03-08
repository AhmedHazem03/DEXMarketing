// ============================================
// Treasury System Constants
// ============================================

export interface CategoryOption {
    value: string
    label_en: string
    label_ar: string
}

// Expense Categories (المصروفات)
export const EXPENSE_CATEGORIES: CategoryOption[] = [
    {
        value: 'printing',
        label_en: 'Printing',
        label_ar: 'طباعة'
    },
    {
        value: 'company',
        label_en: 'Company Expenses',
        label_ar: 'مصروفات الشركة'
    },
    {
        value: 'social',
        label_en: 'Social Media',
        label_ar: 'سوشيال ميديا'
    },
    {
        value: 'advance',
        label_en: 'Advance',
        label_ar: 'سلفة'
    }
] as const

// Income Categories (الإيرادات)
export const INCOME_CATEGORIES: CategoryOption[] = [
    {
        value: 'printed',
        label_en: 'Printed Materials',
        label_ar: 'مطبوعات'
    },
    {
        value: 'social',
        label_en: 'Social Media',
        label_ar: 'سوشيال ميديا'
    }
] as const

// Combined categories map for quick lookup
export const CATEGORIES_MAP = {
    expense: EXPENSE_CATEGORIES,
    income: INCOME_CATEGORIES
} as const

// Log action types
export const LOG_ACTIONS = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    APPROVE: 'approve',
    REJECT: 'reject'
} as const

export type LogAction = typeof LOG_ACTIONS[keyof typeof LOG_ACTIONS]

// Log action labels
export const LOG_ACTION_LABELS: Record<LogAction, { en: string; ar: string }> = {
    create: { en: 'Created', ar: 'إنشاء' },
    update: { en: 'Updated', ar: 'تعديل' },
    delete: { en: 'Deleted', ar: 'حذف' },
    approve: { en: 'Approved', ar: 'موافقة' },
    reject: { en: 'Rejected', ar: 'رفض' }
}

// Transaction status
export const TRANSACTION_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
} as const

// Helper function to get categories by type
export function getCategoriesByType(type: 'income' | 'expense', locale: 'en' | 'ar' = 'en') {
    const categories = CATEGORIES_MAP[type]
    return categories.map(cat => ({
        value: cat.value,
        label: locale === 'ar' ? cat.label_ar : cat.label_en
    }))
}

// Helper function to get category label
export function getCategoryLabel(
    categoryValue: string | null | undefined,
    isAr: boolean = false
): string {
    if (!categoryValue) return '-'
    const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]
    const category = allCategories.find(cat => cat.value === categoryValue)
    if (!category) return categoryValue
    return isAr ? category.label_ar : category.label_en
}

// Helper function to get log action label
export function getLogActionLabel(action: LogAction, locale: 'en' | 'ar' = 'en'): string {
    const label = LOG_ACTION_LABELS[action]
    return locale === 'ar' ? label.ar : label.en
}
