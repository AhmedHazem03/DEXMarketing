'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { sanitizeSearch } from '@/lib/utils'
import type { TaskStatus, TaskPriority, Comment, Attachment, WorkflowStage, TaskType, Department } from '@/types/database'
import type {
    TaskWithRelations,
    TaskDetails,
    CommentWithUser,
    CreateTaskInput,
    UpdateTaskInput,
    TaskFilters,
    TasksByStatus,
    ClientRequestWithDetails,
} from '@/types/task'
import { KANBAN_COLUMNS } from '@/types/task'

// ============================================
// Query Keys - Centralized for consistency
// ============================================

export const taskKeys = {
    all: ['tasks'] as const,
    lists: () => [...taskKeys.all, 'list'] as const,
    list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
    kanban: () => [...taskKeys.all, 'kanban'] as const,
    details: () => [...taskKeys.all, 'detail'] as const,
    detail: (id: string) => [...taskKeys.details(), id] as const,
    comments: (taskId: string) => [...taskKeys.all, 'comments', taskId] as const,
    attachments: (taskId: string) => [...taskKeys.all, 'attachments', taskId] as const,
    myTasks: (userId: string) => [...taskKeys.all, 'my', userId] as const,
    todayTasks: (userId: string) => [...taskKeys.all, 'today', userId] as const,
    revisions: () => [...taskKeys.all, 'revisions'] as const,
    departmentTasks: (dept: string) => [...taskKeys.all, 'department', dept] as const,
    editorTasks: (userId: string) => [...taskKeys.all, 'editor', userId] as const,
    pendingRequests: (userId: string) => [...taskKeys.all, 'pending-requests', userId] as const,
}

// ============================================
// Tasks - List with Filters
// ============================================

/**
 * Fetch tasks with optional filters and includes user data
 */
export function useTasks(filters: TaskFilters = {}, limit?: number) {
    const supabase = createClient()

    return useQuery({
        queryKey: [...taskKeys.list(filters), limit],
        queryFn: async () => {
            let query = supabase
                .from('tasks')
                .select(`
                    *,
                    assigned_user:users!tasks_assigned_to_fkey(id, name, email, avatar_url),
                    creator:users!tasks_created_by_fkey(id, name, email, avatar_url),
                    project:projects(id, name, status),
                    client:clients(id, name)
                `)
                .order('created_at', { ascending: false })

            // Apply filters
            query = applyTaskFilters(query, filters)

            // Apply limit if specified
            if (limit) {
                query = query.limit(limit)
            }

            const { data, error } = await query
            if (error) throw error
            return data as unknown as TaskWithRelations[]
        },
        staleTime: 30 * 1000, // 30 seconds
    })
}

// ============================================
// Tasks - Kanban View (Grouped by Status)
// ============================================

/**
 * Fetch tasks grouped by status for Kanban board
 * Optimized to fetch all at once and group client-side
 */
export function useTasksKanban(projectId?: string, department?: Department) {
    const supabase = createClient()

    return useQuery({
        queryKey: [...taskKeys.kanban(), projectId, department],
        queryFn: async () => {
            let query = supabase
                .from('tasks')
                .select(`
                    id, title, status, priority, department, task_type, deadline,
                    created_at, updated_at, workflow_stage, company_name, project_id,
                    assigned_to, created_by, client_id, editor_id,
                    assigned_user:users!tasks_assigned_to_fkey(id, name, email, avatar_url),
                    creator:users!tasks_created_by_fkey(id, name, email, avatar_url),
                    project:projects(id, name, status),
                    client:clients(id, name)
                `)
                .order('updated_at', { ascending: false })
                .limit(500)

            if (projectId) {
                query = query.eq('project_id', projectId)
            }

            if (department) {
                query = query.eq('department', department)
            }

            const { data, error } = await query
            if (error) throw error

            // Initialize empty columns
            const columns: TasksByStatus = {
                new: [],
                in_progress: [],
                review: [],
                client_review: [],
                client_revision: [],
                revision: [],
                approved: [],
                rejected: [],
                completed: [],
            }

                // Group tasks by status
                ; (data as unknown as TaskWithRelations[])?.forEach((task) => {
                    if (columns[task.status]) {
                        columns[task.status].push(task)
                    } else {
                        // Fallback: put tasks with unexpected status into 'new'
                        console.warn(`[useTasksKanban] Unknown task status "${task.status}" for task ${task.id}, falling back to "new"`)
                        columns.new.push(task)
                    }
                })

            return columns
        },
        staleTime: 10 * 1000, // 10 seconds for real-time feel
    })
}

