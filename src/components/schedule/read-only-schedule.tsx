'use client'

import { useState, useMemo } from 'react'
import { useLocale } from 'next-intl'
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday as isTodayFn,
} from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    MapPin,
    Building2,
    Users,
    Briefcase,
    Filter,
    X,
    FolderOpen,
    ListTodo,
    AlertTriangle,
    ShieldCheck,
    Link2,
    ImageIcon,
    MessageSquare,
    CheckCircle2,
    XCircle,
} from 'lucide-react'

import { cn, formatTime12h } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

function isVideoUrl(url: string) {
    return /\.(mp4|webm|mov|avi|mkv|ogv)(\?.*)?$/i.test(url)
}
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { useMySchedules, useClientSchedules, useCalendarSchedules } from '@/hooks/use-schedule'
import { useUsers, getRoleLabel } from '@/hooks/use-users'
import { getScheduleStatusConfig, isScheduleOverdue, OVERDUE_CONFIG } from '@/types/schedule'
import type { ScheduleWithRelations } from '@/types/schedule'
import type { User } from '@/types/database'

interface ReadOnlyScheduleViewProps {
    userId?: string
    clientId?: string
    teamLeaderId?: string
    title?: string
}

export function ReadOnlyScheduleView({ userId, clientId, teamLeaderId, title }: ReadOnlyScheduleViewProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const dateLocale = isAr ? ar : enUS

    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [clientFilter, setClientFilter] = useState<string>('all')
    const [lightbox, setLightbox] = useState<{ url: string; type: 'image' | 'video'; list: string[]; index: number } | null>(null)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1

    // Fetch schedules based on type
    const { data: mySchedules, isLoading: myLoading } = useMySchedules(
        userId || '',
        year,
        month
    )
    const { data: clientSchedules, isLoading: clientLoading } = useClientSchedules(
        clientId || '',
        year,
        month
    )
    const { data: teamSchedules, isLoading: teamLoading } = useCalendarSchedules(
        teamLeaderId || '',
        year,
        month
    )

    const rawSchedules = teamLeaderId ? teamSchedules : userId ? mySchedules : clientSchedules
    const isLoading = teamLeaderId ? teamLoading : userId ? myLoading : clientLoading

    // Extract unique clients for filter dropdown
    const uniqueClients = useMemo(() => {
        const map = new Map<string, { id: string; label: string }>()
        rawSchedules?.forEach((s) => {
            if (s.client) {
                const label = s.client.name
                if (label) map.set(s.client.id, { id: s.client.id, label })
            }
        })
        return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
    }, [rawSchedules])

    // Apply client filter
    const schedules = useMemo(() => {
        if (clientFilter === 'all') return rawSchedules
        return rawSchedules?.filter(s => s.client?.id === clientFilter) ?? []
    }, [rawSchedules, clientFilter])

    // Fetch all users for member name resolution
    const { data: allUsers } = useUsers()
    const memberMap = useMemo(() => {
        const map = new Map<string, Pick<User, 'id' | 'name' | 'avatar_url' | 'role'>>()
        allUsers?.forEach(u => map.set(u.id, u))
        return map
    }, [allUsers])

    // Calendar grid
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        const calStart = startOfWeek(monthStart, { weekStartsOn: 6 })
        const calEnd = endOfWeek(monthEnd, { weekStartsOn: 6 })
        return eachDayOfInterval({ start: calStart, end: calEnd })
    }, [currentDate])

    const schedulesByDate = useMemo(() => {
        const map = new Map<string, ScheduleWithRelations[]>()
        schedules?.forEach((s) => {
            const key = s.scheduled_date
            const arr = map.get(key) || []
            arr.push(s)
            map.set(key, arr)
        })
        return map
    }, [schedules])

    const selectedSchedules = selectedDate
        ? schedulesByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
        : []

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const handleToday = () => setCurrentDate(new Date())

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <CalendarIcon className="h-6 w-6 text-primary" />
                    <h2 className="text-xl sm:text-2xl font-bold">
                        {title || (isAr ? 'الجدول الزمني' : 'Schedule')}
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleToday}>
                        {isAr ? 'اليوم' : 'Today'}
                    </Button>
                    <div className="text-sm font-medium min-w-[140px] text-center">
                        {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Client Filter */}
            {uniqueClients.length > 0 && (
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Select value={clientFilter} onValueChange={setClientFilter}>
                        <SelectTrigger className="w-[200px] sm:w-[250px] h-9 text-sm">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground me-1.5" />
                            <SelectValue placeholder={isAr ? 'كل العملاء' : 'All Clients'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                {isAr ? 'كل العملاء' : 'All Clients'}
                            </SelectItem>
                            {uniqueClients.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {clientFilter !== 'all' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setClientFilter('all')}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            )}

            {/* Calendar Grid */}
            <Card>
                <CardContent className="p-4">
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-1 sm:gap-2">
                            {/* Week days header - starts Saturday (weekStartsOn: 6) */}
                            {/* Jan 6, 2024 = Sat, Jan 7 = Sun, ..., Jan 12 = Fri */}
                            {[6, 7, 8, 9, 10, 11, 12].map((day) => {
                                const dayDate = new Date(2024, 0, day)
                                return (
                                    <div
                                        key={day}
                                        className="text-center text-xs sm:text-sm font-medium text-muted-foreground p-1 sm:p-2"
                                    >
                                        {format(dayDate, 'EEE', { locale: dateLocale })}
                                    </div>
                                )
                            })}

                            {/* Calendar cells */}
                            {calendarDays.map((day) => {
                                const dateKey = format(day, 'yyyy-MM-dd')
                                const daySchedules = schedulesByDate.get(dateKey) || []
                                const isCurrentMonth = isSameMonth(day, currentDate)
                                const isToday = isTodayFn(day)
                                const isSelected = selectedDate && isSameDay(day, selectedDate)
                                const hasOverdue = daySchedules.some(s => isScheduleOverdue(s))

                                return (
                                    <button
                                        key={dateKey}
                                        onClick={() => {
                                            if (daySchedules.length > 0) {
                                                setSelectedDate(day)
                                            }
                                        }}
                                        className={cn(
                                            'min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 border rounded-md text-start transition-all',
                                            'hover:bg-muted/50',
                                            isCurrentMonth ? 'bg-background' : 'bg-muted/20',
                                            isToday && 'ring-2 ring-primary',
                                            isSelected && 'bg-primary/10',
                                            hasOverdue && !isSelected && 'border-red-300 dark:border-red-800',
                                            daySchedules.length > 0 && 'cursor-pointer'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'text-xs sm:text-sm font-medium mb-1',
                                                !isCurrentMonth && 'text-muted-foreground',
                                                isToday && 'text-primary font-bold'
                                            )}
                                        >
                                            {format(day, 'd')}
                                        </div>
                                        <div className="space-y-0.5">
                                            {daySchedules.slice(0, 2).map((schedule) => {
                                                const overdue = isScheduleOverdue(schedule)
                                                const deptEmoji = schedule.department === 'photography' ? '📸' : schedule.department === 'content' ? '✍️' : ''
                                                return (
                                                    <div
                                                        key={schedule.id}
                                                        className={cn(
                                                            'text-[10px] sm:text-xs p-0.5 sm:p-1 rounded truncate font-medium',
                                                            overdue
                                                                ? 'bg-red-500/15 text-red-700 dark:text-red-400'
                                                                : schedule.status === 'completed'
                                                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                                                    : getScheduleStatusConfig(schedule.status).bgColor
                                                        )}
                                                    >
                                                        {deptEmoji} {schedule.start_time ? formatTime12h(schedule.start_time) : ''} {schedule.schedule_type ? (schedule.schedule_type === 'reels' ? '📹' : '📝') + ' ' : ''}{schedule.title}
                                                    </div>
                                                )
                                            })}
                                            {daySchedules.length > 2 && (
                                                <div className="text-[10px] text-muted-foreground">
                                                    +{daySchedules.length - 2} {isAr ? 'أخرى' : 'more'}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Selected Day Details */}
            {selectedDate && selectedSchedules.length > 0 && (
                <div className="space-y-3">
                    {/* Day header */}
                    <div className="flex items-center gap-2 px-1">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">
                            {format(selectedDate, 'PPP', { locale: dateLocale })}
                        </h3>
                        <Badge variant="secondary" className="ms-auto text-xs">
                            {selectedSchedules.length} {isAr ? 'عنصر' : 'item(s)'}
                        </Badge>
                    </div>

                    <ScrollArea className="h-[520px] sm:h-[680px] pe-1">
                        <div className="space-y-3 pb-2">
                            {selectedSchedules.map((schedule) => {
                                const overdue = isScheduleOverdue(schedule)
                                const statusCfg = overdue ? OVERDUE_CONFIG : getScheduleStatusConfig(schedule.status)
                                const members = (schedule.assigned_members || [])
                                    .map(id => memberMap.get(id))
                                    .filter(Boolean) as Pick<User, 'id' | 'name' | 'avatar_url' | 'role'>[]

                                // Accent color based on status
                                const accentColor = overdue
                                    ? 'bg-red-500'
                                    : schedule.status === 'completed'
                                        ? 'bg-emerald-500'
                                        : schedule.status === 'in_progress'
                                            ? 'bg-amber-500'
                                            : schedule.status === 'cancelled'
                                                ? 'bg-slate-400'
                                                : 'bg-blue-500'

                                const cardBg = overdue
                                    ? 'border-red-400 dark:border-red-700'
                                    : schedule.status === 'completed'
                                        ? 'border-emerald-300 dark:border-emerald-700'
                                        : schedule.status === 'in_progress'
                                            ? 'border-amber-300 dark:border-amber-700'
                                            : schedule.status === 'cancelled'
                                                ? 'border-slate-300 dark:border-slate-600'
                                                : 'border-border'

                                return (
                                    <div
                                        key={schedule.id}
                                        className={cn(
                                            'rounded-xl border shadow-sm overflow-hidden transition-colors',
                                            cardBg
                                        )}
                                    >
                                        {/* Colored top bar */}
                                        <div className={cn('h-1.5 w-full', accentColor)} />

                                        <div className="p-5 space-y-4">
                                            {/* ── Title row ── */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-base leading-tight mb-1.5 text-foreground">
                                                        {schedule.title}
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {/* Status badge */}
                                                        <span className={cn(
                                                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold',
                                                            overdue
                                                                ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                                                : schedule.status === 'completed'
                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                                    : schedule.status === 'in_progress'
                                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                                                        : schedule.status === 'cancelled'
                                                                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                                                        )}>
                                                            <span className={cn('w-2 h-2 rounded-full', accentColor)} />
                                                            {overdue
                                                                ? (isAr ? 'متأخر' : 'Overdue')
                                                                : (isAr ? statusCfg.labelAr : statusCfg.label)}
                                                        </span>
                                                        {/* Department */}
                                                        {schedule.department && (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
                                                                <Briefcase className="h-2.5 w-2.5" />
                                                                {isAr
                                                                    ? schedule.department === 'photography' ? 'التصوير'
                                                                        : schedule.department === 'content' ? 'المحتوى'
                                                                            : schedule.department === 'design' ? 'التصميم'
                                                                                : schedule.department === 'video' ? 'الفيديو'
                                                                                    : schedule.department
                                                                    : schedule.department.charAt(0).toUpperCase() + schedule.department.slice(1)}
                                                            </span>
                                                        )}
                                                        {/* Type */}
                                                        {schedule.schedule_type && (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
                                                                {schedule.schedule_type === 'reels' ? '📹' : '📝'}
                                                                {schedule.schedule_type === 'reels' ? (isAr ? 'ريلز' : 'Reels') : (isAr ? 'بوست' : 'Post')}
                                                            </span>
                                                        )}
                                                        {/* Approval */}
                                                        {schedule.approval_status && schedule.approval_status !== 'pending' && (
                                                            <span className={cn(
                                                                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold',
                                                                schedule.approval_status === 'approved'
                                                                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400'
                                                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                                            )}>
                                                                {schedule.approval_status === 'approved'
                                                                    ? <CheckCircle2 className="h-2.5 w-2.5" />
                                                                    : <XCircle className="h-2.5 w-2.5" />}
                                                                {isAr
                                                                    ? schedule.approval_status === 'approved' ? 'معتمد' : 'مرفوض'
                                                                    : schedule.approval_status === 'approved' ? 'Approved' : 'Rejected'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Meta chips row ── */}
                                            {(schedule.start_time || schedule.location || schedule.client || schedule.company_name || schedule.project || schedule.task) && (
                                                <div className="flex flex-wrap gap-2">
                                                    {schedule.start_time && (
                                                        <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary rounded-full px-3 py-1.5 font-medium">
                                                            <Clock className="h-3.5 w-3.5 shrink-0" />
                                                            <span>{formatTime12h(schedule.start_time)}</span>
                                                            {schedule.end_time && <span className="opacity-70">→ {formatTime12h(schedule.end_time)}</span>}
                                                        </div>
                                                    )}
                                                    {schedule.client && (
                                                        <div className="flex items-center gap-2 text-sm bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-full px-3 py-1.5 font-medium">
                                                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                                                            <span>{schedule.client.name}</span>
                                                        </div>
                                                    )}
                                                    {schedule.company_name && schedule.company_name !== schedule.client?.name && (
                                                        <div className="flex items-center gap-2 text-sm bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 rounded-full px-3 py-1.5 font-medium">
                                                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                                                            <span>{schedule.company_name}</span>
                                                        </div>
                                                    )}
                                                    {schedule.location && (
                                                        <div className="flex items-center gap-2 text-sm bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-full px-3 py-1.5 font-medium">
                                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                            <span>{schedule.location}</span>
                                                        </div>
                                                    )}
                                                    {schedule.project && (
                                                        <div className="flex items-center gap-2 text-sm bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 rounded-full px-3 py-1.5 font-medium">
                                                            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                                                            <span>{schedule.project.name}</span>
                                                        </div>
                                                    )}
                                                    {schedule.task && (
                                                        <div className="flex items-center gap-2 text-sm bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 rounded-full px-3 py-1.5 font-medium">
                                                            <ListTodo className="h-3.5 w-3.5 shrink-0" />
                                                            <span>{schedule.task.title}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* ── Assigned Members ── */}
                                            {members.length > 0 && (
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        <div className="flex -space-x-2 rtl:space-x-reverse">
                                                            {members.slice(0, 6).map(m => (
                                                                <Avatar key={m.id} className="h-8 w-8 border-2 border-background ring-1 ring-muted">
                                                                <AvatarImage src={m.avatar_url || ''} />
                                                                    <AvatarFallback className="text-xs bg-primary/20 font-bold text-primary">
                                                                    {m.name?.charAt(0) || '?'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        ))}
                                                    </div>
                                                    <span className="text-sm text-muted-foreground font-medium">
                                                        {members.map(m => m.name?.split(' ')[0]).join('، ')}
                                                    </span>
                                                </div>
                                            )}

                                            {/* ── Description ── */}
                                            {schedule.description && (
                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                    {schedule.description}
                                                </p>
                                            )}

                                            {/* ── Notes ── */}
                                            {schedule.notes && (
                                                <div className="flex gap-2 border-s-2 border-primary/40 ps-3 py-1">
                                                    <p className="text-xs text-muted-foreground italic leading-relaxed">{schedule.notes}</p>
                                                </div>
                                            )}

                                            {/* ── Manager Notes ── */}
                                            {schedule.manager_notes && (
                                                <div className="flex gap-2 bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
                                                    <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-semibold text-primary mb-0.5">{isAr ? 'ملاحظة المدير' : 'Manager Note'}</p>
                                                        <p className="text-xs text-foreground/80 leading-relaxed">{schedule.manager_notes}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Missing Items ── */}
                                            {schedule.missing_items && (
                                                <div className={cn(
                                                    'flex gap-2 rounded-lg px-3 py-2 border',
                                                    schedule.missing_items_status === 'resolved'
                                                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900'
                                                        : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900'
                                                )}>
                                                    <AlertTriangle className={cn(
                                                        'h-3.5 w-3.5 shrink-0 mt-0.5',
                                                        schedule.missing_items_status === 'resolved' ? 'text-emerald-500' : 'text-amber-500'
                                                    )} />
                                                    <div className="min-w-0">
                                                        <p className={cn(
                                                            'text-[11px] font-semibold mb-0.5',
                                                            schedule.missing_items_status === 'resolved'
                                                                ? 'text-emerald-700 dark:text-emerald-400'
                                                                : 'text-amber-700 dark:text-amber-400'
                                                        )}>
                                                            {isAr ? 'عناصر ناقصة' : 'Missing Items'}
                                                            {schedule.missing_items_status === 'resolved' && (
                                                                <span className="ms-1.5 font-normal opacity-80">{isAr ? '· تم الحل ✓' : '· Resolved ✓'}</span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-foreground/70 leading-relaxed">{schedule.missing_items}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Links ── */}
                                            {schedule.links && schedule.links.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                                        <Link2 className="h-3 w-3" />
                                                        {isAr ? 'روابط' : 'Links'}
                                                    </p>
                                                    <div className="space-y-1.5">
                                                        {schedule.links.map((link, i) => (
                                                            <a
                                                                key={i}
                                                                href={link.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-start gap-2 group rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 px-3 py-2 transition-colors"
                                                            >
                                                                <Link2 className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                                                                <div className="min-w-0">
                                                                    <p className="text-xs text-primary group-hover:underline truncate">{link.url}</p>
                                                                    {link.comment && (
                                                                        <p className="text-[10px] text-muted-foreground mt-0.5">{link.comment}</p>
                                                                    )}
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Images & Videos ── */}
                                            {schedule.images && schedule.images.length > 0 && (() => {
                                                const mediaList = schedule.images
                                                const images = mediaList.filter(u => !isVideoUrl(u))
                                                const videos = mediaList.filter(u => isVideoUrl(u))
                                                return (
                                                    <div className="space-y-3">
                                                        {images.length > 0 && (
                                                            <div className="space-y-2">
                                                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                                                    <ImageIcon className="h-3 w-3" />
                                                                    {isAr ? 'صور' : 'Images'} ({images.length})
                                                                </p>
                                                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                                    {images.map((img, i) => (
                                                                        <button
                                                                            key={i}
                                                                            onClick={() => setLightbox({ url: img, type: 'image', list: images, index: i })}
                                                                            className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary bg-muted shadow-sm transition-all hover:shadow-md"
                                                                        >
                                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                            <img
                                                                                src={img}
                                                                                alt={`${isAr ? 'صورة' : 'Image'} ${i + 1}`}
                                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                            />
                                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                                <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {videos.length > 0 && (
                                                            <div className="space-y-2">
                                                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                                                    🎬 {isAr ? 'فيديوهات' : 'Videos'} ({videos.length})
                                                                </p>
                                                                <div className="space-y-2">
                                                                    {videos.map((vid, i) => (
                                                                        <div key={i} className="rounded-xl overflow-hidden border bg-black shadow-sm">
                                                                            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                                                                            <video
                                                                                src={vid}
                                                                                controls
                                                                                preload="metadata"
                                                                                className="w-full max-h-[280px] object-contain"
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </div>
            )}

            {/* Lightbox Dialog */}
            {lightbox && (
                <Dialog open onOpenChange={() => setLightbox(null)}>
                    <DialogContent className="max-w-3xl p-2 bg-black/95 border-none">
                        <DialogTitle className="sr-only">{isAr ? 'معاينة الصورة' : 'Image preview'}</DialogTitle>
                        <div className="relative flex items-center justify-center min-h-[300px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={lightbox.url}
                                alt={isAr ? 'معاينة' : 'Preview'}
                                className="max-h-[80vh] max-w-full rounded object-contain"
                            />
                        </div>
                        {lightbox.list.length > 1 && (
                            <div className="flex items-center justify-center gap-3 pt-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-white/10"
                                    disabled={lightbox.index === 0}
                                    onClick={() => {
                                        const prev = lightbox.index - 1
                                        setLightbox({ ...lightbox, url: lightbox.list[prev], index: prev })
                                    }}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs text-white/60">
                                    {lightbox.index + 1} / {lightbox.list.length}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-white/10"
                                    disabled={lightbox.index === lightbox.list.length - 1}
                                    onClick={() => {
                                        const next = lightbox.index + 1
                                        setLightbox({ ...lightbox, url: lightbox.list[next], index: next })
                                    }}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            )}

            {!isLoading && schedules?.length === 0 && (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
                            <p className="text-muted-foreground">
                                {isAr
                                    ? 'لا توجد مواعيد مجدولة هذا الشهر'
                                    : 'No scheduled appointments this month'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
