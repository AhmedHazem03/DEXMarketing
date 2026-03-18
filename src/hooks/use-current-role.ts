'use client'

import { useCurrentUser } from './use-users'
import type { UserRole } from '@/types/database'

/**
 * Hook to get current user's role
 * Returns the role or null if not authenticated
 */
export function useCurrentRole(): { role: UserRole | null; isAdmin: boolean; isAccountant: boolean; isClient: boolean; isModerator: boolean; isLoading: boolean } {
    const { data: user, isLoading } = useCurrentUser()

    const role = user?.role ?? null
    const isAdmin = role === 'admin'
    const isAccountant = role === 'accountant'
    const isClient = role === 'client'
    const isModerator = role === 'moderator'

    return {
        role,
        isAdmin,
        isAccountant,
        isClient,
        isModerator,
        isLoading
    }
}

/**
 * Hook to check if user is admin or accountant
 * Returns both the boolean result and the loading state
 */
export function useIsAccountantOrAdmin(): { isAccountantOrAdmin: boolean; isLoading: boolean } {
    const { role, isLoading } = useCurrentRole()
    return {
        isAccountantOrAdmin: role === 'admin' || role === 'accountant',
        isLoading,
    }
}
