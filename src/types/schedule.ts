// ============================================
// Schedule & Calendar Types
// ============================================

import type { Schedule, ScheduleStatus, User, Client, Project, Task, ApprovalStatus, MissingItemsStatus, ScheduleType } from './database'

// Re-export for convenience
export type { ScheduleStatus, ApprovalStatus, MissingItemsStatus, ScheduleType } from './database'

/**
 * Schedule with related data populated
 */
export interface ScheduleWithRelations extends Schedule {
    team_leader?: Pick<User, 'id' | 'name' | 'avatar_url'> | null
    client?: Pick<Client, 'id' | 'name'> | null
    project?: Pick<Project, 'id' | 'name'> | null
    task?: Pick<Task, 'id' | 'title'> | null
    creator?: Pick<User, 'id' | 'name' | 'avatar_url'> | null
    // Populated client-side from assigned_members UUIDs
    assigned_member_details?: Pick<User, 'id' | 'name' | 'avatar_url' | 'role'>[]
}

/**
 * Input for creating a schedule entry
 */
export interface CreateScheduleInput {
    title: string
    description?: string
    scheduled_date: string
    start_time?: string | null
    end_time?: string
    location?: string
    client_id?: string
    project_id?: string
    department?: string
    assigned_members?: string[]
    notes?: string
    schedule_type?: ScheduleType
    missing_items?: string
    missing_items_status?: MissingItemsStatus
    links?: { url: string; comment: string }[]
    images?: string[]
}

/**
 * Input for updating a schedule entry
 */
export interface UpdateScheduleInput {
    id: string
    title?: string
    description?: string
    scheduled_date?: string
    start_time?: string | null
    end_time?: string | null
    location?: string
    status?: ScheduleStatus
    client_id?: string
    project_id?: string
    notes?: string
    schedule_type?: ScheduleType
    missing_items?: string
    missing_items_status?: MissingItemsStatus
    approval_status?: ApprovalStatus
    manager_notes?: string
    links?: { url: string; comment: string }[]
    images?: string[]
}

/**
 * Day view for calendar - grouped schedules by date
 */
export interface CalendarDay {
    date: string
    schedules: ScheduleWithRelations[]
    isToday: boolean
    isCurrentMonth: boolean
}

/**
 * Calendar view mode
 */
export type CalendarViewMode = 'month' | 'week' | 'day'

/**
 * Schedule filter options
 */
export interface ScheduleFilters {
    status?: ScheduleStatus | 'all'
    dateFrom?: string
    dateTo?: string
    client_id?: string
    search?: string
}

/**
 * Schedule status config for display
 */
export interface ScheduleStatusConfig {
    id: ScheduleStatus
    label: string
    labelAr: string
    color: string
    bgColor: string
}

export const SCHEDULE_STATUS_CONFIG: ScheduleStatusConfig[] = [
    { id: 'scheduled', label: 'Scheduled', labelAr: 'مجدول', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { id: 'in_progress', label: 'In Progress', labelAr: 'جاري', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { id: 'completed', label: 'Completed', labelAr: 'مكتمل', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    { id: 'cancelled', label: 'Cancelled', labelAr: 'ملغي', color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
]

// Overdue visual config (not a DB status, calculated client-side)
export const OVERDUE_CONFIG: ScheduleStatusConfig = {
    id: 'scheduled' as ScheduleStatus, // fallback type
    label: 'Overdue',
    labelAr: 'متأخر',
    color: 'text-red-600',
    bgColor: 'bg-red-500/15',
}

/**
 * Check if a schedule is overdue (past due date but not completed/cancelled)
 */
export function isScheduleOverdue(schedule: { scheduled_date: string; status: ScheduleStatus }): boolean {
    if (schedule.status === 'completed' || schedule.status === 'cancelled') return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const scheduledDate = new Date(schedule.scheduled_date)
    scheduledDate.setHours(0, 0, 0, 0)
    return scheduledDate < today
}

/**
 * Get display config considering overdue status
 */
export function getEffectiveStatusConfig(schedule: { scheduled_date: string; status: ScheduleStatus }): ScheduleStatusConfig {
    if (isScheduleOverdue(schedule)) return OVERDUE_CONFIG
    return getScheduleStatusConfig(schedule.status)
}

export function getScheduleStatusConfig(status: ScheduleStatus): ScheduleStatusConfig {
    return SCHEDULE_STATUS_CONFIG.find(s => s.id === status) ?? SCHEDULE_STATUS_CONFIG[0]
}

// ============================================
// Missing Items Status Config
// ============================================

export interface MissingItemsStatusConfig {
    id: MissingItemsStatus
    label: string
    labelAr: string
    color: string
    bgColor: string
}

export const MISSING_ITEMS_STATUS_CONFIG: MissingItemsStatusConfig[] = [
    { id: 'pending', label: 'Pending', labelAr: 'معلق', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { id: 'resolved', label: 'Resolved', labelAr: 'تم الحل', color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { id: 'not_applicable', label: 'N/A', labelAr: 'لا يوجد', color: 'text-gray-400', bgColor: 'bg-gray-400/10' },
]

// ============================================
// Approval Status Config
// ============================================

export interface ApprovalStatusConfig {
    id: ApprovalStatus
    label: string
    labelAr: string
    color: string
    bgColor: string
}

export const APPROVAL_STATUS_CONFIG: ApprovalStatusConfig[] = [
    { id: 'pending', label: 'Pending', labelAr: 'في الانتظار', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    { id: 'approved', label: 'Approved', labelAr: 'موافق عليه', color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { id: 'rejected', label: 'Rejected', labelAr: 'مرفوض', color: 'text-red-500', bgColor: 'bg-red-500/10' },
]

// ============================================
// Schedule Type Config
// ============================================

export interface ScheduleTypeConfig {
    id: ScheduleType
    label: string
    labelAr: string
    icon: string
}

export const SCHEDULE_TYPE_CONFIG: ScheduleTypeConfig[] = [
    { id: 'reels', label: 'Reels', labelAr: 'ريلز', icon: '📹' },
    { id: 'post', label: 'Post', labelAr: 'بوست', icon: '📝' },
]
