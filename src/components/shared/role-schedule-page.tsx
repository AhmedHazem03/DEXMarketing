'use client'

import { useLocale } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { ReadOnlyScheduleView } from '@/components/schedule'
import { useCurrentUser, useMyDepartmentLeader } from '@/hooks/use-users'

interface RoleSchedulePageProps {
    title: { ar: string; en: string }
}

export function RoleSchedulePage({ title }: RoleSchedulePageProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const { data: currentUser, isLoading } = useCurrentUser()
    const { data: leader, isLoading: leaderLoading } = useMyDepartmentLeader(
        currentUser?.department ?? null,
        currentUser?.role ?? null
    )

    if (isLoading || leaderLoading || !currentUser) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6">
            <ReadOnlyScheduleView
                teamLeaderId={leader?.id}
                userId={!leader ? currentUser.id : undefined}
                title={isAr ? title.ar : title.en}
            />
        </div>
    )
}
