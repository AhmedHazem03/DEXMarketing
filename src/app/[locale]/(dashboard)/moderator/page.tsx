import { DepartmentTasksView } from '@/components/moderator/department-tasks-view'
import { PageHeader } from '@/components/admin/page-header'

export const dynamic = 'force-dynamic'

export default function ModeratorPhotographyPage() {
    return (
        <div className="space-y-4 md:space-y-6">
            <PageHeader
                title="مهام قسم التصوير"
                description="عرض جميع مهام قسم التصوير والملفات المرفقة بها."
            />
            <DepartmentTasksView department="photography" />
        </div>
    )
}