// ============================================
// Tasks - My Tasks (For Creator role)
// ============================================

/**
 * Fetch tasks assigned to a specific user
 */
export function useMyTasks(userId: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: taskKeys.myTasks(userId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    project:projects(id, name, status, client:clients(id, name)),
                    creator:users!tasks_created_by_fkey(id, name, avatar_url)
                `)
                .eq('assigned_to', userId)
                .order('deadline', { ascending: true, nullsFirst: false })

            if (error) throw error
            return data as unknown as TaskWithRelations[]
        },
        enabled: !!userId,
        staleTime: 30 * 1000,
    })
}

// ============================================
// Tasks - Today's Tasks (For team members)
// ============================================

/**
 * Fetch tasks assigned to a user for today:
 * - Tasks explicitly scheduled for today (scheduled_date = today), OR
 * - Tasks created today (covers TL creating a task without setting scheduled_date)
 */
export function useTodayMyTasks(userId: string) {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const todayStart = `${today}T00:00:00.000Z`

    return useQuery({
        queryKey: taskKeys.todayTasks(userId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    project:projects(id, name, status, client:clients(id, name)),
                    creator:users!tasks_created_by_fkey(id, name, avatar_url)
                `)
                .eq('assigned_to', userId)
                .or(`scheduled_date.eq.${today},created_at.gte.${todayStart}`)
                .order('created_at', { ascending: true })

            if (error) throw error
            // Filter out completed tasks
            const tasks = (data as unknown as TaskWithRelations[]) ?? []
            return tasks.filter(t => t.status !== 'completed')
        },
        enabled: !!userId,
        staleTime: 30 * 1000,
    })
}

// ============================================
// Tasks - Revisions Hub (For Team Leader)
// ============================================

/**
 * Fetch tasks in revision/rejected status
 */
export function useRevisionsTasks() {
    const supabase = createClient()

    return useQuery({
        queryKey: taskKeys.revisions(),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    assigned_user:users!tasks_assigned_to_fkey(id, name, email, avatar_url),
                    creator:users!tasks_created_by_fkey(id, name, avatar_url),
                    project:projects(id, name, status)
                `)
                .in('status', ['revision', 'rejected', 'client_revision'])
                .order('updated_at', { ascending: false })

            if (error) throw error
            return data as unknown as TaskWithRelations[]
        },
        staleTime: 30 * 1000,
    })
}

// ============================================
// Tasks - Client Review (For Clients)
// ============================================

/**
 * Fetch tasks awaiting client review for a specific client
 */
export function useTasksForClientReview(clientId: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: [...taskKeys.all, 'client-review', clientId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    assigned_user:users!tasks_assigned_to_fkey(id, name, email, avatar_url),
                    creator:users!tasks_created_by_fkey(id, name, email, avatar_url),
                    project:projects(id, name, status),
                    attachments(id, file_url, file_name, file_type, created_at)
                `)
                .eq('client_id', clientId)
                .eq('status', 'client_review')
                .order('updated_at', { ascending: false })

            if (error) throw error
            return data as unknown as TaskWithRelations[]
        },
        enabled: !!clientId,
        staleTime: 20 * 1000, // 20 seconds for near real-time updates
    })
}

// ============================================
// Task - Single with Full Details
// ============================================

/**
 * Fetch a single task with all related data
 */
export function useTaskDetails(taskId: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: taskKeys.detail(taskId),
        staleTime: 30 * 1000,
        queryFn: async () => {
            // Fetch task, comments, and attachments in parallel (independent queries)
            const [taskResult, commentsResult, attachmentsResult] = await Promise.all([
                supabase
                    .from('tasks')
                    .select(`
                        *,
                        assigned_user:users!tasks_assigned_to_fkey(id, name, email, avatar_url),
                        creator:users!tasks_created_by_fkey(id, name, email, avatar_url),
                        project:projects(id, name, status),
                        client:clients(id, name)
                    `)
                    .eq('id', taskId)
                    .single(),
                supabase
                    .from('comments')
                    .select(`
                        *,
                        user:users(id, name, avatar_url)
                    `)
                    .eq('task_id', taskId)
                    .order('created_at', { ascending: true }),
                supabase
                    .from('attachments')
                    .select('id, file_url, file_name, file_type, file_size, uploaded_by, is_final, created_at, task_id')
                    .eq('task_id', taskId)
                    .order('created_at', { ascending: false }),
            ])

            // PGRST116 = no rows found (task deleted) — return null gracefully
            if (taskResult.error) {
                if (taskResult.error.code === 'PGRST116') return null
                throw taskResult.error
            }

            const task = taskResult.data as Record<string, unknown>
            return {
                ...task,
                comments: (commentsResult.data ?? []) as unknown as CommentWithUser[],
                attachments: (attachmentsResult.data ?? []) as unknown as Attachment[],
            } as TaskDetails
        },
        enabled: !!taskId,
    })
}

