'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { sanitizeSearch } from '@/lib/utils'
import { toast } from 'sonner'
import type { Project, Client } from '@/types/database'

// Query keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: ProjectFilters) => [...projectKeys.lists(), { filters }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
}

interface ProjectFilters {
  clientId?: string
  search?: string
}

interface ProjectWithClient extends Project {
  client?: Client
}

// Get all projects
export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: projectKeys.list(filters || {}),
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const supabase = createClient()

      let query = supabase
        .from('projects')
        .select('*, client:clients(id, name, email)')
        .order('name', { ascending: true })

      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId)
      }

      if (filters?.search) {
        const safe = sanitizeSearch(filters.search)
        if (safe) {
          query = query.ilike('name', `%${safe}%`)
        }
      }

      const { data, error } = await query

      if (error) throw error
      return data as ProjectWithClient[]
    },
  })
}

// Get single project
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(id || ''),
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!id) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .select('*, client:clients(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as ProjectWithClient
    },
    enabled: !!id,
  })
}

// Create project
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      project: Omit<Project, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const supabase = createClient()

      const { data, error } = await (supabase
        .from('projects') as any)
        .insert(project)
        .select('*, client:clients(*)')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create project')
    },
  })
}

// Update project
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Project>
    }) => {
      const supabase = createClient()

      const { data, error } = await (supabase
        .from('projects') as any)
        .update(updates)
        .eq('id', id)
        .select('*, client:clients(*)')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update project')
    },
  })
}

// Delete project
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()

      const { error } = await supabase.from('projects').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete project')
    },
  })
}
