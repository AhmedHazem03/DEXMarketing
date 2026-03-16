'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Advance, AdvanceRecipient, AdvanceRecipientType, AdvanceRecipientWithAdvances } from '@/types/database'
import { TREASURY_KEY, TRANSACTIONS_KEY } from './use-treasury'

const ADVANCES_KEY = ['advances']
const RECIPIENTS_KEY = ['advance_recipients']

// ── Recipients ───────────────────────────────────────────────────────────────

export function useAdvanceRecipients() {
    const supabase = createClient()
    return useQuery({
        queryKey: RECIPIENTS_KEY,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('advance_recipients')
                .select('*, advances(id, amount, notes, transaction_id, created_at, transaction:transactions(id,is_approved))')
                .order('created_at', { ascending: false })
            if (error) throw error
            return data as unknown as AdvanceRecipientWithAdvances[]
        },
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
    })
}

export function useCreateAdvanceRecipient() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (input: { name: string; recipient_type: AdvanceRecipientType }) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')
            const { data, error } = await supabase
                .from('advance_recipients')
                .insert({ ...input, created_by: user.id })
                .select()
                .single()
            if (error) throw error
            return data as AdvanceRecipient
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: RECIPIENTS_KEY }),
    })
}

export function useDeleteAdvanceRecipient() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (recipient: AdvanceRecipientWithAdvances) => {
            // Delete linked transactions first to restore treasury balance
            const txIds = recipient.advances
                .map(a => a.transaction_id)
                .filter(Boolean) as string[]
            // Delete all transactions in parallel to avoid partial-delete inconsistency
            if (txIds.length > 0) {
                const results = await Promise.all(
                    txIds.map(txId => supabase.from('transactions').delete().eq('id', txId))
                )
                const failed = results.find(r => r.error)
                if (failed?.error) throw failed.error
            }
            // Delete recipient (DB ON DELETE CASCADE removes their advances)
            const { error } = await supabase
                .from('advance_recipients')
                .delete()
                .eq('id', recipient.id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: RECIPIENTS_KEY })
            queryClient.invalidateQueries({ queryKey: TREASURY_KEY })
            queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
        },
    })
}

// ── Advances ─────────────────────────────────────────────────────────────────

export function useAdvances(filters?: { startDate?: string; endDate?: string }) {
    const supabase = createClient()
    return useQuery({
        queryKey: [...ADVANCES_KEY, filters],
        queryFn: async () => {
            let query = supabase
                .from('advances')
                .select('*')
                .order('created_at', { ascending: false })
            if (filters?.startDate) query = query.gte('created_at', filters.startDate)
            if (filters?.endDate) {
                const end = new Date(filters.endDate)
                end.setDate(end.getDate() + 1)
                query = query.lt('created_at', end.toISOString())
            }
            const { data, error } = await query
            if (error) throw error
            return data ?? []
        },
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
    })
}

interface CreateAdvanceInput {
    recipient_id: string
    recipient_name: string
    recipient_type: AdvanceRecipientType
    amount: number
    notes?: string
}

export function useCreateAdvance() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateAdvanceInput) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')
            const label = input.recipient_type === 'owner' ? 'مالك' : 'موظف'

            // 1. Create expense transaction (pending admin approval — NOT approved yet)
            const { data: transaction, error: txError } = await supabase
                .from('transactions')
                .insert({
                    type: 'expense',
                    amount: input.amount,
                    category: 'advance',
                    description: `سلفة - ${label} - ${input.recipient_name}`,
                    notes: input.notes || null,
                    payment_method: 'cash',
                    created_by: user.id,
                    is_approved: false,
                })
                .select()
                .single()
            if (txError) throw txError
            const tx = transaction as unknown as { id: string }

            // 2. Create advance record linked to transaction and recipient
            const { data: advance, error: advError } = await supabase
                .from('advances')
                .insert({
                    recipient_id: input.recipient_id,
                    recipient_type: input.recipient_type,
                    recipient_name: input.recipient_name,
                    amount: input.amount,
                    notes: input.notes || null,
                    transaction_id: tx.id,
                    created_by: user.id,
                })
                .select()
                .single()
            if (advError) throw advError
            return advance!
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: RECIPIENTS_KEY })
            queryClient.invalidateQueries({ queryKey: ADVANCES_KEY })
            queryClient.invalidateQueries({ queryKey: TREASURY_KEY })
            queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
        },
    })
}

export function useApproveAdvance() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (advance: { transaction_id: string | null }) => {
            if (!advance.transaction_id) throw new Error('No linked transaction')
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')
            const { error } = await supabase
                .from('transactions')
                .update({
                    is_approved: true,
                    approved_by: user.id,
                    approved_at: new Date().toISOString(),
                })
                .eq('id', advance.transaction_id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: RECIPIENTS_KEY })
            queryClient.invalidateQueries({ queryKey: ADVANCES_KEY })
            queryClient.invalidateQueries({ queryKey: TREASURY_KEY })
            queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
        },
    })
}

export function useDeleteAdvance() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (advance: Advance) => {
            // Delete transaction first to avoid orphaned transactions if advance delete succeeds but transaction delete fails
            if (advance.transaction_id) {
                const { error: txError } = await supabase.from('transactions').delete().eq('id', advance.transaction_id)
                if (txError) throw txError
            }
            const { error } = await supabase
                .from('advances')
                .delete()
                .eq('id', advance.id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: RECIPIENTS_KEY })
            queryClient.invalidateQueries({ queryKey: ADVANCES_KEY })
            queryClient.invalidateQueries({ queryKey: TREASURY_KEY })
            queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
        },
    })
}
