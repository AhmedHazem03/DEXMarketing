'use client'

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
    ConversationWithDetails,
    MessageWithSender,
    SendMessageInput,
    CreateConversationInput,
} from '@/types/chat'
import type { Conversation, Department } from '@/types/database'

// ============================================
// Query Keys
// ============================================

export const chatKeys = {
    all: ['chat'] as const,
    conversations: () => [...chatKeys.all, 'conversations'] as const,
    conversation: (id: string) => [...chatKeys.all, 'conversation', id] as const,
    messages: (conversationId: string) => [...chatKeys.all, 'messages', conversationId] as const,
    unreadCount: () => [...chatKeys.all, 'unread'] as const,
}

// ============================================
// Fetch all conversations for current user
// ============================================

export function useConversations(userId: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: chatKeys.conversations(),
        enabled: !!userId,
        staleTime: 30 * 1000,
        queryFn: async () => {
            // Get conversation IDs where user is a participant
            const { data: participations, error: pError } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', userId)

            if (pError) throw pError
            if (!participations?.length) return []

            const convIds = participations.map(p => p.conversation_id)

            // Get conversations with participants
            const { data: conversations, error: cError } = await supabase
                .from('conversations')
                .select(`
                    *,
                    participants:conversation_participants(
                        *,
                        user:users(id, name, email, avatar_url, role)
                    )
                `)
                .in('id', convIds)
                .order('last_message_at', { ascending: false })

            if (cError) throw cError

            if (!conversations?.length) return []

            // Bulk-fetch last messages for ALL conversations in a single query
            // Using a subquery approach: fetch recent messages and deduplicate client-side
            const { data: recentMessages } = await supabase
                .from('messages')
                .select(`
                    *,
                    sender:users!messages_sender_id_fkey(id, name, avatar_url, role)
                `)
                .in('conversation_id', convIds)
                .order('created_at', { ascending: false })
                .limit(convIds.length * 2) // fetch enough to cover all convs

            // Build a map of conversation_id -> last message
            const lastMessageMap = new Map<string, any>()
            if (recentMessages) {
                for (const msg of recentMessages as Array<{ conversation_id: string; [key: string]: unknown }>) {
                    if (!lastMessageMap.has(msg.conversation_id)) {
                        lastMessageMap.set(msg.conversation_id, msg)
                    }
                }
            }

            // Bulk-fetch unread messages for per-conversation counts
            const { data: unreadMessages } = await supabase
                .from('messages')
                .select('id, conversation_id, created_at')
                .in('conversation_id', convIds)
                .neq('sender_id', userId)
                .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // last 30 days max

            // Build result using pre-fetched data (no N+1)
            const result: ConversationWithDetails[] = (conversations ?? []).map((conv: any) => {
                const myParticipation = (conv.participants as any[])?.find(
                    (p: any) => p.user_id === userId
                )
                const lastReadAt = myParticipation?.last_read_at

                const lastMsg = lastMessageMap.get(conv.id) ?? null

                // Count unread from bulk data
                let unreadCount = 0
                if (unreadMessages) {
                    // We need to re-check with last_read_at per conversation
                    // This is still far better than N separate queries
                    unreadCount = unreadMessages.filter((m: any) =>
                        m.conversation_id === conv.id &&
                        (!lastReadAt || new Date(m.created_at || 0) > new Date(lastReadAt))
                    ).length
                }

                return {
                    ...conv,
                    last_message: (lastMsg as MessageWithSender | null) ?? null,
                    unread_count: unreadCount,
                } as ConversationWithDetails
            })

            return result
        },
        refetchInterval: 30_000, // Refetch every 30s as backup
    })
}

// ============================================
// Fetch messages for a conversation (paginated)
// ============================================

const MESSAGES_PAGE_SIZE = 50

export function useMessages(conversationId: string) {
    const supabase = createClient()

    return useInfiniteQuery({
        queryKey: chatKeys.messages(conversationId),
        enabled: !!conversationId,
        initialPageParam: 0,
        queryFn: async ({ pageParam = 0 }) => {
            const from = pageParam * MESSAGES_PAGE_SIZE
            const to = from + MESSAGES_PAGE_SIZE - 1

            const { data, error } = await supabase
                .from('messages')
                .select(`
                    *,
                    sender:users!messages_sender_id_fkey(id, name, avatar_url, role)
                `)
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .range(from, to)

            if (error) throw error
            return (data ?? []) as MessageWithSender[]
        },
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < MESSAGES_PAGE_SIZE) return undefined
            return allPages.length
        },
    })
}

