'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types/database'

export const NOTIFICATIONS_KEY = ['notifications']

export function useNotifications(userId?: string, limit = 20) {
    const supabase = createClient()

    return useQuery({
        queryKey: [...NOTIFICATIONS_KEY, userId, limit],
        staleTime: 30 * 1000,
        queryFn: async () => {
            if (!userId) return []

            const { data, error } = await supabase
                .from('notifications')
                .select('id, title, message, is_read, link, created_at, user_id, notification_type, entity_id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error
            return data ?? []
        },
        enabled: !!userId,
    })
}

export function useMarkNotificationRead() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
        },
        onError: (error: Error) => {
            console.error('Failed to mark notification as read:', error)
        }
    })
}

export function useMarkAllNotificationsRead() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
        }
    })
}