// ============================================
// Task - CRUD Mutations
// ============================================

/**
 * Create a new task (supports both content and photography departments)
 */
export function useCreateTask() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateTaskInput) => {
            const insertData = {
                title: input.title,
                description: input.description ?? null,
                status: input.status ?? 'new',
                priority: input.priority ?? 'medium',
                department: input.department ?? null,
                task_type: input.task_type ?? 'general',
                workflow_stage: input.workflow_stage ?? 'none',
                project_id: input.project_id ?? null,
                client_id: input.client_id ?? null,
                assigned_to: input.assigned_to ?? null,
                editor_id: input.editor_id ?? null,
                created_by: input.created_by,
                deadline: input.deadline ?? null,
                company_name: input.company_name ?? null,
                location: input.location ?? null,
                scheduled_date: input.scheduled_date ?? null,
                scheduled_time: input.scheduled_time ?? null,
                client_feedback: null,
            }
            const { data, error } = await supabase
                .from('tasks')
                .insert(insertData as never)
                .select()
                .single()

            if (error) throw error
            return data as unknown as TaskWithRelations
        },
        onSuccess: () => {
            // Invalidate all task queries
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

/**
 * Update an existing task
 */
export function useUpdateTask() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: UpdateTaskInput) => {
            const { id, ...updates } = input
            const updateData = {
                ...updates,
                updated_at: new Date().toISOString(),
            }
            const { data, error } = await supabase
                .from('tasks')
                .update(updateData as never)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data as unknown as TaskWithRelations
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) })
        },
    })
}

/**
 * Update task status only (optimized for Kanban drag & drop)
 * Uses optimistic updates for instant UI feedback
 */
export function useUpdateTaskStatus() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, status, clientId }: { id: string; status: TaskStatus; clientId?: string | null }) => {
            // Auto-route to client_review if approving a task with client_id
            let finalStatus = status
            if (status === 'approved') {
                // Use provided clientId to avoid an extra query; fall back to DB lookup if not provided
                let hasClient = !!clientId
                if (!hasClient && clientId === undefined) {
                    const { data: task } = await supabase
                        .from('tasks')
                        .select('client_id')
                        .eq('id', id)
                        .single() as { data: { client_id: string | null } | null; error: unknown }
                    hasClient = !!task?.client_id
                }

                if (hasClient) {
                    finalStatus = 'client_review'
                }
            }

            const { error } = await supabase
                .from('tasks')
                .update({ status: finalStatus, updated_at: new Date().toISOString() } as never)
                .eq('id', id)

            if (error) throw error
            return { id, status: finalStatus }
        },
        onSuccess: () => {
            // Invalidate to sync with server (no optimistic update to avoid
            // stale status when server reroutes e.g. approved -> client_review)
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

/**
 * Assign task to a user
 */
export function useAssignTask() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ taskId, userId }: { taskId: string; userId: string | null }) => {
            const { error } = await supabase
                .from('tasks')
                .update({ assigned_to: userId, updated_at: new Date().toISOString() } as never)
                .eq('id', taskId)

            if (error) throw error
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) })
        },
    })
}

/**
 * Return task for revision with reason
 */
export function useReturnTask() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ taskId, reason, workflowStage }: { taskId: string; reason: string; workflowStage?: WorkflowStage }) => {
            // Reset workflow_stage from *_done back to the active stage so the assignee sees the task again
            const doneToActiveMap: Partial<Record<WorkflowStage, WorkflowStage>> = {
                shooting_done: 'shooting',
                filming_done: 'filming',
                editing_done: 'editing',
            }
            const resetStage = workflowStage ? (doneToActiveMap[workflowStage] ?? workflowStage) : undefined

            const { error } = await supabase
                .from('tasks')
                .update({
                    status: 'revision',
                    client_feedback: reason,
                    ...(resetStage ? { workflow_stage: resetStage } : {}),
                    updated_at: new Date().toISOString(),
                } as never)
                .eq('id', taskId)

            if (error) throw error
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) })
        },
    })
}

