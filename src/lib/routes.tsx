
import {
    LayoutDashboard,
    Users,
    Settings,
    FileText,
    Wallet,
    CheckSquare,
    Palette,
    BarChart3,
    Calendar,
    CalendarDays,
    MessageSquare,
    Camera,
    Video,
    Film,
    Package,
    ScrollText,
    UserCircle,
    Banknote,
    RotateCcw,
} from 'lucide-react'

import type { Department } from '@/types/database'

export interface RouteItem {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
}

export const getRoutes = (
    role: string,
    isAr: boolean,
    department?: Department | null
): RouteItem[] => {
    const t = (en: string, ar: string) => isAr ? ar : en

    switch (role) {
        case 'admin':
            return [
                { name: t('Overview', 'نظرة عامة'), href: '/admin', icon: LayoutDashboard },
                { name: t('Users', 'المستخدمين'), href: '/admin/users', icon: Users },
                { name: t('Treasury', 'الخزينة'), href: '/admin/treasury', icon: Wallet },
                { name: t('Packages', 'الباقات'), href: '/admin/treasury/packages', icon: Package },
                { name: t('Client Accounts', 'حسابات العملاء'), href: '/admin/treasury/client-accounts', icon: UserCircle },
                { name: t('Treasury Logs', 'سجل الخزينة'), href: '/admin/treasury/logs', icon: ScrollText },
                { name: t('Advances', 'السلف'), href: '/admin/advances', icon: Banknote },
                { name: t('Tasks', 'المهام'), href: '/admin/tasks', icon: CheckSquare },
                { name: t('Schedule', 'الجداول'), href: '/admin/schedule', icon: CalendarDays },
                { name: t('Content (CMS)', 'المحتوى'), href: '/admin/pages', icon: FileText },
                { name: t('Theme', 'المظهر'), href: '/admin/theme', icon: Palette },
                { name: t('Reports', 'التقارير'), href: '/admin/reports', icon: BarChart3 },
                { name: t('Settings', 'الإعدادات'), href: '/admin/settings', icon: Settings },
            ]

        case 'client':
            return [
                { name: t('Dashboard', 'الرئيسية'), href: '/client', icon: LayoutDashboard },
                { name: t('My Account', 'حسابي'), href: '/client/account', icon: Wallet },
                { name: t('Tasks', 'المهام'), href: '/client/tasks', icon: CheckSquare },
                { name: t('My Revisions', 'تعديلاتي'), href: '/client/revisions', icon: RotateCcw },
                { name: t('Schedule', 'الجدول'), href: '/client/schedule', icon: Calendar },
                { name: t('Messages', 'المراسلات'), href: '/client/chat', icon: MessageSquare },
            ]

        case 'team_leader':
            return [
                { name: t('Tasks Board', 'لوحة المهام'), href: '/team-leader', icon: LayoutDashboard },
                { name: t('Revisions Hub', 'المراجعات'), href: '/team-leader/revisions', icon: FileText },
                { name: t('Schedule', 'جدول المواعيد'), href: '/team-leader/schedule', icon: Calendar },
                { name: t('Activity Log', 'سجل النشاط'), href: '/team-leader/logs', icon: ScrollText },
                ...(department === 'photography' ? [
                    { name: t('Client Chat', 'مراسلة العملاء'), href: '/team-leader/chat', icon: MessageSquare },
                ] : []),
            ]

        case 'account_manager':
            return [
                { name: t('Tasks Board', 'لوحة المهام'), href: '/account-manager', icon: LayoutDashboard },
                { name: t('Revisions Hub', 'المراجعات'), href: '/account-manager/revisions', icon: FileText },
                { name: t('Schedule', 'جدول المواعيد'), href: '/account-manager/schedule', icon: Calendar },
                { name: t('Activity Log', 'سجل النشاط'), href: '/account-manager/logs', icon: ScrollText },
                { name: t('Client Chat', 'مراسلة العملاء'), href: '/account-manager/chat', icon: MessageSquare },
            ]

        case 'creator':
        case 'designer':
            return [
                { name: t('My Tasks', 'مهامي'), href: '/creator', icon: CheckSquare },
                { name: t('Schedule', 'الجدول'), href: '/creator/schedule', icon: Calendar },
            ]

        case 'accountant':
            return [
                { name: t('Treasury', 'الخزينة'), href: '/accountant', icon: Wallet },
                { name: t('Client Accounts', 'حسابات العملاء'), href: '/accountant/client-accounts', icon: UserCircle },
                { name: t('Advances', 'السلف'), href: '/accountant/advances', icon: Banknote },
                { name: t('Reports', 'التقارير'), href: '/accountant/reports', icon: BarChart3 },
            ]

        case 'videographer':
            return [
                { name: t('My Tasks', 'مهامي'), href: '/videographer', icon: Video },
                { name: t('Schedule', 'الجدول'), href: '/videographer/schedule', icon: Calendar },
            ]

        case 'editor':
            return [
                { name: t('Editing Tasks', 'مهام المونتاج'), href: '/editor', icon: Film },
                { name: t('Schedule', 'الجدول'), href: '/editor/schedule', icon: Calendar },
            ]

        case 'photographer':
            return [
                { name: t('My Tasks', 'مهامي'), href: '/photographer', icon: Camera },
                { name: t('Schedule', 'الجدول'), href: '/photographer/schedule', icon: Calendar },
            ]

        case 'moderator':
            return [
                { name: t('Photography Tasks', 'مهام التصوير'), href: '/moderator', icon: Camera },
                { name: t('Content Tasks', 'مهام المحتوى'), href: '/moderator/content', icon: FileText },
            ]

        default:
            return []
    }
}