// ============================================
// Send a message
// ============================================

export function useSendMessage() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: SendMessageInput & { sender_id: string }) => {
            const { data, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: input.conversation_id,
                    sender_id: input.sender_id,
                    content: input.content,
                    message_type: input.message_type || 'text',
                    file_url: input.file_url || null,
                    file_name: input.file_name || null,
                })
                .select(`
                    *,
                    sender:users!messages_sender_id_fkey(id, name, avatar_url, role)
                `)
                .single()

            if (error) throw error
            return data as MessageWithSender
        },
        onSuccess: (newMessage) => {
            // Optimistic: prepend message to cache
            queryClient.setQueryData(
                chatKeys.messages(newMessage.conversation_id),
                (old: any) => {
                    if (!old) return { pages: [[newMessage]], pageParams: [0] }
                    const newPages = [...old.pages]
                    newPages[0] = [newMessage, ...(newPages[0] || [])]
                    return { ...old, pages: newPages }
                }
            )
            // Refresh conversation list for updated last_message
            queryClient.invalidateQueries({ queryKey: chatKeys.conversations() })
        },
    })
}

// ============================================
// Create a conversation
// ============================================

export function useCreateConversation() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateConversationInput & { creator_id: string }) => {
            // Check if conversation already exists between these participants
            const allParticipants = [input.creator_id, ...input.participant_ids]

            // Create conversation
            const { data: conversation, error: convError } = await supabase
                .from('conversations')
                .insert({
                    project_id: input.project_id || null,
                    department: (input.department || null) as Department | null,
                })
                .select()
                .single()

            if (convError) throw convError
            const conv1 = conversation as unknown as Conversation

            const participants = allParticipants.map(uid => ({
                conversation_id: conv1.id,
                user_id: uid,
            }))

            const { error: partError } = await supabase
                .from('conversation_participants')
                .insert(participants)

            if (partError) throw partError

            if (input.initial_message) {
                await supabase
                    .from('messages')
                    .insert({
                        conversation_id: conv1.id,
                        sender_id: input.creator_id,
                        content: input.initial_message,
                        message_type: 'text',
                    })
            }

            return conv1
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: chatKeys.conversations() })
        },
    })
}

// ============================================
// Mark messages as read
// ============================================

export function useMarkMessagesRead() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
            // Update participant last_read_at
            const { error } = await supabase
                .from('conversation_participants')
                .update({ last_read_at: new Date().toISOString() })
                .eq('conversation_id', conversationId)
                .eq('user_id', userId)

            if (error) throw error

            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('conversation_id', conversationId)
                .neq('sender_id', userId)
                .eq('is_read', false)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: chatKeys.conversations() })
            queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount() })
        },
    })
}

// ============================================
// Total unread messages count
// ============================================

export function useUnreadCount(userId: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: chatKeys.unreadCount(),
        enabled: !!userId,
        queryFn: async () => {
            // Get all conversation IDs with last_read_at
            const { data: participations } = await supabase
                .from('conversation_participants')
                .select('conversation_id, last_read_at')
                .eq('user_id', userId)

            if (!participations?.length) return 0

            const convIds = participations.map(p => p.conversation_id)
            const { data: unreadMessages } = await supabase
                .from('messages')
                .select('id, conversation_id, created_at')
                .in('conversation_id', convIds)
                .neq('sender_id', userId)
                .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

            if (!unreadMessages?.length) return 0

            // Build last_read_at map for efficient lookup
            const lastReadMap = new Map<string, string | null>()
            for (const p of participations) {
                lastReadMap.set(p.conversation_id, p.last_read_at)
            }

            // Count messages that are after last_read_at for each conversation
            let total = 0
            for (const msg of unreadMessages) {
                const lastReadAt = lastReadMap.get(msg.conversation_id)
                if (!lastReadAt || new Date(msg.created_at) > new Date(lastReadAt)) {
                    total++
                }
            }

            return total
        },
        refetchInterval: 15_000,
    })
}

// ============================================
// Real-time chat subscription
// ============================================