/**
 * Forward an approved task to a designer.
 * Creates an independent clone with a new ID, assigned to the chosen designer.
 * Attachments are copied by reference (same file URLs — no storage duplication).
 */
export function useForwardTask() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            task,
            designerId,
            notes,
            accountManagerId,
        }: {
            task: TaskWithRelations
            designerId: string
            notes?: string
            accountManagerId: string
        }) => {
            // ── Step 1: Clone the task ──
            const clonedTask = {
                title: task.title,
                description: notes
                    ? `🔀 Notes: ${notes}\n───────────────────\n${task.description ?? ''}`
                    : task.description ?? null,
                project_id: task.project_id ?? null,
                client_id: task.client_id ?? null,
                priority: task.priority,
                deadline: task.deadline ?? null,
                department: task.department ?? null,
                task_type: task.task_type ?? 'general',
                company_name: task.company_name ?? null,
                location: task.location ?? null,
                assigned_to: designerId,
                status: 'new' as TaskStatus,
                created_by: accountManagerId,
                workflow_stage: 'none' as const,
                client_feedback: null,
            }

            const { data: newTask, error: taskError } = await supabase
                .from('tasks')
                .insert(clonedTask as never)
                .select()
                .single()

            if (taskError) throw taskError

            const newTaskId = (newTask as Record<string, unknown>).id as string

            // ── Step 2: Clone attachments (by reference — same URLs) ──
            const { data: attachments } = await supabase
                .from('attachments')
                .select('file_url, file_name, file_type, file_size, uploaded_by')
                .eq('task_id', task.id)

            if (attachments && attachments.length > 0) {
                const clonedAttachments = attachments.map((att) => ({
                    task_id: newTaskId,
                    file_url: att.file_url,
                    file_name: att.file_name,
                    file_type: att.file_type,
                    file_size: att.file_size,
                    uploaded_by: att.uploaded_by,
                }))

                const { error: attachError } = await supabase
                    .from('attachments')
                    .insert(clonedAttachments as never[])

                if (attachError) {
                    console.warn('[useForwardTask] Failed to clone attachments:', attachError)
                }
            }

            // ── Step 3: Clone comments (conversation history for the designer) ──
            const { data: comments } = await supabase
                .from('comments')
                .select('user_id, content')
                .eq('task_id', task.id)
                .order('created_at', { ascending: true })

            if (comments && comments.length > 0) {
                const clonedComments = comments.map((c) => ({
                    task_id: newTaskId,
                    user_id: c.user_id,
                    content: c.content,
                }))

                const { error: commentsError } = await supabase
                    .from('comments')
                    .insert(clonedComments as never[])

                if (commentsError) {
                    console.warn('[useForwardTask] Failed to clone comments:', commentsError)
                }
            }

            return newTask as unknown as TaskWithRelations
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

/**
 * Delete a task
 */
export function useDeleteTask() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (taskId: string) => {
            // Delete attachments and comments in parallel (independent)
            const [attachResult, commentResult] = await Promise.all([
                supabase.from('attachments').delete().eq('task_id', taskId),
                supabase.from('comments').delete().eq('task_id', taskId),
            ])
            if (attachResult.error) console.warn('Failed to delete attachments:', attachResult.error)
            if (commentResult.error) console.warn('Failed to delete comments:', commentResult.error)

            // Delete task last (depends on above)
            const { error } = await supabase.from('tasks').delete().eq('id', taskId)

            if (error) throw error

            return taskId
        },
        onSuccess: (taskId) => {
            // Remove the detail query immediately so it doesn't refetch a deleted task (→ 406)
            queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) })
            // Invalidate list & kanban queries to reflect removal
            queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
            queryClient.invalidateQueries({ queryKey: taskKeys.kanban() })
        },
    })
}

// ============================================
// Comments - CRUD
// ============================================

/**
 * Fetch comments for a task
 */
