'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocale } from 'next-intl'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { Calendar as CalendarIcon, Loader2, Save, X } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'

import { useCreateTask, useUpdateTask } from '@/hooks/use-tasks'
import { useUsers, useCurrentUser, useTeamMembers } from '@/hooks/use-users'
import { useClients } from '@/hooks/use-clients'
import { PRIORITY_CONFIG, KANBAN_COLUMNS, PHOTOGRAPHY_ROLES, CONTENT_ROLES } from '@/types/task'
import type { TaskStatus, TaskPriority } from '@/types/database'
import type { TaskWithRelations, CreateTaskInput, UpdateTaskInput } from '@/types/task'

// ============================================
// Validation Schema
// ============================================

function createTaskFormSchema(isAr: boolean) {
    return z.object({
        title: z.string().min(3, { message: isAr ? 'العنوان يجب أن يكون 3 أحرف على الأقل' : 'Title must be at least 3 characters' }).max(200),
        description: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']),
        status: z.enum(['new', 'in_progress', 'review', 'client_review', 'client_revision', 'revision', 'approved', 'rejected', 'completed']),
        assigned_to: z.string().optional(),
        client_id: z.string().optional(),
        project_id: z.string().optional(),
        deadline: z.date().optional().refine(
            (date) => !date || date >= new Date(new Date().setHours(0, 0, 0, 0)),
            { message: isAr ? 'لا يمكن اختيار تاريخ في الماضي' : 'Deadline cannot be in the past' }
        ),
        scheduled_date: z.date().optional(),
    })
}

type TaskFormValues = z.infer<ReturnType<typeof createTaskFormSchema>>

// ============================================
// Props
// ============================================

interface TaskFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    task?: TaskWithRelations | null
    defaultStatus?: TaskStatus
    currentUserId: string
    onSuccess?: () => void
}

// ============================================
// Component
// ============================================

