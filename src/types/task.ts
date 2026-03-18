// ============================================
// Task Management Types - Extended & Enriched
// ============================================

import type { Task, TaskStatus, TaskPriority, User, Project, Comment, Attachment, Department, TaskType, WorkflowStage, RequestType, RequestStatus } from './database'

// ============================================
// Extended Task Types with Relations
// ============================================

/**
 * Task with all related data populated for display
 */
export interface TaskWithRelations extends Task {
    assigned_user?: Pick<User, 'id' | 'name' | 'email' | 'avatar_url'> | null
    creator?: Pick<User, 'id' | 'name' | 'email' | 'avatar_url'> | null
    editor?: Pick<User, 'id' | 'name' | 'email' | 'avatar_url'> | null
    project?: (Pick<Project, 'id' | 'name' | 'status'> & {
        client?: Pick<import('./database').Client, 'id' | 'name'> | null
    }) | null
    client?: Pick<import('./database').Client, 'id' | 'name'> | null
    comments_count?: number
    attachments_count?: number
}

/**
 * Full task details with all nested data
 */
export interface TaskDetails extends TaskWithRelations {
    comments?: CommentWithUser[]
    attachments?: Attachment[]
}

/**
 * Comment with user data
 */
export interface CommentWithUser extends Comment {
    user?: Pick<User, 'id' | 'name' | 'avatar_url'> | null
}

// ============================================
// Kanban Board Types
// ============================================

/**
 * Kanban column definition
 */
export interface KanbanColumn {
    id: TaskStatus
    title: string
    titleAr: string
    color: string
    bgColor: string
    icon: string
}

/**
 * Kanban columns configuration
 */
export const KANBAN_COLUMNS: KanbanColumn[] = [
    {
        id: 'new',
        title: 'New',
        titleAr: 'جديد',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10 border-blue-500/30',
        icon: 'Plus'
    },
    {
        id: 'in_progress',
        title: 'In Progress',
        titleAr: 'قيد التنفيذ',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10 border-yellow-500/30',
        icon: 'Clock'
    },
    {
        id: 'review',
        title: 'Review',
        titleAr: 'مراجعة',
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10 border-purple-500/30',
        icon: 'Eye'
    },
    {
        id: 'client_review',
        title: 'Client Review',
        titleAr: 'مراجعة العميل',
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-500/10 border-indigo-500/30',
        icon: 'UserCheck'
    },
    {
        id: 'client_revision',
        title: 'Client Revision',
        titleAr: 'طلب تعديل من العميل',
        color: 'text-rose-500',
        bgColor: 'bg-rose-500/10 border-rose-500/30',
        icon: 'UserX'
    },
    {
        id: 'revision',
        title: 'Revision',
        titleAr: 'تعديل',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10 border-orange-500/30',
        icon: 'RotateCcw'
    },
    {
        id: 'approved',
        title: 'Approved',
        titleAr: 'معتمد',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10 border-green-500/30',
        icon: 'Check'
    },
    {
        id: 'rejected',
        title: 'Rejected',
        titleAr: 'مرفوض',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10 border-red-500/30',
        icon: 'X'
    },
]

/**
 * Get column config by status
 */
export function getColumnConfig(status: TaskStatus): KanbanColumn {
    return KANBAN_COLUMNS.find(col => col.id === status) ?? KANBAN_COLUMNS[0]
}

// ============================================
// Priority Configuration
// ============================================

export interface PriorityConfig {
    id: TaskPriority
    label: string
    labelAr: string
    color: string
    bgColor: string
}