export function useTaskComments(taskId: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: taskKeys.comments(taskId),
        staleTime: 30 * 1000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('comments')
                .select(`
                    *,
                    user:users(id, name, avatar_url)
                `)
                .eq('task_id', taskId)
                .order('created_at', { ascending: true })

            if (error) throw error
            return data as unknown as CommentWithUser[]
        },
        enabled: !!taskId,
    })
}

/**
 * Add a comment to a task
 */
export function useAddComment() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ task_id, user_id, content }: {
            task_id: string
            user_id: string
            content: string
        }) => {
            const { data, error } = await supabase
                .from('comments')
                .insert({ task_id, user_id, content } as never)
                .select(`
                    *,
                    user:users(id, name, avatar_url)
                `)
                .single()

            if (error) throw error
            return data as unknown as CommentWithUser
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.comments(variables.task_id) })
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.task_id) })
        },
    })
}

/**
 * Delete a comment
 */
export function useDeleteComment() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ commentId, taskId }: { commentId: string; taskId: string }) => {
            const { error } = await supabase.from('comments').delete().eq('id', commentId)
            if (error) throw error
            return taskId
        },
        onSuccess: (taskId) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.comments(taskId) })
        },
    })
}

// ============================================
// Attachments - CRUD
// ============================================

/**
 * Fetch attachments for a task
 */
export function useTaskAttachments(taskId: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: taskKeys.attachments(taskId),
        staleTime: 30 * 1000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('attachments')
                .select('*')
                .eq('task_id', taskId)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as unknown as Attachment[]
        },
        enabled: !!taskId,
    })
}

/**
 * Add an attachment to a task
 */
export function useAddAttachment() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: {
            task_id: string
            file_url: string
            file_name: string
            file_type?: string
            file_size?: number
            uploaded_by: string
            is_final?: boolean
        }) => {
            const insertData = {
                task_id: input.task_id,
                file_url: input.file_url,
                file_name: input.file_name,
                file_type: input.file_type ?? null,
                file_size: input.file_size ?? null,
                uploaded_by: input.uploaded_by,
                is_final: input.is_final ?? false,
            }
            const { data, error } = await supabase
                .from('attachments')
                .insert(insertData as never)
                .select()
                .single()

            if (error) throw error
            return data as unknown as Attachment
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.attachments(variables.task_id) })
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.task_id) })
        },
    })
}

/**
 * Delete an attachment
 */
export function useDeleteAttachment() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ attachmentId, taskId }: { attachmentId: string; taskId: string }) => {
            const { error } = await supabase.from('attachments').delete().eq('id', attachmentId)
            if (error) throw error
            return taskId
        },
        onSuccess: (taskId) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.attachments(taskId) })
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
        },
    })
}

/**
 * Mark attachment as final deliverable
 */
export function useMarkAttachmentFinal() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ attachmentId, taskId, isFinal }: {
            attachmentId: string
            taskId: string
            isFinal: boolean
        }) => {
            const { error } = await supabase
                .from('attachments')
                .update({ is_final: isFinal } as never)
                .eq('id', attachmentId)

            if (error) throw error
            return taskId
        },
        onSuccess: (taskId) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.attachments(taskId) })
        },
    })
}

// ============================================
// Admin Tasks - Full View
// ============================================

/**
 * Apply common admin task filters to a Supabase query builder
 */
