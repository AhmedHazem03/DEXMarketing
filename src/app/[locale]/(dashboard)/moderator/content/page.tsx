import { DepartmentTasksView } from '@/components/moderator/department-tasks-view'
import { PageHeader } from '@/components/admin/page-header'

export const dynamic = 'force-dynamic'

export default function ModeratorContentPage() {
    return (
        <div className="space-y-4 md:space-y-6">
            <PageHeader
                title="مهام قسم المحتوى"
                description="عرض جميع مهام قسم المحتوى والملفات المرفقة بها."
            />
            <DepartmentTasksView department="content" />
        </div>
    )
}
