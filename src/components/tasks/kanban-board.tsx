'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocale } from 'next-intl'
import {
    Plus, Clock, Eye, RotateCcw, Check, X,
    MoreHorizontal, Calendar, User, GripVertical,
    ChevronDown, Filter, Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

import { useTasksKanban, useUpdateTaskStatus, useDeleteTask, taskKeys } from '@/hooks/use-tasks'
import { useTasksRealtime } from '@/hooks/use-realtime'
import {
    KANBAN_COLUMNS,
    PRIORITY_CONFIG,
    getPriorityConfig,
    type TaskWithRelations,
    type TasksByStatus,
} from '@/types/task'
import type { TaskStatus, TaskPriority, Department } from '@/types/database'

// ============================================
// Types
// ============================================

interface KanbanBoardProps {
    projectId?: string
    department?: Department
    readOnly?: boolean
    onTaskClick?: (task: TaskWithRelations) => void
    onCreateTask?: (status?: TaskStatus) => void
}

// ============================================
// Icon Map
// ============================================

const StatusIcons: Record<string, typeof Plus> = {
    Plus, Clock, Eye, RotateCcw, Check, X
}

function getStatusIcon(iconName: string) {
    return StatusIcons[iconName] || Plus
}

// ============================================
// Task Card Component
// ============================================

interface TaskCardProps {
    task: TaskWithRelations
    onClick?: () => void
    isDragging?: boolean
    onDelete?: (taskId: string) => Promise<void>
}

const TaskCard = memo(function TaskCard({ task, onClick, isDragging, onDelete }: TaskCardProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const priorityConfig = getPriorityConfig(task.priority)

    const deadline = task.deadline ? new Date(task.deadline) : null
    const isOverdue = deadline && deadline < new Date() && task.status !== 'approved'
    const isToday = deadline && deadline.toDateString() === new Date().toDateString()

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={cn(
                'group relative p-4 rounded-xl bg-card border transition-all duration-200 cursor-pointer',
                'hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30',
                isDragging && 'shadow-2xl shadow-primary/20 border-primary rotate-2 scale-105',
                isOverdue && 'border-red-500/50 bg-red-500/5'
            )}
        >
            {/* Drag Handle - visible on hover */}
            <div className="absolute top-2 start-2 opacity-0 group-hover:opacity-50 transition-opacity">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* Priority Badge */}
            <div className="flex items-start justify-between mb-3">
                <Badge
                    variant="secondary"
                    className={cn('text-xs font-medium', priorityConfig.bgColor, priorityConfig.color)}
                >
                    {isAr ? priorityConfig.labelAr : priorityConfig.label}
                </Badge>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={isAr ? 'خيارات المهمة' : 'Task options'}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick?.() }}>
                            {isAr ? 'تعديل' : 'Edit'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick?.() }}>
                            {isAr ? 'إعادة تعيين' : 'Reassign'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowDeleteDialog(true)
                            }}
                        >
                            {isAr ? 'حذف' : 'Delete'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {isAr ? 'حذف المهمة؟' : 'Delete Task?'}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {isAr
                                    ? 'سيتم حذف المهمة وجميع التعليقات والمرفقات بشكل نهائي.'
                                    : 'This will permanently delete the task and all its comments and attachments.'
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{isAr ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={isDeleting}
                                onClick={async (e) => {
                                    e.stopPropagation()
                                    setIsDeleting(true)
                                    try {
                                        await onDelete?.(task.id)
                                        toast.success(isAr ? 'تم حذف المهمة' : 'Task deleted')
                                    } catch {
                                        toast.error(isAr ? 'فشل حذف المهمة' : 'Failed to delete task')
                                    } finally {
                                        setIsDeleting(false)
                                        setShowDeleteDialog(false)
                                    }
                                }}
                            >
                                {isAr ? 'حذف' : 'Delete'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {/* Title */}
            <h4 className="font-semibold text-sm mb-2 line-clamp-2 leading-tight">
                {task.title}
            </h4>

            {/* Description */}
            {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {task.description}
                </p>
            )}

            {/* Client Feedback - shown when status is revision and feedback exists */}
            {task.status === 'revision' && task.client_feedback && (
                <div className="mb-3 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">
                        {isAr ? 'تعديلات العميل:' : 'Client Modifications:'}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        {task.client_feedback}
                    </p>
                </div>
            )}

            {/* Footer: Deadline & Assignee */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                {/* Deadline */}
                {deadline && (
                    <div className={cn(
                        'flex items-center gap-1 text-xs',
                        isOverdue ? 'text-red-500' : isToday ? 'text-orange-500' : 'text-muted-foreground'
                    )}>
                        <Calendar className="w-3 h-3" />
                        <span>
                            {deadline.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                                month: 'short',
                                day: 'numeric'
                            })}
                        </span>
                    </div>
                )}

                {/* Assignee */}
                {task.assigned_user && (
                    <div className="flex items-center gap-1.5 ms-auto">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={task.assigned_user.avatar_url ?? undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {(task.assigned_user.name ?? 'U').charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground max-w-[80px] truncate hidden sm:inline">
                            {task.assigned_user.name}
                        </span>
                    </div>
                )}
            </div>

            {/* Project & Client Badges */}
            {(task.project || task.client) && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/30">
                    {task.project && (
                        <Badge variant="outline" className="text-[10px] truncate max-w-full">
                            {task.project.name}
                        </Badge>
                    )}
                    {task.client && (
                        <Badge variant="outline" className="text-[10px] truncate max-w-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                            {task.client.name}
                        </Badge>
                    )}
                </div>
            )}
        </motion.div>
    )
})

