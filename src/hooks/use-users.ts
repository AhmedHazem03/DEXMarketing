'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { User, UserRole, Department } from '@/types/database'

const USERS_KEY = ['users']
const CURRENT_USER_KEY = ['current-user']
const TEAM_MEMBERS_KEY = ['team-members']

// Role-to-department mapping
const DEPARTMENT_ROLES: Record<Department, UserRole[]> = {
    photography: ['videographer', 'photographer', 'editor'],
    content: ['creator', 'designer'],
}

/**
 * Hook to fetch the currently logged-in user's profile
 */
export function useCurrentUser() {
    const supabase = createClient()

    return useQuery({
        queryKey: CURRENT_USER_KEY,
        queryFn: async () => {
            // Use getSession() (local JWT) instead of getUser() (network call)
            // to avoid ~130ms latency. The dashboard layout already validates
            // the user server-side via getUser().
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, role, department, is_active, avatar_url, phone, created_at')
                .eq('id', session.user.id)
                .single()

            if (error) throw error
            return data as unknown as User
        },
        staleTime: 5 * 60 * 1000, // 5 min
    })
}

/**
 * Hook to fetch all users (Admin only)
 */
export function useUsers() {
    const supabase = createClient()

    return useQuery({
        queryKey: USERS_KEY,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, role, department, is_active, avatar_url, phone, created_at')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as unknown as User[]
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
    })
}

/**
 * Hook to fetch a single user by ID
 */
export function useUser(userId: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: [...USERS_KEY, userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, role, department, is_active, avatar_url, phone, created_at')
                .eq('id', userId)
                .single()

            if (error) throw error
            return data as unknown as User
        },
        enabled: !!userId,
    })
}

/**
 * Hook to update a user
 */
export function useUpdateUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string; name?: string; role?: UserRole; is_active?: boolean }) => {
            const { updateUserAdmin } = await import('@/lib/actions/users')
            const result = await updateUserAdmin(id, updates)
            if (!result.success) throw new Error(result.error || 'Failed to update user')
            return result.user as unknown as User
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USERS_KEY })
        },
    })
}

/**
 * Hook to delete a user (removes from both DB and Supabase Auth)
 */
export function useDeleteUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (userId: string) => {
            const { deleteAccount } = await import('@/lib/actions/users')
            const result = await deleteAccount(userId)
            if (!result.success) throw new Error(result.error || 'Failed to delete user')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USERS_KEY })
        },
    })
}

/**
 * Hook to fetch team members for a given team leader's department.
 * Returns all active users with roles belonging to that department.
 * @param teamLeaderId - The team leader's user ID (used to determine department)
 */
export function useTeamMembers(teamLeaderId: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: [...TEAM_MEMBERS_KEY, teamLeaderId],
        enabled: !!teamLeaderId,
        queryFn: async () => {
            // Get the team leader's department (and role as fallback)
            const { data: tl, error: tlError } = await supabase
                .from('users')
                .select('department, role')
                .eq('id', teamLeaderId)
                .single() as { data: { department: string | null; role: string | null } | null; error: unknown }

            if (tlError) throw tlError

            // Derive department from role if not explicitly set in DB
            let dept: Department | null = (tl?.department as Department) ?? null
            if (!dept && tl?.role) {
                if (tl.role === 'account_manager') dept = 'content'
                else if (tl.role === 'team_leader') dept = 'photography'
            }
            if (!dept) return []
            const roles = DEPARTMENT_ROLES[dept] || []

            if (roles.length === 0) return []

            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, avatar_url, role, department')
                .in('role', roles)
                .eq('is_active', true)
                .order('name')

            if (error) throw error
            return (data ?? []) as unknown as Pick<User, 'id' | 'name' | 'email' | 'avatar_url' | 'role' | 'department'>[]
        },
        staleTime: 10 * 60 * 1000, // 10 minutes - team members rarely change
    })
}

/**
 * Hook to find the department leader for the current user.
 * For content dept members (creator/designer): finds their account_manager
 * For photography dept members (photographer/videographer/editor): finds their team_leader
 */
export function useMyDepartmentLeader(department?: Department | null) {
    const supabase = createClient()

    const leaderRole = department === 'content' ? 'account_manager' : 'team_leader'

    return useQuery({
        queryKey: ['department-leader', department, leaderRole],
        enabled: !!department,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, avatar_url, role, department')
                .eq('role', leaderRole)
                .eq('department', department!)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle()

            if (error) throw error
            return data as unknown as Pick<User, 'id' | 'name' | 'email' | 'avatar_url' | 'role' | 'department'> | null
        },
    })
}

// Re-export getRoleLabel from its canonical location so existing consumers don't break
export { getRoleLabel } from '@/lib/constants/admin'
