'use client'

import { useState, useEffect, useRef } from 'react'
import { useLocale } from 'next-intl'
import { Bell, Check, Info, AlertTriangle, CheckCircle, XCircle, MessageSquare, ClipboardList, DollarSign, Calendar, Banknote, UserPlus, UserCircle, FolderOpen } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications'
import { useNotificationsRealtime } from '@/hooks/use-realtime'
import { useCurrentUser } from '@/hooks/use-users'
import { useNotificationSound } from '@/hooks/use-notification-sound'
import { Badge } from '@/components/ui/badge'

// Maps each role to its dashboard base path
const ROLE_BASE: Record<string, string> = {
    admin: '/admin',
    team_leader: '/team-leader',
    account_manager: '/account-manager',
    creator: '/creator',
    designer: '/creator',
    videographer: '/videographer',
    editor: '/editor',
    photographer: '/photographer',
    client: '/client',
    accountant: '/accountant',
}

// Known sub-paths available per role (to avoid routing to non-existent pages)
const ROLE_KNOWN_SUBPATHS: Record<string, string[]> = {
    admin: ['/users', '/treasury', '/advances', '/tasks', '/schedule', '/pages', '/theme', '/reports', '/settings'],
    team_leader: ['/revisions', '/schedule', '/logs', '/chat'],
    account_manager: ['/revisions', '/schedule', '/logs', '/chat'],
    creator: ['/schedule'],
    designer: ['/schedule'],
    videographer: ['/schedule'],
    editor: ['/schedule'],
    photographer: ['/schedule'],
    client: ['/account', '/tasks', '/revisions', '/schedule', '/chat'],
    accountant: ['/client-accounts', '/reports'],
}

/**
 * Resolve a notification link to the correct path for the current user's role.
 * If the link contains a role-specific prefix (e.g. /team-leader/revisions)
 * and the current user has a different role, replace it with the user's base path.
 * Falls back to the user's dashboard root if the sub-page doesn't exist for their role.
 */
function resolveRoleLink(link: string, role?: string): string {
    if (!role) return link
    const userBase = ROLE_BASE[role]
    if (!userBase) return link

    // Find which role prefix this link belongs to
    const matchedBase = Object.values(ROLE_BASE).find(
        base => link === base || link.startsWith(base + '/')
    )

    // If the link already belongs to the current user's role, keep it as-is
    if (!matchedBase || matchedBase === userBase) return link

    // Extract the sub-path after the role prefix (e.g. "/revisions")
    const subPath = link.slice(matchedBase.length) // e.g. "/revisions"

    // Check if this sub-path exists for the current role
    const knownSubpaths = ROLE_KNOWN_SUBPATHS[role] ?? []
    const subPathRoot = '/' + (subPath.split('/')[1] ?? '') // e.g. "/revisions"
    const isKnown = knownSubpaths.includes(subPathRoot)

    return isKnown ? userBase + subPath : userBase
}

