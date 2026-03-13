'use client'

import { useLocale } from 'next-intl'
import { CalendarDays } from 'lucide-react'
import { useCurrentUser, useMyDepartmentLeader } from '@/hooks/use-users'
import { ScheduleCalendar } from '@/components/schedule'
import { Skeleton } from '@/components/ui/skeleton'

export default function CreatorSchedulePage() {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const { data: currentUser, isLoading: userLoading } = useCurrentUser()
    const { data: leader, isLoading: leaderLoading } = useMyDepartmentLeader(currentUser?.department, currentUser?.role)

    const isLoading = userLoading || leaderLoading

    if (isLoading) {
        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-11 w-11 rounded-2xl" />
                    <div>
                        <Skeleton className="h-6 w-40 mb-1" />
                        <Skeleton className="h-3 w-56" />
                    </div>
                </div>
                <Skeleton className="h-[500px] rounded-2xl" />
            </div>
        )
    }

    if (!currentUser) {
        return (
            <div className="p-4 sm:p-6">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">
                        {isAr ? 'لم يتم العثور على معلومات المستخدم' : 'User information not found'}
                    </p>
                </div>
            </div>
        )
    }

    if (!leader) {
        return (
            <div className="p-4 sm:p-6">
                <div className="text-center py-12">
                    <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h2 className="text-lg font-semibold mb-2">
                        {isAr ? 'لم يتم العثور على قائد الفريق' : 'Team Leader Not Found'}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {isAr 
                            ? 'لا يوجد قائد فريق نشط في قسمك حالياً. يرجى الاتصال بالمسؤول.'
                            : 'There is no active team leader in your department. Please contact the administrator.'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/5">
                    <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">
                        {isAr ? 'جدول المحتوى' : 'Content Schedule'}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        {isAr ? 'إنشاء وإدارة جدول المحتوى الخاص بك' : 'Create and manage your content schedule'}
                    </p>
                </div>
            </div>

            <ScheduleCalendar teamLeaderId={leader.id} userRole={currentUser.role} simplifiedForm={true} />
        </div>
    )
}
