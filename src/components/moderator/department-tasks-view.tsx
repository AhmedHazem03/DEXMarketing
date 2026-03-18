'use client'

import { useState, useMemo, memo } from 'react'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { useAdminTasks, useTaskDetails } from '@/hooks/use-tasks'
import { useTasksRealtime } from '@/hooks/use-realtime'
import { useDebounce } from '@/hooks'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { getFileIcon, formatFileSize } from '@/lib/file-utils'
import {
    Loader2,
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    User,
    Clock,
    MapPin,
    Tag,
    MessageSquare,
    Paperclip,
    FolderOpen,
    Hash,
    AlertTriangle,
    ExternalLink,
    Download,
    Star,
    Building2,
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge, PriorityBadge, DepartmentBadge } from '@/components/shared/task-badges'
import type { Department, TaskStatus, TaskPriority } from '@/types/database'
import type { TaskWithRelations, TaskFilters } from '@/types/task'

// ============================================
// Constants
// ============================================

const PAGE_SIZE = 15

const STATUS_OPTIONS: { value: TaskStatus | 'all'; labelAr: string; labelEn: string }[] = [
    { value: 'all', labelAr: 'كل الحالات', labelEn: 'All Statuses' },
    { value: 'new', labelAr: 'جديد', labelEn: 'New' },
    { value: 'in_progress', labelAr: 'قيد التنفيذ', labelEn: 'In Progress' },
    { value: 'review', labelAr: 'مراجعة', labelEn: 'Review' },
    { value: 'client_review', labelAr: 'مراجعة العميل', labelEn: 'Client Review' },
    { value: 'client_revision', labelAr: 'تعديل العميل', labelEn: 'Client Revision' },
    { value: 'revision', labelAr: 'تعديل', labelEn: 'Revision' },
    { value: 'approved', labelAr: 'معتمد', labelEn: 'Approved' },
    { value: 'rejected', labelAr: 'مرفوض', labelEn: 'Rejected' },
    { value: 'completed', labelAr: 'مكتمل', labelEn: 'Completed' },
]

const PRIORITY_OPTIONS: { value: TaskPriority | 'all'; labelAr: string; labelEn: string }[] = [
    { value: 'all', labelAr: 'كل الأولويات', labelEn: 'All Priorities' },
    { value: 'low', labelAr: 'منخفض', labelEn: 'Low' },
    { value: 'medium', labelAr: 'متوسط', labelEn: 'Medium' },
    { value: 'high', labelAr: 'عالي', labelEn: 'High' },
    { value: 'urgent', labelAr: 'عاجل', labelEn: 'Urgent' },
]

// ============================================
// Utility
// ============================================

function formatTaskDate(dateString: string | null | undefined, fmt: string = 'dd/MM/yyyy'): string {
    if (!dateString) return '-'
    try {
        const d = new Date(dateString)
        if (isNaN(d.getTime())) return '-'
        return format(d, fmt)
    } catch {
        return '-'
    }
}

// ============================================
// Task Detail Body (read-only)
// ============================================

