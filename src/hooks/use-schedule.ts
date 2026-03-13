'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { sanitizeSearch, getMonthRange } from '@/lib/utils'
import type { ScheduleStatus } from '@/types/database'
import type {
    ScheduleWithRelations,
    CreateScheduleInput,
    UpdateScheduleInput,
    ScheduleFilters,
} from '@/types/schedule'

// ============================================
// Query Keys
// ============================================

export const scheduleKeys = {
    all: ['schedules'] as const,
    lists: () => [...scheduleKeys.all, 'list'] as const,
    list: (filters: ScheduleFilters) => [...scheduleKeys.lists(), filters] as const,
    detail: (id: string) => [...scheduleKeys.all, 'detail', id] as const,
    calendar: (month: string) => [...scheduleKeys.all, 'calendar', month] as const,
    today: (userId: string) => [...scheduleKeys.all, 'today', userId] as const,
}

// ============================================
// Fetch schedules with filters
// ============================================

export function useSchedules(filters: ScheduleFilters = {}) {
    const supabase = createClient()

    return useQuery({
        queryKey: scheduleKeys.list(filters),
        queryFn: async () => {
            let query = (supabase
                .from('schedules') as any)
                .select(`
                    *,
                    team_leader:users!schedules_team_leader_id_fkey(id, name, avatar_url),
                    client:clients!schedules_client_id_fkey(id, name),
                    project:projects!schedules_project_id_fkey(id, name),
                    task:tasks!schedules_task_id_fkey(id, title),
                    creator:users!schedules_created_by_fkey(id, name, avatar_url)
                `)
                .order('scheduled_date', { ascending: true })
                .order('start_time', { ascending: true })

            if (filters.status && filters.status !== 'all') {
                query = query.eq('status', filters.status)
            }
            if (filters.dateFrom) {
                query = query.gte('scheduled_date', filters.dateFrom)
            }
            if (filters.dateTo) {
                query = query.lte('scheduled_date', filters.dateTo)
            }
            if (filters.client_id) {
                query = query.eq('client_id', filters.client_id)
            }
            if (filters.search) {
                const safe = sanitizeSearch(filters.search)
                if (safe) {
                    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`)
                }
            }

            const { data, error } = await query
            if (error) throw error
            return (data ?? []) as ScheduleWithRelations[]
        },
    })
}

// ============================================
// Fetch today's schedules for a specific user (assigned_members)
// ============================================

export function useTodayAssignedSchedules(userId: string) {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    return useQuery({
        queryKey: scheduleKeys.today(userId),
        enabled: !!userId,
        staleTime: 30 * 1000, // 30 seconds
        queryFn: async () => {
            const { data, error } = await (supabase
                .from('schedules') as any)
                .select(`
                    *,
                    team_leader:users!schedules_team_leader_id_fkey(id, name, avatar_url),
                    client:clients!schedules_client_id_fkey(id, name),
                    project:projects!schedules_project_id_fkey(id, name),
                    task:tasks!schedules_task_id_fkey(id, title),
                    creator:users!schedules_created_by_fkey(id, name, avatar_url)
                `)
                .eq('scheduled_date', today)
                .contains('assigned_members', [userId])
                .order('start_time', { ascending: true })

            if (error) throw error
            return (data ?? []) as ScheduleWithRelations[]
        },
    })
}

// ============================================
// Fetch schedules for calendar (by month)
// ============================================

export function useCalendarSchedules(teamLeaderId: string, year: number, month: number) {
    const supabase = createClient()
    const { startDate, endDate } = getMonthRange(year, month)

    return useQuery({
        queryKey: scheduleKeys.calendar(`${teamLeaderId}-${year}-${month}`),
        enabled: !!teamLeaderId,
        queryFn: async () => {
            const { data, error } = await (supabase
                .from('schedules') as any)
                .select(`
                    *,
                    team_leader:users!schedules_team_leader_id_fkey(id, name, avatar_url),
                    client:clients!schedules_client_id_fkey(id, name),
                    project:projects!schedules_project_id_fkey(id, name),
                    task:tasks!schedules_task_id_fkey(id, title),
                    creator:users!schedules_created_by_fkey(id, name, avatar_url)
                `)
                .eq('team_leader_id', teamLeaderId)
                .gte('scheduled_date', startDate)
                .lt('scheduled_date', endDate)
                .order('scheduled_date', { ascending: true })
                .order('start_time', { ascending: true })

            if (error) throw error
            return (data ?? []) as ScheduleWithRelations[]
        },
    })
}

// ============================================
// Fetch schedules for a specific user (read-only for team members)
// ============================================

export function useMySchedules(userId: string, year: number, month: number) {
    const supabase = createClient()
    const { startDate, endDate } = getMonthRange(year, month)

    return useQuery({
        queryKey: [...scheduleKeys.calendar(`user-${userId}-${year}-${month}`)],
        enabled: !!userId,
        queryFn: async () => {
            // Single query: join schedules with tasks using !inner to filter by assigned_to
            const { data, error } = await (supabase
                .from('schedules') as any)
                .select(`
                    *,
                    task:tasks!schedules_task_id_fkey!inner(id, title),
                    team_leader:users!schedules_team_leader_id_fkey(id, name, avatar_url),
                    client:clients!schedules_client_id_fkey(id, name),
                    project:projects!schedules_project_id_fkey(id, name),
                    creator:users!schedules_created_by_fkey(id, name, avatar_url)
                `)
                .eq('tasks.assigned_to', userId)
                .gte('scheduled_date', startDate)
                .lt('scheduled_date', endDate)
                .order('scheduled_date', { ascending: true })
                .order('start_time', { ascending: true })

            if (error) throw error
            return (data ?? []) as ScheduleWithRelations[]
        },
    })
}

// ============================================
// Fetch schedules for a specific client (read-only)
// ============================================

export function useClientSchedules(clientId: string, year: number, month: number) {
    const supabase = createClient()
    const { startDate, endDate } = getMonthRange(year, month)

    return useQuery({
        queryKey: [...scheduleKeys.calendar(`client-${clientId}-${year}-${month}`)],
        enabled: !!clientId,
        queryFn: async () => {
            const { data, error } = await (supabase
                .from('schedules') as any)
                .select(`
                    *,
                    team_leader:users!schedules_team_leader_id_fkey(id, name, avatar_url),
                    client:clients!schedules_client_id_fkey(id, name),
                    project:projects!schedules_project_id_fkey(id, name),
                    creator:users!schedules_created_by_fkey(id, name, avatar_url)
                `)
                .eq('client_id', clientId)
                .gte('scheduled_date', startDate)
                .lt('scheduled_date', endDate)
                .order('scheduled_date', { ascending: true })
                .order('start_time', { ascending: true })

            if (error) throw error
            return (data ?? []) as ScheduleWithRelations[]
        },
    })
}

// ============================================
// Fetch single schedule detail
// ============================================

export function useScheduleDetail(id: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: scheduleKeys.detail(id),
        enabled: !!id,
        queryFn: async () => {
            const { data, error } = await (supabase
                .from('schedules') as any)
                .select(`
                    *,
                    team_leader:users!schedules_team_leader_id_fkey(id, name, avatar_url),
                    client:clients!schedules_client_id_fkey(id, name),
                    project:projects!schedules_project_id_fkey(id, name),
                    creator:users!schedules_created_by_fkey(id, name, avatar_url)
                `)
                .eq('id', id)
                .single()

            if (error) throw error
            return data as ScheduleWithRelations
        },
    })
}

// ============================================
// Create schedule
// ============================================

export function useCreateSchedule() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateScheduleInput & { team_leader_id: string; task_id?: string; assigned_members?: string[] }) => {
            // Grab the current user's ID to set as created_by (required for RLS)
            const { data: { user } } = await supabase.auth.getUser()
            const userId = user?.id

            if (!userId) {
                throw new Error('Not authenticated')
            }

            // Strip fields not in the DB schema
            const { company_name, ...rest } = input as any

            const insertPayload = {
                ...rest,
                assigned_members: rest.assigned_members || [],
                created_by: userId,
            }

            const { data: schedule, error } = await (supabase
                .from('schedules') as any)
                .insert(insertPayload)
                .select()
                .single()

            if (error) {
                throw error
            }
            return schedule
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
        },
    })
}

// ============================================
// Update schedule
// ============================================

export function useUpdateSchedule() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: UpdateScheduleInput & { assigned_members?: string[] }) => {
            const { id, ...rawUpdates } = input
            // Strip fields not in the DB schema
            const { company_name, ...updates } = rawUpdates as any
            const { data: schedule, error } = await (supabase
                .from('schedules') as any)
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return schedule
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
            queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(variables.id) })
        },
    })
}

// ============================================
// Delete schedule
// ============================================

export function useDeleteSchedule() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase
                .from('schedules') as any)
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
        },
    })
}

// ============================================
// Update schedule status
// ============================================

export function useUpdateScheduleStatus() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: ScheduleStatus }) => {
            const { data, error } = await (supabase
                .from('schedules') as any)
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
        },
    })
}

// ============================================
// Content department schedules (for account_manager & team_leader read-only)
// ============================================

export function useContentSchedules(year: number, month: number) {
    const supabase = createClient()
    const { startDate, endDate } = getMonthRange(year, month)

    return useQuery({
        queryKey: [...scheduleKeys.all, 'content', `${year}-${month}`],
        queryFn: async () => {
            const { data, error } = await (supabase
                .from('schedules') as any)
                .select(`
                    *,
                    team_leader:users!schedules_team_leader_id_fkey(id, name, avatar_url),
                    client:clients!schedules_client_id_fkey(id, name),
                    project:projects!schedules_project_id_fkey(id, name),
                    task:tasks!schedules_task_id_fkey(id, title),
                    creator:users!schedules_created_by_fkey(id, name, avatar_url)
                `)
                .eq('department', 'content')
                .gte('scheduled_date', startDate)
                .lt('scheduled_date', endDate)
                .order('scheduled_date', { ascending: true })
                .order('start_time', { ascending: true })

            if (error) throw error
            return (data ?? []) as ScheduleWithRelations[]
        },
    })
}

// ============================================
// Update schedule approval (account_manager)
// ============================================

export function useUpdateScheduleApproval() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, approval_status, manager_notes }: {
            id: string
            approval_status: 'approved' | 'rejected'
            manager_notes?: string
        }) => {
            const { data, error } = await (supabase
                .from('schedules') as any)
                .update({
                    approval_status,
                    manager_notes: manager_notes || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
        },
    })
}

// ============================================
// Update missing items status
// ============================================

export function useUpdateMissingItems() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, missing_items, missing_items_status }: {
            id: string
            missing_items?: string
            missing_items_status?: 'pending' | 'resolved' | 'not_applicable'
        }) => {
            const { data, error } = await (supabase
                .from('schedules') as any)
                .update({
                    missing_items: missing_items ?? null,
                    missing_items_status: missing_items_status ?? 'not_applicable',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
        },
    })
}