function applyTaskFilters(query: any, filters: TaskFilters) {
    if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
    }
    if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority)
    }
    if (filters.assigned_to && filters.assigned_to !== 'all') {
        query = query.eq('assigned_to', filters.assigned_to)
    }
    if (filters.project_id && filters.project_id !== 'all') {
        query = query.eq('project_id', filters.project_id)
    }
    if (filters.search) {
        const safe = sanitizeSearch(filters.search)
        if (safe) {
            query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`)
        }
    }
    if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
    }
    if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
    }
    if (filters.department && filters.department !== 'all') {
        query = query.eq('department', filters.department)
    }
    if (filters.task_type && filters.task_type !== 'all') {
        query = query.eq('task_type', filters.task_type)
    }
    return query
}

/**
 * Server-side paginated admin tasks with exact count.
 * Only fetches the needed page, reducing payload and improving speed.
 */
export function useAdminTasks(filters: TaskFilters = {}, page = 1, pageSize = 15) {
    const supabase = createClient()

    return useQuery({
        queryKey: [...taskKeys.all, 'admin-full', filters, page, pageSize],
        queryFn: async () => {
            let query = supabase
                .from('tasks')
                .select(`
                    id, title, description, status, priority, department, task_type,
                    created_at, deadline, client_feedback, company_name,
                    assigned_user:users!tasks_assigned_to_fkey(id, name, email, avatar_url),
                    creator:users!tasks_created_by_fkey(id, name, email, avatar_url),
                    project:projects(
                        id, name, status,
                        client:clients(id, name)
                    ),
                    client:clients!tasks_client_id_fkey(id, name)
                `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1)

            query = applyTaskFilters(query, filters)

            const { data, error, count } = await query
            if (error) throw error
            return { data: data ?? [], totalCount: count ?? 0 }
        },
        placeholderData: keepPreviousData,
        staleTime: 60 * 1000,
    })
}

/**
 * Lightweight stats query - uses efficient count queries instead of fetching all rows.
 * Separate from main query so stats don't flicker on page changes.
 * Performs parallel count queries for optimal performance.
 */
export function useAdminTasksStats(filters: TaskFilters = {}) {
    const supabase = createClient()

    return useQuery({
        queryKey: [...taskKeys.all, 'admin-stats', filters],
        queryFn: async () => {
            // Create base query helper
            // When a per-column statusFilter is provided, exclude the global status
            // filter from applyTaskFilters to avoid conflicting .eq('status', ...) calls
            const createCountQuery = (statusFilter?: string) => {
                const filtersForQuery = statusFilter
                    ? { ...filters, status: undefined }
                    : filters
                let query = supabase
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                
                query = applyTaskFilters(query, filtersForQuery)
                
                if (statusFilter) {
                    query = query.eq('status', statusFilter as TaskStatus)
                }
                
                return query
            }

            // Execute all count queries in parallel for optimal performance
            const [totalResult, inProgressResult, reviewResult, approvedResult] = await Promise.all([
                createCountQuery(),
                createCountQuery('in_progress'),
                createCountQuery('review'),
                createCountQuery('approved'),
            ])

            // Check for errors
            if (totalResult.error) throw totalResult.error
            if (inProgressResult.error) throw inProgressResult.error
            if (reviewResult.error) throw reviewResult.error
            if (approvedResult.error) throw approvedResult.error

            return {
                total: totalResult.count ?? 0,
                in_progress: inProgressResult.count ?? 0,
                review: reviewResult.count ?? 0,
                approved: approvedResult.count ?? 0,
            }
        },
        placeholderData: keepPreviousData,
        staleTime: 120 * 1000, // 2 minutes - stats don't need to be as fresh
    })
}

/**
 * Fetch all admin tasks (unpaginated) for CSV export.
 * Only called on demand via enabled flag.
 */
export function useAdminTasksExport(filters: TaskFilters = {}, enabled = false) {
    const supabase = createClient()

    return useQuery({
        queryKey: [...taskKeys.all, 'admin-export', filters],
        queryFn: async () => {
            let query = supabase
                .from('tasks')
                .select(`
                    id, title, description, status, priority, department, task_type,
                    created_at, client_feedback, company_name,
                    assigned_user:users!tasks_assigned_to_fkey(id, name),
                    creator:users!tasks_created_by_fkey(id, name),
                    project:projects(
                        id, name,
                        client:clients(id, name)
                    ),
                    client:clients!tasks_client_id_fkey(id, name)
                `)
                .order('created_at', { ascending: false })

            query = applyTaskFilters(query, filters)

            const { data, error } = await query
            if (error) throw error
            return data ?? []
        },
        enabled,
        staleTime: 0,
    })
}

// ============================================
// Photography Department - Specific Hooks
// ============================================

/**
 * Fetch tasks for a photography department by workflow stage
 */
export function usePhotographyTasks(teamLeaderId?: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: taskKeys.departmentTasks('photography'),
        queryFn: async () => {
            let query = supabase
                .from('tasks')
                .select(`
                    *,
                    assigned_user:users!tasks_assigned_to_fkey(id, name, email, avatar_url),
                    creator:users!tasks_created_by_fkey(id, name, email, avatar_url),
                    project:projects(id, name, status)
                `)
                .eq('department', 'photography')
                .order('scheduled_date', { ascending: true, nullsFirst: false })

            if (teamLeaderId) {
                query = query.eq('created_by', teamLeaderId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as unknown as TaskWithRelations[]
        },
        staleTime: 15 * 1000,
    })
}

/**
 * Fetch tasks assigned to editor (for Editor/Monteur role)
 */
export function useEditorTasks(editorId: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: taskKeys.editorTasks(editorId),
        enabled: !!editorId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    assigned_user:users!tasks_assigned_to_fkey(id, name, email, avatar_url),
                    creator:users!tasks_created_by_fkey(id, name, email, avatar_url),
                    project:projects(id, name, status)
                `)
                .eq('editor_id', editorId)
                .in('workflow_stage', ['editing', 'editing_done'])
                .order('updated_at', { ascending: false })

            if (error) throw error
            return data as unknown as TaskWithRelations[]
        },
        staleTime: 15 * 1000,
    })
}