export const PRIORITY_CONFIG: PriorityConfig[] = [
    { id: 'low', label: 'Low', labelAr: 'منخفض', color: 'text-slate-500', bgColor: 'bg-slate-500/10' },
    { id: 'medium', label: 'Medium', labelAr: 'متوسط', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { id: 'high', label: 'High', labelAr: 'عالي', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { id: 'urgent', label: 'Urgent', labelAr: 'عاجل', color: 'text-red-500', bgColor: 'bg-red-500/10' },
]

export function getPriorityConfig(priority: TaskPriority): PriorityConfig {
    return PRIORITY_CONFIG.find(p => p.id === priority) ?? PRIORITY_CONFIG[1]
}

// ============================================
// Form Types
// ============================================

export interface CreateTaskInput {
    title: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
    department?: Department
    task_type?: TaskType
    workflow_stage?: WorkflowStage
    project_id?: string
    client_id?: string
    assigned_to?: string
    editor_id?: string
    created_by: string
    deadline?: string
    company_name?: string
    location?: string
    scheduled_date?: string
    scheduled_time?: string
}

export interface UpdateTaskInput {
    id: string
    title?: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
    department?: Department
    task_type?: TaskType
    workflow_stage?: WorkflowStage
    project_id?: string
    client_id?: string
    assigned_to?: string
    editor_id?: string
    deadline?: string
    client_feedback?: string
    company_name?: string
    location?: string
    scheduled_date?: string
    scheduled_time?: string
}

export interface CreateCommentInput {
    task_id: string
    user_id: string
    content: string
}

export interface CreateAttachmentInput {
    task_id: string
    file_url: string
    file_name: string
    file_type?: string
    file_size?: number
    uploaded_by: string
    is_final?: boolean
}

// ============================================
// Client Request Types
// ============================================

/**
 * Input for creating client request - uses Pick to avoid field duplication
 */
export interface CreateClientRequestInput extends Pick<CreateTaskInput, 'title' | 'description' | 'deadline'> {
    department: Department
    task_type: TaskType
    request_type: RequestType
    project_id?: string
    original_task_id?: string
    created_by: string
}

/**
 * Filters for client request queries
 */
export interface ClientRequestFilters {
    request_type?: RequestType | 'all'
    request_status?: RequestStatus | 'all'
    department?: Department | 'all'
}

/**
 * Task with request status + client info for TL review
 */
export interface ClientRequestWithDetails extends TaskWithRelations {
    request_type: RequestType
    request_status: RequestStatus
    rejection_reason: string | null
    original_task_id: string | null
    original_task?: Pick<Task, 'id' | 'title' | 'status'> | null
    attachments?: Attachment[]
    client_info?: Pick<User, 'id' | 'name' | 'email' | 'avatar_url'> | null
}

/**
 * Request status configuration for UI
 */
export interface RequestStatusConfig {
    id: RequestStatus
    label: string
    labelAr: string
    color: string
    bgColor: string
    icon: string
}

export const REQUEST_STATUS_CONFIG: RequestStatusConfig[] = [
    { id: 'pending_approval', label: 'Pending', labelAr: 'قيد الانتظار', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10 border-yellow-500/30', icon: 'Clock' },
    { id: 'approved', label: 'Approved', labelAr: 'تمت الموافقة', color: 'text-green-500', bgColor: 'bg-green-500/10 border-green-500/30', icon: 'CheckCircle' },
    { id: 'rejected', label: 'Rejected', labelAr: 'مرفوض', color: 'text-red-500', bgColor: 'bg-red-500/10 border-red-500/30', icon: 'XCircle' },
]

export function getRequestStatusConfig(status: RequestStatus): RequestStatusConfig {
    return REQUEST_STATUS_CONFIG.find(s => s.id === status) ?? REQUEST_STATUS_CONFIG[0]
}

/** Task types available per department for client request form */
export const DEPARTMENT_TASK_TYPES: Record<Department, { id: TaskType; label: string; labelAr: string }[]> = {
    photography: [
        { id: 'video', label: 'Video', labelAr: 'فيديو' },
        { id: 'photo', label: 'Photography', labelAr: 'تصوير' },
        { id: 'editing', label: 'Editing', labelAr: 'مونتاج' },
    ],
    content: [
        { id: 'content', label: 'Content', labelAr: 'محتوى' },
        { id: 'general', label: 'General', labelAr: 'عام' },
    ],
}

// ============================================
// Filter & Search Types
// ============================================

export interface TaskFilters {
    status?: TaskStatus | 'all'
    priority?: TaskPriority | 'all'
    assigned_to?: string | 'all'
    project_id?: string | 'all'
    department?: Department | 'all'
    task_type?: TaskType | 'all'
    search?: string
    dateFrom?: string
    dateTo?: string
}

export interface TaskSortOptions {
    field: 'created_at' | 'updated_at' | 'deadline' | 'priority' | 'title'
    direction: 'asc' | 'desc'
}

// ============================================
// Workflow Transitions (Business Logic)
// ============================================

/**
 * Valid status transitions based on role
 */
export const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
    new: ['in_progress'],
    in_progress: ['review'],
    review: ['approved', 'revision', 'in_progress', 'client_review'], // Leader can approve, send to client, return for revision, or request changes
    client_review: ['approved', 'client_revision'], // Client can approve or request modifications
    client_revision: ['in_progress', 'revision'], // Team leader can start work or send for internal revision
    revision: ['in_progress'],
    approved: ['completed'], // Can be completed
    completed: [], // Final state
    rejected: ['in_progress'], // Can be reassigned
}

/**
 * Check if status transition is valid
 */
export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
    return STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

// ============================================
// Utility Types
// ============================================

export type TasksByStatus = Record<TaskStatus, TaskWithRelations[]>

export interface KanbanDragResult {
    taskId: string
    sourceStatus: TaskStatus
    destinationStatus: TaskStatus
    sourceIndex: number
    destinationIndex: number
}

// ============================================
// Photography Workflow Configuration
// ============================================

export interface WorkflowStageConfig {
    id: WorkflowStage
    label: string
    labelAr: string
    color: string
    bgColor: string
    icon: string
    assignedRole: string
}

/**
 * Video production workflow stages
 */
export const VIDEO_WORKFLOW_STAGES: WorkflowStageConfig[] = [
    { id: 'filming', label: 'Filming', labelAr: 'تصوير', color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: 'Video', assignedRole: 'videographer' },
    { id: 'filming_done', label: 'Filming Done', labelAr: 'التصوير جاهز', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', icon: 'CheckCircle', assignedRole: 'team_leader' },
    { id: 'editing', label: 'Editing', labelAr: 'مونتاج', color: 'text-purple-500', bgColor: 'bg-purple-500/10', icon: 'Film', assignedRole: 'editor' },
    { id: 'editing_done', label: 'Editing Done', labelAr: 'المونتاج جاهز', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', icon: 'CheckCircle', assignedRole: 'team_leader' },
    { id: 'final_review', label: 'Final Review', labelAr: 'مراجعة نهائية', color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: 'Eye', assignedRole: 'team_leader' },
    { id: 'delivered', label: 'Delivered', labelAr: 'تم التسليم', color: 'text-green-500', bgColor: 'bg-green-500/10', icon: 'Send', assignedRole: 'client' },
]

/**
 * Photo production workflow stages
 */
export const PHOTO_WORKFLOW_STAGES: WorkflowStageConfig[] = [
    { id: 'shooting', label: 'Shooting', labelAr: 'تصوير', color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: 'Camera', assignedRole: 'photographer' },
    { id: 'shooting_done', label: 'Shooting Done', labelAr: 'التصوير جاهز', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', icon: 'CheckCircle', assignedRole: 'team_leader' },
    { id: 'final_review', label: 'Final Review', labelAr: 'مراجعة نهائية', color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: 'Eye', assignedRole: 'team_leader' },
    { id: 'delivered', label: 'Delivered', labelAr: 'تم التسليم', color: 'text-green-500', bgColor: 'bg-green-500/10', icon: 'Send', assignedRole: 'client' },
]

/**
 * Valid workflow stage transitions per task type
 */
export const WORKFLOW_TRANSITIONS: Record<string, Record<WorkflowStage, WorkflowStage[]>> = {
    video: {
        filming: ['filming_done'],
        filming_done: ['editing'],
        editing: ['editing_done'],
        editing_done: ['final_review'],
        final_review: ['delivered', 'editing'],  // Can send back to editing
        shooting: [],
        shooting_done: [],
        delivered: [],
        none: [],
    },
    photo: {
        shooting: ['shooting_done'],
        shooting_done: ['final_review'],
        final_review: ['delivered', 'shooting'],  // Can send back to shooting
        filming: [],
        filming_done: [],
        editing: [],
        editing_done: [],
        delivered: [],
        none: [],
    },
}

/**
 * Get workflow stages by task type
 */
export function getWorkflowStages(taskType: TaskType): WorkflowStageConfig[] {
    switch (taskType) {
        case 'video': return VIDEO_WORKFLOW_STAGES
        case 'photo': return PHOTO_WORKFLOW_STAGES
        default: return []
    }
}

/**
 * Check if a workflow transition is valid
 */
export function isValidWorkflowTransition(taskType: TaskType, from: WorkflowStage, to: WorkflowStage): boolean {
    const transitions = WORKFLOW_TRANSITIONS[taskType]
    if (!transitions) return false
    return transitions[from]?.includes(to) ?? false
}

/**
 * Get the workflow stage config
 */
export function getWorkflowStageConfig(stage: WorkflowStage, taskType: TaskType): WorkflowStageConfig | undefined {
    const stages = getWorkflowStages(taskType)
    return stages.find(s => s.id === stage)
}

// ============================================
// Department Helpers
// ============================================

/** Roles that belong to the photography department */
export const PHOTOGRAPHY_ROLES = ['videographer', 'editor', 'photographer'] as const

/** Roles that belong to the content department */
export const CONTENT_ROLES = ['creator', 'designer'] as const

/** Shared roles (not department-specific) */
export const SHARED_ROLES = ['admin', 'accountant', 'client', 'moderator'] as const

/** Check if a role needs a department */
export function roleDepartment(role: string): Department | null {
    if (PHOTOGRAPHY_ROLES.includes(role as any)) return 'photography'
    if (CONTENT_ROLES.includes(role as any)) return 'content'
    if (role === 'team_leader') return null  // TL needs explicit department
    return null
}

// Re-export Department for convenience
export type { Department, TaskType, WorkflowStage, RequestType, RequestStatus } from './database'
