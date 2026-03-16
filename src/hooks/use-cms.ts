'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { SiteSetting, Page, TeamMember, PortfolioItem, StorageSettings, ActivityLog } from '@/types/database'

const SETTINGS_KEY = ['site-settings']
const PAGES_KEY = ['pages']
const TEAM_KEY = ['team-members']
const PORTFOLIO_KEY = ['portfolio']
const STORAGE_KEY = ['storage-settings']
const ACTIVITY_KEY = ['activity-log']

// ============================================
// Site Settings Hooks
// ============================================

export function useSiteSettings() {
    const supabase = createClient()

    return useQuery({
        queryKey: SETTINGS_KEY,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('site_settings')
                .select('*')

            if (error) throw error

            // Convert to key-value object for easier access
            const settings: Record<string, any> = {}
                ; (data as unknown as SiteSetting[])?.forEach((s) => {
                    settings[s.key] = s.value
                })
            return settings
        },
    })
}

export function useUpdateSiteSetting() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ key, value }: { key: string; value: any }) => {
            const { error } = await supabase
                .from('site_settings')
                // @ts-ignore
                .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SETTINGS_KEY })
        },
    })
}

// ============================================
// Pages (CMS) Hooks
// ============================================

export function usePages() {
    const supabase = createClient()

    return useQuery({
        queryKey: PAGES_KEY,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .order('slug')

            if (error) throw error
            return data as unknown as Page[]
        },
    })
}

export function usePage(slug: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: [...PAGES_KEY, slug],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('slug', slug)
                .maybeSingle()

            if (error) throw error
            return data as unknown as Page
        },
        enabled: !!slug,
    })
}

export function useCreatePage() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (page: Omit<Page, 'id' | 'created_at' | 'updated_at'>) => {
            const { data, error } = await supabase
                .from('pages')
                // @ts-ignore
                .insert(page)
                .select('*')
                .maybeSingle()

            if (error) throw error
            return data as unknown as Page
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PAGES_KEY })
        },
    })
}

export function useUpdatePage() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Page> & { id: string }) => {
            const { error } = await supabase
                .from('pages')
                // @ts-ignore
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PAGES_KEY })
        },
    })
}

export function useDeletePage() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('pages')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PAGES_KEY })
        },
    })
}

// ============================================
// Team Members Hooks
// ============================================

export function useCMSTeamMembers() {
    const supabase = createClient()

    return useQuery({
        queryKey: TEAM_KEY,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .order('display_order')

            if (error) throw error
            return data as unknown as TeamMember[]
        },
    })
}

export function useCreateTeamMember() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (member: Omit<TeamMember, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('team_members')
                // @ts-ignore
                .insert(member)
                .select('*')
                .maybeSingle()

            if (error) throw error
            return data as unknown as TeamMember
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TEAM_KEY })
        },
    })
}

export function useUpdateTeamMember() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<TeamMember> & { id: string }) => {
            const { error } = await supabase
                .from('team_members')
                // @ts-ignore
                .update(updates)
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TEAM_KEY })
        },
    })
}

export function useDeleteTeamMember() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('team_members')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TEAM_KEY })
        },
    })
}

// ============================================
// Portfolio Hooks
// ============================================

export function usePortfolio() {
    const supabase = createClient()

    return useQuery({
        queryKey: PORTFOLIO_KEY,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('portfolio')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as unknown as PortfolioItem[]
        },
    })
}

export function useCreatePortfolioItem() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (item: Omit<PortfolioItem, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('portfolio')
                // @ts-ignore
                .insert(item)
                .select('*')
                .maybeSingle()

            if (error) throw error
            return data as unknown as PortfolioItem
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY })
        },
    })
}

export function useDeletePortfolioItem() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('portfolio')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY })
        },
    })
}

// ============================================
// Storage Settings Hooks
// ============================================

export function useStorageSettings() {
    const supabase = createClient()

    return useQuery({
        queryKey: STORAGE_KEY,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('storage_settings')
                .select('*')
                .maybeSingle()

            if (error) throw error
            return data as unknown as StorageSettings
        },
    })
}

export function useUpdateStorageSettings() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (settings: Partial<StorageSettings>) => {
            // First get the ID
            const { data: current } = await supabase
                .from('storage_settings')
                .select('id')
                .maybeSingle()

            const currentId = (current as unknown as { id: string } | null)?.id
            if (!currentId) throw new Error('Storage settings not found')

            const { error } = await supabase
                .from('storage_settings')
                // @ts-ignore
                .update(settings)
                .eq('id', currentId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: STORAGE_KEY })
        },
    })
}

// ============================================
// Activity Log Hooks
// ============================================

export function useActivityLog(limit = 50) {
    const supabase = createClient()

    return useQuery({
        queryKey: [...ACTIVITY_KEY, limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('activity_log')
                .select('*, user:users(id, name, email)')
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error
            return data as unknown as (ActivityLog & { user: { id: string; name: string; email: string } | null })[]
        },
    })
}

export function useUpdateMultipleSiteSettings() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (settings: Record<string, any>) => {
            const rows = Object.entries(settings).map(([key, value]) => ({
                key,
                value,
                updated_at: new Date().toISOString(),
            }))

            const { error } = await supabase
                .from('site_settings')
                // @ts-ignore — Supabase generated types may not include site_settings
                .upsert(rows, { onConflict: 'key' })

            if (error) {
                throw new Error(`Failed to save settings: ${error.message}`)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SETTINGS_KEY })
        },
    })
}

export function useLogActivity() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (log: { action: string; details?: any; user_id?: string }) => {
            const { error } = await supabase
                .from('activity_log')
                // @ts-ignore
                .insert(log)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ACTIVITY_KEY })
        },
    })
}