export function useChatRealtime(conversationId: string, userId: string) {
    const queryClient = useQueryClient()
    const supabase = createClient()

    useEffect(() => {
        if (!conversationId) return

        const channel = supabase
            .channel(`chat:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                async (payload) => {
                    const newMessage = payload.new as any

                    // Skip if sent by current user (already handled optimistically)
                    if (newMessage.sender_id === userId) return

                    // Fetch full message with sender info
                    const { data } = await supabase
                        .from('messages')
                        .select(`
                            *,
                            sender:users!messages_sender_id_fkey(id, name, avatar_url, role)
                        `)
                        .eq('id', newMessage.id)
                        .single()

                    if (data) {
                        queryClient.setQueryData(
                            chatKeys.messages(conversationId),
                            (old: any) => {
                                if (!old) return { pages: [[data]], pageParams: [0] }
                                const newPages = [...old.pages]
                                newPages[0] = [data, ...(newPages[0] || [])]
                                return { ...old, pages: newPages }
                            }
                        )
                    }

                    // Refresh conversations list
                    queryClient.invalidateQueries({ queryKey: chatKeys.conversations() })
                    queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount() })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId, userId, queryClient])
}

// ============================================
// Typing indicator (Supabase Presence)
// ============================================

export function useTypingIndicator(conversationId: string, userId: string, userName: string) {
    const supabase = createClient()
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
    const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())

    const setTyping = useCallback((isTyping: boolean) => {
        if (!channelRef.current) return
        channelRef.current.track({
            user_id: userId,
            user_name: userName,
            is_typing: isTyping,
        })
    }, [userId, userName])

    useEffect(() => {
        if (!conversationId || !userId) return

        const channel = supabase.channel(`typing:${conversationId}`, {
            config: { presence: { key: userId } },
        })

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                const newMap = new Map<string, string>()
                Object.entries(state).forEach(([key, presences]) => {
                    const presence = (presences as any[])?.[0]
                    if (presence?.is_typing && key !== userId) {
                        newMap.set(key, presence.user_name)
                    }
                })
                setTypingUsers(newMap)
            })
            .subscribe()

        channelRef.current = channel

        return () => {
            supabase.removeChannel(channel)
            channelRef.current = null
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId, userId])

    return {
        setTyping,
        getTypingUsers: () => Array.from(typingUsers.values()),
    }
}

// ============================================
// Find or create conversation between two users
// ============================================

export function useFindOrCreateConversation() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            userId,
            otherUserId,
            department,
            projectId,
        }: {
            userId: string
            otherUserId: string
            department?: string
            projectId?: string
        }) => {
            // Find existing conversations both users are in
            const { data: myConvs } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', userId)

            if (myConvs?.length) {
                const myConvIds = myConvs.map(c => c.conversation_id)

                const { data: shared } = await supabase
                    .from('conversation_participants')
                    .select('conversation_id')
                    .eq('user_id', otherUserId)
                    .in('conversation_id', myConvIds)

                if (shared?.length) {
                    const sharedIds = shared.map(s => s.conversation_id)

                    const { data: allParticipants } = await supabase
                        .from('conversation_participants')
                        .select('conversation_id')
                        .in('conversation_id', sharedIds)

                    // Count participants per conversation client-side
                    const countMap = new Map<string, number>()
                    if (allParticipants) {
                        for (const p of allParticipants) {
                            countMap.set(p.conversation_id, (countMap.get(p.conversation_id) || 0) + 1)
                        }
                    }

                    const directConvId = sharedIds.find((id: string) => countMap.get(id) === 2)
                    if (directConvId) {
                        return { conversation_id: directConvId, created: false }
                    }
                }
            }

            // Create new conversation
            const { data: conv, error: convError } = await supabase
                .from('conversations')
                .insert({
                    department: (department || null) as Department | null,
                    project_id: projectId || null,
                })
                .select()
                .single()

            if (convError) throw convError
            const newConv = conv as unknown as Conversation

            const { error: partError } = await supabase
                .from('conversation_participants')
                .insert([
                    { conversation_id: newConv.id, user_id: userId },
                    { conversation_id: newConv.id, user_id: otherUserId },
                ])

            if (partError) throw partError

            return { conversation_id: newConv.id, created: true }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: chatKeys.conversations() })
        },
    })
}