/**
 * Advance photography workflow stage
 * Handles the full pipeline: filming → filming_done → editing → editing_done → final_review → delivered
 */
export function useAdvanceWorkflowStage() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            taskId,
            newStage,
            editorId,
        }: {
            taskId: string
            newStage: WorkflowStage
            editorId?: string
        }) => {
            const updateData: Record<string, unknown> = {
                workflow_stage: newStage,
                updated_at: new Date().toISOString(),
            }

            // When moving to editing stage, assign the editor
            if (newStage === 'editing' && editorId) {
                updateData.editor_id = editorId
            }

            // When delivered, mark task as approved
            if (newStage === 'delivered') {
                updateData.status = 'review'
            }

            // When stage is *_done, update status to review for TL
            if (['filming_done', 'editing_done', 'shooting_done'].includes(newStage)) {
                updateData.status = 'review'
            }

            // When stage moves to active work (filming, editing, shooting)
            if (['filming', 'editing', 'shooting'].includes(newStage)) {
                updateData.status = 'in_progress'
            }

            const { data, error } = await supabase
                .from('tasks')
                .update(updateData as never)
                .eq('id', taskId)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

/**
 * Create a photography task with schedule integration
 */
export function useCreatePhotographyTask() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateTaskInput & { schedule_id?: string }) => {
            const taskType = input.task_type ?? 'video'
            const initialStage: WorkflowStage = taskType === 'video' ? 'filming'
                : taskType === 'photo' ? 'shooting'
                    : 'none'

            const insertData = {
                title: input.title,
                description: input.description ?? null,
                status: 'in_progress' as TaskStatus,
                priority: input.priority ?? 'medium',
                department: 'photography' as Department,
                task_type: taskType,
                workflow_stage: initialStage,
                project_id: input.project_id ?? null,
                assigned_to: input.assigned_to ?? null,
                editor_id: input.editor_id ?? null,
                created_by: input.created_by,
                deadline: input.deadline ?? null,
                company_name: input.company_name ?? null,
                location: input.location ?? null,
                scheduled_date: input.scheduled_date ?? null,
                scheduled_time: input.scheduled_time ?? null,
                client_feedback: null,
            }

            const { data: task, error } = await supabase
                .from('tasks')
                .insert(insertData as never)
                .select()
                .single()

            if (error) throw error

            // Link schedule if provided
            if (input.schedule_id && task) {
                await supabase
                    .from('schedules')
                    .update({ task_id: (task as any).id } as never)
                    .eq('id', input.schedule_id)
            }

            return task as unknown as TaskWithRelations
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

/**
 * Mark a photography task as complete (by worker)
 * Videographer marks filming_done, Photographer marks shooting_done, Editor marks editing_done
 */
export function useMarkTaskComplete() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ taskId, currentStage }: { taskId: string; currentStage: WorkflowStage }) => {
            let nextStage: WorkflowStage

            switch (currentStage) {
                case 'filming': nextStage = 'filming_done'; break
                case 'editing': nextStage = 'editing_done'; break
                case 'shooting': nextStage = 'shooting_done'; break
                default: throw new Error(`Cannot mark complete from stage: ${currentStage}`)
            }

            const { data, error } = await supabase
                .from('tasks')
                .update({
                    workflow_stage: nextStage,
                    status: 'review',
                    updated_at: new Date().toISOString(),
                } as never)
                .eq('id', taskId)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

/**
 * Deliver task to client (by TL)
 */
export function useDeliverToClient() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (taskId: string) => {
            const { data, error } = await supabase
                .from('tasks')
                .update({
                    workflow_stage: 'delivered',
                    status: 'review',
                    updated_at: new Date().toISOString(),
                } as never)
                .eq('id', taskId)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

// ============================================
// Team Leader - Client Request Review
// ============================================

/**
 * Fetch pending client requests for a team leader's department
 */
export function usePendingRequests(teamLeaderId: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: taskKeys.pendingRequests(teamLeaderId),
        queryFn: async () => {
            // Get TL's department
            const { data: tlUser } = await supabase
                .from('users')
                .select('department')
                .eq('id', teamLeaderId)
                .single() as { data: { department: string | null } | null; error: unknown }

            if (!tlUser?.department) return []

            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    creator:users!tasks_created_by_fkey(id, name, email, avatar_url),
                    project:projects(id, name, status),
                    attachments(id, file_url, file_name, file_type, file_size)
                `)
                .not('request_type', 'is', null)
                .eq('department', tlUser.department as Department)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as unknown as ClientRequestWithDetails[]
        },
        enabled: !!teamLeaderId,
        staleTime: 30_000,
    })
}

/**
 * Approve a client request (by team leader)
 */
export function useApproveClientRequest() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (requestId: string) => {
            const { error } = await supabase
                .from('tasks')
                .update({
                    request_status: 'approved',
                    updated_at: new Date().toISOString(),
                } as never)
                .eq('id', requestId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

/**
 * Reject a client request with optional reason
 */
export function useRejectClientRequest() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
            const { error } = await supabase
                .from('tasks')
                .update({
                    request_status: 'rejected',
                    rejection_reason: reason ?? null,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq('id', requestId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

// ============================================
// Client Tasks - Paginated View
// ============================================

/**
 * Fetch tasks for a specific client with pagination and filters.
 * Optimized for performance with server-side pagination.
 */
export function useClientTasks(clientId: string, filters: TaskFilters = {}, page = 1, pageSize = 15) {
    const supabase = createClient()

    return useQuery({
        queryKey: [...taskKeys.all, 'client-tasks', clientId, filters, page, pageSize],
        queryFn: async () => {
            let query = supabase
                .from('tasks')
                .select(`
                    id, title, description, status, priority, department, task_type,
                    created_at, updated_at, deadline, client_feedback, workflow_stage,
                    assigned_user:users!tasks_assigned_to_fkey(id, name, email, avatar_url),
                    creator:users!tasks_created_by_fkey(id, name, email, avatar_url),
                    editor:users!tasks_editor_id_fkey(id, name, email, avatar_url),
                    project:projects(id, name, status)
                `, { count: 'exact' })
                .eq('client_id', clientId)
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1)

            query = applyTaskFilters(query, filters)

            const { data, error, count } = await query
            if (error) throw error
            return { data: data as unknown as TaskWithRelations[], totalCount: count ?? 0 }
        },
        enabled: !!clientId,
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000, // 30 seconds
    })
}

/**
 * Get client tasks statistics (lightweight query)
 */
export function useClientTasksStats(clientId: string, filters: TaskFilters = {}) {
    const supabase = createClient()

    return useQuery({
        queryKey: [...taskKeys.all, 'client-tasks-stats', clientId, filters],
        queryFn: async () => {
            // Use head-only count queries in parallel (no row data transferred)
            const createCountQuery = (statusFilter?: string) => {
                const filtersForQuery = statusFilter
                    ? { ...filters, status: undefined }
                    : filters
                let query = supabase
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .eq('client_id', clientId)
                query = applyTaskFilters(query, filtersForQuery)
                if (statusFilter) {
                    query = query.eq('status', statusFilter as TaskStatus)
                }
                return query
            }

            const [total, newCount, inProgress, review, clientReview, approved, overdue] = await Promise.all([
                createCountQuery(),
                createCountQuery('new'),
                createCountQuery('in_progress'),
                createCountQuery('review'),
                createCountQuery('client_review'),
                createCountQuery('approved'),
                // Overdue: deadline < now AND status != approved
                supabase
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .eq('client_id', clientId)
                    .lt('deadline', new Date().toISOString())
                    .neq('status', 'approved'),
            ])

            if (total.error) throw total.error

            return {
                total: total.count ?? 0,
                new: newCount.count ?? 0,
                in_progress: inProgress.count ?? 0,
                review: review.count ?? 0,
                client_review: clientReview.count ?? 0,
                approved: approved.count ?? 0,
                overdue: overdue.count ?? 0,
            }
        },
        enabled: !!clientId,
        staleTime: 60 * 1000, // 1 minute
    })
}