// ============================================
// Kanban Column Component
// ============================================

interface KanbanColumnProps {
    column: typeof KANBAN_COLUMNS[0]
    tasks: TaskWithRelations[]
    readOnly?: boolean
    onTaskClick?: (task: TaskWithRelations) => void
    onCreateTask?: () => void
    onDropTask?: (taskId: string, newStatus: TaskStatus) => void
    onDeleteTask?: (taskId: string) => Promise<void>
}

function KanbanColumn({ column, tasks, readOnly, onTaskClick, onCreateTask, onDropTask, onDeleteTask }: KanbanColumnProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const [isDragOver, setIsDragOver] = useState(false)
    const Icon = getStatusIcon(column.icon)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }

    const handleDragLeave = () => {
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        const taskId = e.dataTransfer.getData('taskId')
        if (taskId && onDropTask) {
            onDropTask(taskId, column.id)
        }
    }

    return (
        <div className="flex flex-col min-w-[300px] max-w-[350px] w-full">
            {/* Column Header */}
            <div className={cn(
                'flex items-center justify-between p-3 rounded-t-xl border-2 border-b-0',
                column.bgColor
            )}>
                <div className="flex items-center gap-2">
                    <Icon className={cn('w-4 h-4', column.color)} />
                    <h3 className="font-semibold text-sm">
                        {isAr ? column.titleAr : column.title}
                    </h3>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {tasks.length}
                    </Badge>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-7 w-7", readOnly && "hidden")}
                    onClick={onCreateTask}
                    aria-label={isAr ? 'إضافة مهمة' : 'Add task'}
                >
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            {/* Tasks Container */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    'flex-1 min-h-[400px] max-h-[calc(100vh-280px)] overflow-y-auto',
                    'p-2 space-y-3 rounded-b-xl border-2 border-t-0 border-border/50',
                    'bg-muted/30 transition-colors duration-200',
                    isDragOver && 'bg-primary/10 border-primary/30'
                )}
            >
                <AnimatePresence mode="popLayout">
                    {tasks.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-32 text-muted-foreground"
                        >
                            <Icon className="w-8 h-8 mb-2 opacity-30" />
                            <p className="text-sm">
                                {isAr ? 'لا توجد مهام' : 'No tasks'}
                            </p>
                        </motion.div>
                    ) : (
                        tasks.map((task) => (
                            <div
                                key={task.id}
                                draggable={!readOnly}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('taskId', task.id)
                                    e.dataTransfer.effectAllowed = 'move'
                                }}
                            >
                                <TaskCard
                                    task={task}
                                    onClick={() => onTaskClick?.(task)}
                                    onDelete={onDeleteTask}
                                />
                            </div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

// ============================================
// Main Kanban Board Component
// ============================================

export function KanbanBoard({ projectId, department, readOnly, onTaskClick, onCreateTask }: KanbanBoardProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'

    const [searchQuery, setSearchQuery] = useState('')
    const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')

    // Data fetching
    const { data: tasksByStatus, isLoading, error } = useTasksKanban(projectId, department)
    const updateStatus = useUpdateTaskStatus()
    const deleteTask = useDeleteTask()

    // Stable delete callback (shared by all TaskCard instances)
    const handleDeleteTask = useCallback(async (taskId: string) => {
        await deleteTask.mutateAsync(taskId)
    }, [deleteTask])

    // Real-time subscription
    useTasksRealtime()

    // Filter tasks
    const filteredTasks = useMemo(() => {
        if (!tasksByStatus) return null

        const filtered: TasksByStatus = {
            new: [],
            in_progress: [],
            review: [],
            revision: [],
            client_review: [],
            client_revision: [],
            approved: [],
            rejected: [],
            completed: [],
        }

        for (const status of Object.keys(tasksByStatus) as TaskStatus[]) {
            filtered[status] = tasksByStatus[status].filter(task => {
                // Search filter
                if (searchQuery) {
                    const query = searchQuery.toLowerCase()
                    if (!task.title.toLowerCase().includes(query) &&
                        !task.description?.toLowerCase().includes(query)) {
                        return false
                    }
                }
                // Priority filter
                if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
                    return false
                }
                return true
            })
        }

        return filtered
    }, [tasksByStatus, searchQuery, priorityFilter])

    // Handle drop
    const handleDropTask = useCallback((taskId: string, newStatus: TaskStatus) => {
        updateStatus.mutate({ id: taskId, status: newStatus })
    }, [updateStatus])

    // Loading state
    if (isLoading) {
        return (
            <div className="flex gap-4 overflow-x-auto pb-4">
                {KANBAN_COLUMNS.slice(0, 4).map((col) => (
                    <div key={col.id} className="min-w-[300px] space-y-3">
                        <Skeleton className="h-12 rounded-xl" />
                        <Skeleton className="h-32 rounded-xl" />
                        <Skeleton className="h-24 rounded-xl" />
                    </div>
                ))}
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-center justify-center h-64 text-red-500">
                <p>{isAr ? 'حدث خطأ في تحميل المهام' : 'Error loading tasks'}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={isAr ? 'بحث في المهام...' : 'Search tasks...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ps-10"
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                    <Select
                        value={priorityFilter}
                        onValueChange={(v) => setPriorityFilter(v as TaskPriority | 'all')}
                    >
                        <SelectTrigger className="w-[140px]">
                            <Filter className="h-4 w-4 me-2" />
                            <SelectValue placeholder={isAr ? 'الأولوية' : 'Priority'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                            {PRIORITY_CONFIG.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    {isAr ? p.labelAr : p.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                </div>
            </div>

            {/* Kanban Columns */}
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
                {KANBAN_COLUMNS.map((column) => (
                    <KanbanColumn
                        key={column.id}
                        column={column}
                        tasks={filteredTasks?.[column.id] ?? []}
                        readOnly={readOnly}
                        onTaskClick={onTaskClick}
                        onCreateTask={() => onCreateTask?.(column.id)}
                        onDropTask={readOnly ? undefined : handleDropTask}
                        onDeleteTask={readOnly ? undefined : handleDeleteTask}
                    />
                ))}
            </div>
        </div>
    )
}

export default KanbanBoard