function TaskDetailBody({ task }: { task: TaskWithRelations }) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const { data: fullTask, isLoading: loadingDetails } = useTaskDetails(task.id)
    const attachments = fullTask?.attachments ?? []
    const comments = fullTask?.comments ?? []
    const clientName = task.client?.name || task.project?.client?.name || task.company_name

    const fmtDate = (d?: string | null) => {
        if (!d) return null
        try { return format(new Date(d), isAr ? 'dd/MM/yyyy' : 'MMM d, yyyy') } catch { return d }
    }
    const fmtDateTime = (d?: string | null) => {
        if (!d) return null
        try { return format(new Date(d), isAr ? 'dd/MM/yyyy HH:mm' : 'MMM d, yyyy HH:mm') } catch { return d }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4 border-b shrink-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                    {task.department && <DepartmentBadge department={task.department} />}
                </div>
                <h2 className="font-semibold text-base leading-snug">{task.title}</h2>
                {task.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                )}
                {task.id && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span>{task.id.slice(0, 8)}</span>
                    </div>
                )}
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">

                {/* People */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {isAr ? 'المستخدمون' : 'People'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {clientName && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
                                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <div className="text-[11px] text-muted-foreground">{isAr ? 'العميل' : 'Client'}</div>
                                    <div className="text-sm font-medium truncate">{clientName}</div>
                                </div>
                            </div>
                        )}
                        {task.creator && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <div className="text-[11px] text-muted-foreground">{isAr ? 'مسؤول المهمة' : 'Created By'}</div>
                                    <div className="text-sm font-medium truncate">{task.creator.name}</div>
                                </div>
                            </div>
                        )}
                        {task.assigned_user && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <div className="text-[11px] text-muted-foreground">{isAr ? 'المسؤول' : 'Assigned To'}</div>
                                    <div className="text-sm font-medium truncate">{task.assigned_user.name}</div>
                                    {task.assigned_user.email && (
                                        <div className="text-[11px] text-muted-foreground truncate">{task.assigned_user.email}</div>
                                    )}
                                </div>
                            </div>
                        )}
                        {task.editor && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <div className="text-[11px] text-muted-foreground">{isAr ? 'المونتير' : 'Editor'}</div>
                                    <div className="text-sm font-medium truncate">
                                        {typeof task.editor === 'string' ? task.editor : (task.editor as { name?: string })?.name || ''}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Task Info */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" />
                        {isAr ? 'بيانات المهمة' : 'Task Info'}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {task.task_type && (
                            <div className="p-2.5 rounded-lg bg-muted/40">
                                <div className="text-[11px] text-muted-foreground">{isAr ? 'نوع المهمة' : 'Type'}</div>
                                <div className="text-sm font-medium">{task.task_type}</div>
                            </div>
                        )}
                        {task.workflow_stage && (
                            <div className="p-2.5 rounded-lg bg-muted/40">
                                <div className="text-[11px] text-muted-foreground">{isAr ? 'مرحلة العمل' : 'Workflow Stage'}</div>
                                <div className="text-sm font-medium">{task.workflow_stage}</div>
                            </div>
                        )}
                        {task.project?.name && (
                            <div className="p-2.5 rounded-lg bg-muted/40">
                                <div className="text-[11px] text-muted-foreground">{isAr ? 'المشروع' : 'Project'}</div>
                                <div className="text-sm font-medium">{task.project.name}</div>
                            </div>
                        )}
                        <div className="p-2.5 rounded-lg bg-muted/40">
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {isAr ? 'تعليقات' : 'Comments'}
                            </div>
                            <div className="text-sm font-medium">{comments.length}</div>
                        </div>
                    </div>
                </div>

                {/* Dates */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {isAr ? 'التواريخ' : 'Dates'}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div className="p-2.5 rounded-lg bg-muted/40">
                            <div className="text-[11px] text-muted-foreground">{isAr ? 'تاريخ الإنشاء' : 'Created'}</div>
                            <div className="text-sm font-medium">{fmtDate(task.created_at)}</div>
                        </div>
                        {task.deadline && (
                            <div className="p-2.5 rounded-lg bg-muted/40">
                                <div className="text-[11px] text-muted-foreground">{isAr ? 'الموعد النهائي' : 'Deadline'}</div>
                                <div className="text-sm font-medium">{fmtDate(task.deadline)}</div>
                            </div>
                        )}
                        {task.scheduled_date && (
                            <div className="p-2.5 rounded-lg bg-muted/40">
                                <div className="text-[11px] text-muted-foreground">{isAr ? 'موعد مجدول' : 'Scheduled'}</div>
                                <div className="text-sm font-medium">{fmtDateTime(task.scheduled_date)}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Location */}
                {task.location && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {isAr ? 'الموقع' : 'Location'}
                        </h3>
                        <div className="p-2.5 rounded-lg bg-muted/40 text-sm">{task.location}</div>
                    </div>
                )}

                {/* Attachments */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Paperclip className="h-3.5 w-3.5" />
                        {isAr ? 'الملفات' : 'Attachments'}
                        {!loadingDetails && <span className="text-xs normal-case font-normal">({attachments.length})</span>}
                    </h3>
                    {loadingDetails ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {isAr ? 'جاري تحميل الملفات...' : 'Loading attachments...'}
                        </div>
                    ) : attachments.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                            <FolderOpen className="h-4 w-4" />
                            {isAr ? 'لا توجد ملفات' : 'No attachments'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {attachments.map((attachment) => {
                                const FileIcon = getFileIcon(attachment.file_type)
                                return (
                                    <div
                                        key={attachment.id}
                                        className={cn(
                                            'flex items-center gap-3 p-3 rounded-lg border bg-card/50',
                                            attachment.is_final && 'border-green-500/50 bg-green-500/5'
                                        )}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <FileIcon className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm truncate">{attachment.file_name}</span>
                                                {attachment.is_final && (
                                                    <Badge variant="secondary" className="text-green-600 bg-green-500/10 shrink-0 text-[10px]">
                                                        <Star className="h-3 w-3 me-1" />
                                                        {isAr ? 'نهائي' : 'Final'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                <a href={attachment.file_url} target="_blank" rel="noopener noreferrer" aria-label="Open file">
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                <a href={attachment.file_url} download aria-label="Download file">
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Comments */}
                {!loadingDetails && comments.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {isAr ? 'التعليقات' : 'Comments'}
                            <span className="text-xs normal-case font-normal">({comments.length})</span>
                        </h3>
                        <div className="space-y-2">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40">
                                    {comment.user?.avatar_url ? (
                                        <Image
                                            src={comment.user.avatar_url}
                                            alt={comment.user.name ?? ''}
                                            width={28}
                                            height={28}
                                            className="rounded-full shrink-0 object-cover"
                                        />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold shrink-0">
                                            {(comment.user?.name ?? '?').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-xs font-medium">{comment.user?.name ?? '-'}</span>
                                            <span className="text-[11px] text-muted-foreground">{formatTaskDate(comment.created_at, 'dd/MM/yyyy HH:mm')}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Rejection Reason */}
                {(task as any).rejection_reason && (
                    <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive mb-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {isAr ? 'سبب الرفض' : 'Rejection Reason'}
                        </div>
                        <p className="text-sm text-destructive/80">{(task as any).rejection_reason}</p>
                    </div>
                )}

                {/* Client Feedback */}
                {task.client_feedback && (
                    <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 mb-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {isAr ? 'ملاحظات العميل' : 'Client Feedback'}
                        </div>
                        <p className="text-sm text-orange-700 dark:text-orange-300">{task.client_feedback}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============================================
// Task Detail Dialog (read-only)
// ============================================

const TaskDetailDialog = memo(function TaskDetailDialog({ task }: { task: TaskWithRelations }) {
    const [open, setOpen] = useState(false)
    const locale = useLocale()
    const isAr = locale === 'ar'

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary hover:bg-primary/5"
                title={isAr ? 'عرض التفاصيل' : 'View Details'}
                onClick={() => setOpen(true)}
            >
                <Eye className="w-4 h-4" />
            </Button>
            <DialogContent className="max-w-[94vw] sm:max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogTitle className="sr-only">{task.title}</DialogTitle>
                {open && <TaskDetailBody task={task} />}
            </DialogContent>
        </Dialog>
    )
})

// ============================================
// Main Component
// ============================================

interface DepartmentTasksViewProps {
    department: Department
}

export function DepartmentTasksView({ department }: DepartmentTasksViewProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'

    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState<TaskStatus | 'all'>('all')
    const [priority, setPriority] = useState<TaskPriority | 'all'>('all')

    const debouncedSearch = useDebounce(search, 350)

    const filters = useMemo<TaskFilters>(() => ({
        department,
        search: debouncedSearch || undefined,
        status: status !== 'all' ? status : undefined,
        priority: priority !== 'all' ? priority : undefined,
    }), [department, debouncedSearch, status, priority])

    const { data, isLoading, isError } = useAdminTasks(filters, page, PAGE_SIZE)
    const tasks: TaskWithRelations[] = data?.data ?? []
    const totalCount = data?.totalCount ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

    // Live updates
    useTasksRealtime()

    const handleSearchChange = (v: string) => {
        setSearch(v)
        setPage(1)
    }
    const handleStatusChange = (v: string) => {
        setStatus(v as TaskStatus | 'all')
        setPage(1)
    }
    const handlePriorityChange = (v: string) => {
        setPriority(v as TaskPriority | 'all')
        setPage(1)
    }

    const deptLabel = department === 'photography'
        ? (isAr ? 'قسم التصوير' : 'Photography Department')
        : (isAr ? 'قسم المحتوى' : 'Content Department')

    return (
        <div className="space-y-4">
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        className="ps-9"
                        placeholder={isAr ? 'بحث عن مهمة...' : 'Search tasks...'}
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                </div>
                <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full sm:w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {isAr ? opt.labelAr : opt.labelEn}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger className="w-full sm:w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PRIORITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {isAr ? opt.labelAr : opt.labelEn}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{isAr ? 'المهمة' : 'Task'}</TableHead>
                            <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                            <TableHead>{isAr ? 'الأولوية' : 'Priority'}</TableHead>
                            <TableHead className="hidden md:table-cell">{isAr ? 'النوع' : 'Type'}</TableHead>
                            <TableHead className="hidden lg:table-cell">{isAr ? 'المسؤول' : 'Assigned'}</TableHead>
                            <TableHead className="hidden lg:table-cell">{isAr ? 'الموعد النهائي' : 'Deadline'}</TableHead>
                            <TableHead className="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-40 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        {isAr ? 'جاري التحميل...' : 'Loading...'}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : isError ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-40 text-center text-destructive">
                                    {isAr ? 'حدث خطأ أثناء تحميل البيانات' : 'Error loading data'}
                                </TableCell>
                            </TableRow>
                        ) : tasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                                    {isAr ? 'لا توجد مهام في هذا القسم' : `No tasks found in ${deptLabel}`}
                                </TableCell>
                            </TableRow>
                        ) : (
                            tasks.map((task) => (
                                <TableRow key={task.id} className="group">
                                    <TableCell className="max-w-[200px]">
                                        <div className="font-medium text-sm truncate">{task.title}</div>
                                        {task.company_name && (
                                            <div className="text-xs text-muted-foreground truncate">{task.company_name}</div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={task.status} />
                                    </TableCell>
                                    <TableCell>
                                        <PriorityBadge priority={task.priority} />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {task.task_type && (
                                            <span className="text-xs text-muted-foreground">{task.task_type}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        {task.assigned_user ? (
                                            <div className="flex items-center gap-1.5">
                                                {task.assigned_user.avatar_url ? (
                                                    <Image
                                                        src={task.assigned_user.avatar_url}
                                                        alt={task.assigned_user.name ?? ''}
                                                        width={20}
                                                        height={20}
                                                        className="rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold">
                                                        {(task.assigned_user.name ?? '?').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-xs truncate max-w-[100px]">{task.assigned_user.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">{isAr ? 'غير معين' : 'Unassigned'}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                        {formatTaskDate(task.deadline)}
                                    </TableCell>
                                    <TableCell>
                                        <TaskDetailDialog task={task} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        {isAr
                            ? `عرض ${Math.min((page - 1) * PAGE_SIZE + 1, totalCount)} - ${Math.min(page * PAGE_SIZE, totalCount)} من ${totalCount} مهمة`
                            : `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, totalCount)} - ${Math.min(page * PAGE_SIZE, totalCount)} of ${totalCount} tasks`
                        }
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs">{page} / {totalPages}</span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