export function NotificationsPopover() {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const [open, setOpen] = useState(false)
    const router = useRouter()
    const prevUnreadRef = useRef<number | null>(null)

    const { data: currentUser } = useCurrentUser()
    const userId = currentUser?.id || ''

    // Enable realtime notifications
    useNotificationsRealtime(userId)

    const { data: notifications, isLoading } = useNotifications(userId)
    const markRead = useMarkNotificationRead()
    const markAllRead = useMarkAllNotificationsRead()

    const unreadCount = notifications?.filter(n => !n.is_read).length || 0
    const { play: playSound, prime: primeSound } = useNotificationSound()
    const swRef = useRef<ServiceWorkerRegistration | null>(null)

    // Register Service Worker + request Notification permission
    useEffect(() => {
        if (typeof window === 'undefined') return

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }

        // Register the notifications service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw-notifications.js')
                .then((reg) => { swRef.current = reg })
                .catch(() => { /* SW not supported or blocked */ })
        }
    }, [])

    // Play sound + show notification when a new unread arrives
    useEffect(() => {
        // Skip the very first render (initial load) — just record the baseline
        if (prevUnreadRef.current === null) {
            prevUnreadRef.current = unreadCount
            return
        }
        if (unreadCount > prevUnreadRef.current) {
            // Sound chime
            playSound()

            // Show notification (Service Worker for background, fallback to Notification API)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                const latest = notifications?.find(n => !n.is_read)
                if (latest) {
                    const sw = swRef.current
                    if (sw?.active) {
                        // Post to SW — works even when tab is in background / minimized
                        sw.active.postMessage({
                            type: 'SHOW_NOTIFICATION',
                            title: latest.title,
                            body: latest.message || '',
                            url: latest.link || '/',
                        })
                    } else {
                        // Fallback: direct notification (works when tab is focused)
                        new Notification(latest.title, {
                            body: latest.message || '',
                            icon: '/images/logo.png',
                        })
                    }
                }
            }
        }
        prevUnreadRef.current = unreadCount
    }, [unreadCount, notifications, playSound])

    const handleMarkAllRead = () => {
        markAllRead.mutate(userId)
    }

    const handleNotificationClick = (id: string, isRead: boolean, link?: string | null) => {
        if (!isRead) markRead.mutate(id)
        if (link) {
            // Remap role-prefixed links to the current user's role path.
            // e.g. a notification created with link="/team-leader/revisions"
            // should take an account_manager to "/account-manager" instead.
            const resolvedLink = resolveRoleLink(link, currentUser?.role)
            const normalizedLink = resolvedLink.startsWith(`/${locale}`) ? resolvedLink : `/${locale}${resolvedLink}`
            setOpen(false)
            router.push(normalizedLink)
        }
    }

    const getIcon = (notification: { notification_type?: string; title: string }) => {
        switch (notification.notification_type) {
            case 'task':           return <ClipboardList className="h-4 w-4 text-orange-500" />
            case 'schedule':       return <Calendar      className="h-4 w-4 text-blue-500" />
            case 'treasury':       return <DollarSign    className="h-4 w-4 text-emerald-500" />
            case 'advance':        return <Banknote      className="h-4 w-4 text-amber-500" />
            case 'user':           return <UserPlus      className="h-4 w-4 text-purple-500" />
            case 'client':         return <UserCircle    className="h-4 w-4 text-cyan-500" />
            case 'project':        return <FolderOpen    className="h-4 w-4 text-indigo-500" />
            case 'client_account': return <DollarSign    className="h-4 w-4 text-teal-500" />
            case 'chat':           return <MessageSquare className="h-4 w-4 text-purple-500" />
            default: {
                // Legacy fallback: keyword-based for older 'general' notifications
                const t = notification.title.toLowerCase()
                if (t.includes('رفض') || t.includes('rejected'))     return <XCircle       className="h-4 w-4 text-red-500" />
                if (t.includes('موافق') || t.includes('approved') || t.includes('تمت')) return <CheckCircle className="h-4 w-4 text-green-500" />
                if (t.includes('تعديل') || t.includes('revision'))   return <AlertTriangle className="h-4 w-4 text-yellow-500" />
                if (t.includes('رسالة') || t.includes('message'))    return <MessageSquare className="h-4 w-4 text-purple-500" />
                if (t.includes('مهمة')  || t.includes('task'))       return <ClipboardList className="h-4 w-4 text-orange-500" />
                return <Info className="h-4 w-4 text-blue-500" />
            }
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" onClick={primeSound}>
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 end-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-background">
                            {unreadCount}
                        </span>
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">{isAr ? 'الإشعارات' : 'Notifications'}</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-auto p-1"
                            onClick={handleMarkAllRead}
                        >
                            <Check className="h-3 w-3 me-1" />
                            {isAr ? 'تحديد الكل كمقروء' : 'Mark all read'}
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-80">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
                    ) : notifications?.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            {isAr ? 'لا توجد إشعارات' : 'No notifications'}
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications?.map((notification) => (
                                <button
                                    key={notification.id}
                                    className={`flex items-start gap-3 p-4 text-start hover:bg-muted/50 transition-colors border-b last:border-0 ${notification.is_read ? '' : 'bg-muted/20'}`}
                                    onClick={() => handleNotificationClick(notification.id, notification.is_read || false, notification.link)}
                                >
                                    <div className="mt-1">
                                        {getIcon(notification)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className={`text-sm ${notification.is_read ? 'text-muted-foreground' : 'font-medium'}`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: isAr ? ar : enUS })}
                                        </p>
                                    </div>
                                    {!notification.is_read && (
                                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