export function TaskForm({
    open,
    onOpenChange,
    task,
    defaultStatus = 'new',
    currentUserId,
    onSuccess,
}: TaskFormProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const isEditing = !!task

    // Hooks
    const createTask = useCreateTask()
    const updateTask = useUpdateTask()
    const { data: clients, isLoading: clientsLoading } = useClients()
    const { data: currentUser } = useCurrentUser()

    // Get users based on role
    // Team leaders use useTeamMembers to get their department team
    // Admins use useUsers to get all users
    const { data: allUsers, isLoading: allUsersLoading } = useUsers()
    const { data: teamMembers, isLoading: teamMembersLoading } = useTeamMembers(
        (currentUser?.role === 'team_leader' || currentUser?.role === 'account_manager') ? currentUserId : ''
    )

    // Determine which users to show based on current user's role
    const usersLoading = (currentUser?.role === 'team_leader' || currentUser?.role === 'account_manager') ? teamMembersLoading : allUsersLoading
    const assignableUsers = (() => {
        if (!currentUser) return []

        // Admin can assign to anyone
        if (currentUser.role === 'admin') {
            return allUsers?.filter(u => u.is_active) ?? []
        }

        // Team leaders and account managers get their department's team members only (excluding themselves)
        if (currentUser.role === 'team_leader' || currentUser.role === 'account_manager') {
            return (teamMembers ?? []).filter(m => m.id !== currentUser.id)
        }

        // Other roles can only assign to users in their department
        if (currentUser.department && allUsers) {
            return allUsers.filter(u =>
                u.is_active &&
                u.department === currentUser.department
            )
        }

        return []
    })()

    // Form setup
    const taskFormSchema = createTaskFormSchema(isAr)
    const form = useForm<TaskFormValues>({
        resolver: zodResolver(taskFormSchema),
        defaultValues: {
            title: '',
            description: '',
            priority: 'medium',
            status: defaultStatus,
            assigned_to: undefined,
            client_id: undefined,
            project_id: undefined,
            deadline: undefined,
            scheduled_date: undefined,
        },
    })

    // Reset form when task changes
    useEffect(() => {
        if (task) {
            form.reset({
                title: task.title,
                description: task.description ?? '',
                priority: task.priority,
                status: task.status,
                assigned_to: task.assigned_to ?? undefined,
                client_id: task.client_id ?? undefined,
                project_id: task.project_id ?? undefined,
                deadline: task.deadline ? new Date(task.deadline) : undefined,
                scheduled_date: task.scheduled_date ? new Date(task.scheduled_date + 'T12:00:00') : undefined,
            })
        } else {
            form.reset({
                title: '',
                description: '',
                priority: 'medium',
                status: defaultStatus,
                assigned_to: undefined,
                client_id: undefined,
                project_id: undefined,
                deadline: undefined,
                scheduled_date: undefined,
            })
        }
    }, [task, defaultStatus, form])

    // Watch assigned_to to conditionally show shoot date for photography roles
    const watchedAssignedTo = form.watch('assigned_to')
    const isPhotographyAssignment = !!watchedAssignedTo && assignableUsers.some(u =>
        u.id === watchedAssignedTo && ['photographer', 'videographer', 'editor'].includes(u.role ?? '')
    )

    // Resolve department + workflow_stage + editor_id from assigned user's role
    const resolveAssignedUserMeta = (assignedToId?: string) => {
        const assignedUser = assignedToId
            ? assignableUsers.find(u => u.id === assignedToId)
            : null

        // Determine workflow_stage based on photography roles
        const roleStageMap: Record<string, string> = {
            photographer: 'shooting',
            videographer: 'filming',
            editor: 'editing',
        }
        const workflow_stage = assignedUser?.role
            ? (roleStageMap[assignedUser.role] ?? undefined)
            : undefined

        // Determine department: prefer assigned user's department, then role-derived, then creator's
        const photographyRoles = ['videographer', 'editor', 'photographer']
        // account_manager may have null department in DB → default to 'content'
        const creatorDept =
            currentUser?.department ??
            (currentUser?.role === 'account_manager' ? 'content' : undefined) ??
            undefined
        const department =
            assignedUser?.department ??
            (assignedUser?.role && photographyRoles.includes(assignedUser.role) ? 'photography' : undefined) ??
            creatorDept

        // If assigned user is an editor, also set editor_id so they see it in their dashboard
        const editor_id = assignedUser?.role === 'editor' ? assignedToId : undefined

        return { department, workflow_stage, editor_id }
    }

    // Submit handler
    const onSubmit = async (values: TaskFormValues) => {
        try {
            if (isEditing && task) {
                const assigneeChanged = values.assigned_to !== task.assigned_to
                const { department, workflow_stage, editor_id } = resolveAssignedUserMeta(values.assigned_to)
                const updateInput: UpdateTaskInput = {
                    id: task.id,
                    title: values.title,
                    description: values.description,
                    priority: values.priority,
                    status: values.status,
                    assigned_to: values.assigned_to || undefined,
                    client_id: values.client_id || undefined,
                    project_id: values.project_id || undefined,
                    deadline: values.deadline?.toISOString(),
                    scheduled_date: values.scheduled_date?.toISOString().split('T')[0],
                    // Only update department/workflow_stage if assignee changed or not yet set
                    ...(assigneeChanged || !task.department ? { department: department as never } : {}),
                    ...(assigneeChanged || !task.workflow_stage || task.workflow_stage === 'none'
                        ? { workflow_stage: workflow_stage as never }
                        : {}),
                    // Update editor_id when assignee changes
                    ...(assigneeChanged ? { editor_id: editor_id ?? undefined } : {}),
                }
                await updateTask.mutateAsync(updateInput)
            } else {
                const { department, workflow_stage, editor_id } = resolveAssignedUserMeta(values.assigned_to)
                const createInput: CreateTaskInput = {
                    title: values.title,
                    description: values.description,
                    priority: values.priority,
                    status: values.status,
                    assigned_to: values.assigned_to || undefined,
                    client_id: values.client_id || undefined,
                    project_id: values.project_id || undefined,
                    deadline: values.deadline?.toISOString(),
                    scheduled_date: values.scheduled_date?.toISOString().split('T')[0],
                    created_by: currentUserId,
                    department: department as never,
                    workflow_stage: workflow_stage as never,
                    editor_id: editor_id ?? undefined,
                }
                await createTask.mutateAsync(createInput)
            }
            onSuccess?.()
            onOpenChange(false)
            form.reset()
        } catch (error) {
            console.error('Failed to save task:', error)
            const errMsg = (error as { message?: string })?.message ?? ''
            if (errMsg.includes('row-level security') || errMsg.includes('violates') || errMsg.includes('policy')) {
                toast.error(isAr ? 'ليس لديك صلاحية لإنشاء المهام — تواصل مع المدير' : 'No permission to create tasks — contact admin')
            } else {
                toast.error(isAr ? `فشل حفظ المهمة: ${errMsg || 'خطأ غير معروف'}` : `Failed to save task: ${errMsg || 'Unknown error'}`)
            }
        }
    }

    const isSubmitting = createTask.isPending || updateTask.isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing
                            ? (isAr ? 'تعديل المهمة' : 'Edit Task')
                            : (isAr ? 'إنشاء مهمة جديدة' : 'Create New Task')
                        }
                    </DialogTitle>
                    <DialogDescription>
                        {isAr
                            ? 'أدخل تفاصيل المهمة وقم بتعيينها لأحد أعضاء الفريق'
                            : 'Enter task details and assign it to a team member'
                        }
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Title */}
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{isAr ? 'عنوان المهمة' : 'Task Title'} *</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={isAr ? 'أدخل عنوان المهمة...' : 'Enter task title...'}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Description */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{isAr ? 'الوصف' : 'Description'}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={isAr ? 'وصف تفصيلي للمهمة...' : 'Detailed task description...'}
                                            rows={4}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Priority & Status Row */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Priority */}
                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{isAr ? 'الأولوية' : 'Priority'}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {PRIORITY_CONFIG.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        <span className={cn('flex items-center gap-2', p.color)}>
                                                            <span className={cn('w-2 h-2 rounded-full', p.bgColor.replace('/10', ''))} />
                                                            {isAr ? p.labelAr : p.label}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Status */}
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{isAr ? 'الحالة' : 'Status'}</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            disabled={!isEditing} // Only change status when editing
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {KANBAN_COLUMNS.map((col) => (
                                                    <SelectItem key={col.id} value={col.id}>
                                                        <span className={cn('flex items-center gap-2', col.color)}>
                                                            {isAr ? col.titleAr : col.title}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Assigned To */}
                        <FormField
                            control={form.control}
                            name="assigned_to"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{isAr ? 'تعيين إلى' : 'Assign To'}</FormLabel>
                                    <Select
                                        onValueChange={(val) => field.onChange(val === 'unassigned' ? undefined : val)}
                                        value={field.value || 'unassigned'}
                                        disabled={usersLoading}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={isAr ? 'اختر عضو الفريق...' : 'Select team member...'} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="unassigned">
                                                {isAr ? 'بدون تعيين' : 'Unassigned'}
                                            </SelectItem>
                                            {assignableUsers.map((user) => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                                                            {(user.name ?? 'U').charAt(0)}
                                                        </span>
                                                        {user.name ?? user.email}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Client */}
                        <FormField
                            control={form.control}
                            name="client_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{isAr ? 'العميل' : 'Client'}</FormLabel>
                                    <Select
                                        onValueChange={(val) => field.onChange(val === 'none' ? undefined : val)}
                                        value={field.value || 'none'}
                                        disabled={clientsLoading}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={isAr ? 'اختر العميل...' : 'Select client...'} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                {isAr ? 'بدون عميل' : 'No Client'}
                                            </SelectItem>
                                            {clients?.map((client) => (
                                                <SelectItem key={client.id} value={client.id}>
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs text-indigo-500">
                                                            {client.name?.charAt(0)}
                                                        </span>
                                                        {client.name}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Deadline */}
                        <FormField
                            control={form.control}
                            name="deadline"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{isAr ? 'الموعد النهائي' : 'Deadline'}</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        'w-full justify-start text-start font-normal',
                                                        !field.value && 'text-muted-foreground'
                                                    )}
                                                >
                                                    <CalendarIcon className="me-2 h-4 w-4" />
                                                    {field.value ? (
                                                        format(field.value, 'PPP', {
                                                            locale: isAr ? ar : enUS
                                                        })
                                                    ) : (
                                                        <span>{isAr ? 'اختر التاريخ' : 'Pick a date'}</span>
                                                    )}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Scheduled Date - shown for photography/videography assignments */}
                        {isPhotographyAssignment && (
                            <FormField
                                control={form.control}
                                name="scheduled_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>{isAr ? 'تاريخ التنفيذ (التصوير)' : 'Shoot Date'}</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            'w-full justify-start text-start font-normal',
                                                            !field.value && 'text-muted-foreground'
                                                        )}
                                                    >
                                                        <CalendarIcon className="me-2 h-4 w-4" />
                                                        {field.value ? (
                                                            format(field.value, 'PPP', { locale: isAr ? ar : enUS })
                                                        ) : (
                                                            <span>{isAr ? 'اختر تاريخ التصوير' : 'Pick shoot date'}</span>
                                                        )}
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Actions */}
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                <X className="me-2 h-4 w-4" />
                                {isAr ? 'إلغاء' : 'Cancel'}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="me-2 h-4 w-4" />
                                )}
                                {isEditing
                                    ? (isAr ? 'حفظ التعديلات' : 'Save Changes')
                                    : (isAr ? 'إنشاء المهمة' : 'Create Task')
                                }
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default TaskForm
