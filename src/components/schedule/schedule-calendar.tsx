'use client'

import { useState, useMemo, useCallback } from 'react'
import { useLocale } from 'next-intl'
import {
    format, startOfMonth, endOfMonth, eachDayOfInterval,
    startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths,
    subMonths, isToday as isTodayFn
} from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight,
    Plus, Loader2,
    LayoutGrid, List, CheckCircle2,
    Users, AlertTriangle, X,
    CalendarDays, Timer
} from 'lucide-react'

import { cn, formatTime12h } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
    TooltipProvider
} from '@/components/ui/tooltip'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

import {
    useCalendarSchedules, useCreateSchedule,
    useUpdateSchedule, useDeleteSchedule, useUpdateScheduleStatus,
    useUpdateScheduleApproval
} from '@/hooks/use-schedule'
import { useClients } from '@/hooks/use-clients'
import { useMyAssignedClients } from '@/hooks/use-client-assignments'
import { useCurrentUser, useTeamMembers } from '@/hooks/use-users'
import { isScheduleOverdue } from '@/types/schedule'
import type { ScheduleWithRelations, CreateScheduleInput, ScheduleStatus } from '@/types/schedule'
import type { User } from '@/types/database'

import { StatsCard } from './stats-card'
import { ScheduleCard } from './schedule-card'
import { ScheduleListView } from './schedule-list-view'
import { ScheduleForm } from './schedule-form'
import { MissingItemsForm } from './missing-items-form'

// ============================================
// Schedule Calendar View
// ============================================

interface ScheduleCalendarProps {
    teamLeaderId: string
    canCreate?: boolean  // Hide create button for read-only mode (e.g., Account Manager)
    userRole?: string   // To customize form fields based on role
    simplifiedForm?: boolean // Hide endTime & team members (for content creators)
    hideMissingItems?: boolean // Hide missing items field in form (for team leader)
}

export function ScheduleCalendar({ teamLeaderId, canCreate = true, userRole, simplifiedForm = false, hideMissingItems = false }: ScheduleCalendarProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const dateLocale = isAr ? ar : enUS

    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [view, setView] = useState<'calendar' | 'list'>('calendar')
    const [formOpen, setFormOpen] = useState(false)
    const [missingFormOpen, setMissingFormOpen] = useState(false)
    const [editingSchedule, setEditingSchedule] = useState<ScheduleWithRelations | null>(null)
    const [statusFilter, setStatusFilter] = useState<ScheduleStatus | 'all' | 'overdue' | 'missing'>('all')
    const [clientFilter, setClientFilter] = useState<string>('all')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1

    const { data: currentUser } = useCurrentUser()
    const { data: schedules, isLoading } = useCalendarSchedules(teamLeaderId, year, month)
    const { data: teamMembers } = useTeamMembers(teamLeaderId)
    const { data: allClients } = useClients()
    const { data: assignedClients } = useMyAssignedClients(currentUser?.id)

    const isTeamMember = ['creator', 'designer', 'videographer', 'photographer', 'editor'].includes(currentUser?.role || '')
    const clients = isTeamMember ? assignedClients : allClients
    const createSchedule = useCreateSchedule()
    const updateSchedule = useUpdateSchedule()
    const deleteSchedule = useDeleteSchedule()
    const updateStatus = useUpdateScheduleStatus()
    const approveSchedule = useUpdateScheduleApproval()

    const isAccountManager = currentUser?.role === 'account_manager'

    // Build a lookup map for team members
    const memberMap = useMemo(() => {
        const map = new Map<string, Pick<User, 'id' | 'name' | 'avatar_url' | 'role'>>()
        teamMembers?.forEach(m => map.set(m.id, m as Pick<User, 'id' | 'name' | 'avatar_url' | 'role'>))
        return map
    }, [teamMembers])

    // Enrich schedules with member details
    const enrichedSchedules = useMemo(() => {
        return (schedules || []).map(s => ({
            ...s,
            assigned_member_details: (s.assigned_members || [])
                .map(id => memberMap.get(id))
                .filter(Boolean) as Pick<User, 'id' | 'name' | 'avatar_url' | 'role'>[],
        }))
    }, [schedules, memberMap])

    // Filter schedules
    const filteredSchedules = useMemo(() => {
        let filtered = enrichedSchedules
        
        // Apply status filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'scheduled') {
                // show non-overdue scheduled
                filtered = filtered.filter(s => s.status === 'scheduled' && !isScheduleOverdue(s))
            } else if (statusFilter === 'overdue') {
                filtered = filtered.filter(s => isScheduleOverdue(s))
            } else if (statusFilter === 'missing') {
                filtered = filtered.filter(s => s.missing_items && s.missing_items.trim() && s.missing_items_status !== 'resolved')
            } else {
                filtered = filtered.filter(s => s.status === statusFilter)
            }
        }
        
        // Apply client filter
        if (clientFilter !== 'all') {
            filtered = filtered.filter(s => s.client_id === clientFilter)
        }
        
        return filtered
    }, [enrichedSchedules, statusFilter, clientFilter])

    // Calendar grid days
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        const calStart = startOfWeek(monthStart, { weekStartsOn: 6 })
        const calEnd = endOfWeek(monthEnd, { weekStartsOn: 6 })
        return eachDayOfInterval({ start: calStart, end: calEnd })
    }, [currentDate])

    // Group schedules by date (for calendar display - uses filter)
    const schedulesByDate = useMemo(() => {
        const map = new Map<string, ScheduleWithRelations[]>()
        filteredSchedules.forEach(s => {
            const key = s.scheduled_date
            const arr = map.get(key) || []
            arr.push(s)
            map.set(key, arr)
        })
        return map
    }, [filteredSchedules])

    // Group ALL schedules by date (for selected day panel - no filter)
    const allSchedulesByDate = useMemo(() => {
        const map = new Map<string, ScheduleWithRelations[]>()
        enrichedSchedules.forEach(s => {
            const key = s.scheduled_date
            const arr = map.get(key) || []
            arr.push(s)
            map.set(key, arr)
        })
        return map
    }, [enrichedSchedules])

    // Selected day schedules (show ALL schedules for selected day, ignore filter)
    const selectedSchedules = selectedDate
        ? allSchedulesByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
        : []

    // Monthly stats
    const monthStats = useMemo(() => {
        const all = enrichedSchedules
        const overdueCount = all.filter(s => isScheduleOverdue(s)).length
        return {
            total: all.length,
            completed: all.filter(s => s.status === 'completed').length,
            overdue: overdueCount,
            upcoming: all.filter(s => s.status === 'scheduled' && !isScheduleOverdue(s)).length,
            inProgress: all.filter(s => s.status === 'in_progress').length,
            missingItems: all.filter(s => s.missing_items && s.missing_items.trim() && s.missing_items_status !== 'resolved').length,
        }
    }, [enrichedSchedules])

    const handleCreate = async (input: CreateScheduleInput & { team_leader_id: string; assigned_members?: string[] }) => {
        try {
            await createSchedule.mutateAsync(input)
            setFormOpen(false)
            toast.success(isAr ? '✅ تم إنشاء الجدولة بنجاح' : '✅ Schedule created successfully')
        } catch (error: any) {
            console.error('❌ Create schedule error:', error?.message, error?.code, error?.details, error?.hint, error)
            toast.error(
                isAr
                    ? `❌ فشل إنشاء الجدولة: ${error?.message || error?.code || 'خطأ غير معروف'}`
                    : `❌ Failed to create schedule: ${error?.message || error?.code || 'Unknown error'}`
            )
        }
    }

    const handleCreateMissingItems = async (input: CreateScheduleInput & { team_leader_id: string; assigned_members?: string[] }) => {
        try {
            await createSchedule.mutateAsync(input)
            setMissingFormOpen(false)
            toast.success(isAr ? '✅ تم إرسال النواقص بنجاح' : '✅ Missing items reported successfully')
        } catch (error: any) {
            console.error('Create missing items error:', error?.message, error?.code, error)
            toast.error(isAr ? '❌ فشل إرسال النواقص' : '❌ Failed to report missing items')
        }
    }

    const handleUpdate = async (input: Partial<CreateScheduleInput> & { team_leader_id?: string; assigned_members?: string[] }) => {
        if (!editingSchedule) return
        try {
            await updateSchedule.mutateAsync({ id: editingSchedule.id, ...input })
            setEditingSchedule(null)
            setFormOpen(false)
            toast.success(isAr ? '✅ تم تحديث الجدولة بنجاح' : '✅ Schedule updated successfully')
        } catch (error) {
            toast.error(isAr ? '❌ فشل تحديث الجدولة' : '❌ Failed to update schedule')
            console.error('Update schedule error:', error)
        }
    }

    const openDeleteDialog = (id: string) => {
        setScheduleToDelete(id)
        setDeleteDialogOpen(true)
    }

    const handleDelete = async () => {
        if (!scheduleToDelete) return
        try {
            await deleteSchedule.mutateAsync(scheduleToDelete)
            setDeleteDialogOpen(false)
            setScheduleToDelete(null)
            toast.success(isAr ? '✅ تم حذف الجدولة بنجاح' : '✅ Schedule deleted successfully')
        } catch (error) {
            toast.error(isAr ? '❌ فشل حذف الجدولة' : '❌ Failed to delete schedule')
            console.error('Delete schedule error:', error)
        }
    }

    const handleStatusChange = async (id: string, status: ScheduleStatus) => {
        try {
            await updateStatus.mutateAsync({ id, status })
            toast.success(isAr ? '✅ تم تحديث الحالة' : '✅ Status updated')
        } catch (error) {
            toast.error(isAr ? '❌ فشل تحديث الحالة' : '❌ Failed to update status')
            console.error('Update status error:', error)
        }
    }

    const handleApproval = async (id: string, approval_status: 'approved' | 'rejected', manager_notes?: string) => {
        try {
            await approveSchedule.mutateAsync({ id, approval_status, manager_notes })
            toast.success(isAr
                ? (approval_status === 'approved' ? '✅ تمت الموافقة على الجدولة' : '❌ تم رفض الجدولة')
                : (approval_status === 'approved' ? '✅ Schedule approved' : '❌ Schedule rejected'))
        } catch (error) {
            toast.error(isAr ? '❌ فشل تحديث حالة الموافقة' : '❌ Failed to update approval status')
            console.error('Approval error:', error)
        }
    }

    const openEditForm = useCallback((s: ScheduleWithRelations) => {
        setEditingSchedule(s)
        setFormOpen(true)
    }, [])

    const weekDays = useMemo(() => {
        const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        const daysAr = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة']
        return isAr ? daysAr : days
    }, [isAr])

    return (
        <TooltipProvider>
            <div className="space-y-6">
            {/* ===== Top Bar ===== */}
            <div className="flex flex-col gap-4">
                {/* Month Navigation and Filter */}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center bg-card border border-border rounded-xl overflow-hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-none hover:bg-primary/10"
                                onClick={() => setCurrentDate(d => subMonths(d, 1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="px-4 min-w-[160px] text-center">
                                <h2 className="text-base font-bold tracking-wide">
                                    {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
                                </h2>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-none hover:bg-primary/10"
                                onClick={() => setCurrentDate(d => addMonths(d, 1))}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()) }}
                        >
                            <CalendarDays className="h-3.5 w-3.5 me-1.5" />
                            {isAr ? 'اليوم' : 'Today'}
                        </Button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Client Filter */}
                        <Select value={clientFilter} onValueChange={setClientFilter}>
                            <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-xl border-border">
                                <div className="flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                    <SelectValue placeholder={isAr ? 'كل العملاء' : 'All Clients'} />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    {isAr ? 'كل العملاء' : 'All Clients'}
                                </SelectItem>
                                {clients?.map(client => (
                                    <SelectItem key={client.id} value={client.id}>
                                        {client.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Reset Filter Button - Show when client filter is active */}
                        {clientFilter !== 'all' && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl border-border hover:bg-muted"
                                onClick={() => setClientFilter('all')}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        )}

                        {/* View Toggle */}
                        <div className="flex bg-card border border-border rounded-xl overflow-hidden">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    'rounded-none px-3 h-9',
                                    view === 'calendar' && 'bg-primary text-primary-foreground hover:bg-primary/90'
                                )}
                                onClick={() => setView('calendar')}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    'rounded-none px-3 h-9',
                                    view === 'list' && 'bg-primary text-primary-foreground hover:bg-primary/90'
                                )}
                                onClick={() => setView('list')}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* New Schedule */}
                        {canCreate && (
                            <Button
                                size="sm"
                                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                                onClick={() => { setEditingSchedule(null); if (!selectedDate) setSelectedDate(new Date()); setFormOpen(true) }}
                            >
                                <Plus className="h-4 w-4 me-1.5" />
                                {isAr ? 'جدولة جديدة' : 'New Schedule'}
                            </Button>
                        )}

                        {/* Edit/Create Dialog (always rendered so edit works even when canCreate=false) */}
                        <Dialog open={formOpen} onOpenChange={setFormOpen}>
                            <DialogContent className="max-w-lg border-primary/20">
                                <DialogHeader>
                                    <DialogTitle className="text-lg">
                                        {editingSchedule
                                            ? (isAr ? '✏️ تعديل الجدول' : '✏️ Edit Schedule')
                                            : (isAr ? '📅 جدولة جديدة' : '📅 New Schedule')}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {editingSchedule
                                            ? (isAr ? 'تعديل تفاصيل الجدولة' : 'Edit schedule details')
                                            : (isAr ? 'إضافة جدولة جديدة للفريق' : 'Add a new schedule for your team')}
                                    </DialogDescription>
                                </DialogHeader>
                                <ScheduleForm
                                    teamLeaderId={teamLeaderId}
                                    initialDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
                                    schedule={editingSchedule}
                                    isLoading={createSchedule.isPending || updateSchedule.isPending}
                                    onSubmit={editingSchedule ? handleUpdate : handleCreate}
                                    defaultClientId={clientFilter !== 'all' ? clientFilter : undefined}
                                    userRole={userRole}
                                    simplifiedForm={simplifiedForm}
                                    hideMissingItems={hideMissingItems}
                                />
                            </DialogContent>
                        </Dialog>

                        {/* Missing Items - separate form */}
                        {canCreate && !hideMissingItems && (
                        <Dialog open={missingFormOpen} onOpenChange={setMissingFormOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                                >
                                    <AlertTriangle className="h-4 w-4 me-1.5" />
                                    {isAr ? 'نواقص' : 'Missing Items'}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg border-amber-500/20">
                                <DialogHeader>
                                    <DialogTitle className="text-lg">
                                        {isAr ? '⚠️ إبلاغ عن نواقص' : '⚠️ Report Missing Items'}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {isAr ? 'أضف النواقص المطلوبة وسيتم إرسالها للمسؤول' : 'Add required missing items and they will be sent to the manager'}
                                    </DialogDescription>
                                </DialogHeader>
                                <MissingItemsForm
                                    teamLeaderId={teamLeaderId}
                                    initialDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
                                    isLoading={createSchedule.isPending}
                                    onSubmit={handleCreateMissingItems}
                                    defaultClientId={clientFilter !== 'all' ? clientFilter : undefined}
                                />
                            </DialogContent>
                        </Dialog>
                        )}
                    </div>
                </div>
            </div>

            {/* ===== Stats Cards ===== */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatsCard
                    icon={<CalendarIcon className="h-5 w-5" />}
                    label={isAr ? 'إجمالي' : 'Total'}
                    value={monthStats.total}
                    color="primary"
                    active={statusFilter === 'all'}
                    onClick={() => setStatusFilter('all')}
                />
                <StatsCard
                    icon={<Timer className="h-5 w-5" />}
                    label={isAr ? 'مجدول' : 'Scheduled'}
                    value={monthStats.upcoming}
                    color="sky"
                    active={statusFilter === 'scheduled'}
                    onClick={() => setStatusFilter('scheduled')}
                />
                <StatsCard
                    icon={<AlertTriangle className="h-5 w-5" />}
                    label={isAr ? 'النواقص' : 'Missing'}
                    value={monthStats.missingItems}
                    color="orange"
                    active={statusFilter === 'missing'}
                    onClick={() => setStatusFilter(statusFilter === 'missing' ? 'all' : 'missing')}
                    pulse={monthStats.missingItems > 0}
                />
                <StatsCard
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    label={isAr ? 'مكتمل' : 'Done'}
                    value={monthStats.completed}
                    color="emerald"
                    active={statusFilter === 'completed'}
                    onClick={() => setStatusFilter('completed')}
                />
                <StatsCard
                    icon={<AlertTriangle className="h-5 w-5" />}
                    label={isAr ? 'متأخر' : 'Overdue'}
                    value={monthStats.overdue}
                    color="red"
                    active={statusFilter === 'overdue'}
                    onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
                    pulse={monthStats.overdue > 0}
                />
            </div>

            {/* ===== Main Content ===== */}
            {isLoading ? (
                <Card className="border-border/50">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-7 gap-2">
                            {[...Array(35)].map((_, i) => (
                                <Skeleton key={i} className="h-24 rounded-xl" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ) : view === 'calendar' ? (
                <div className="space-y-4">
                    {/* Calendar */}
                    <Card className="border-border/50 overflow-hidden">
                        <CardContent className="p-3 sm:p-4">
                            {/* Week day headers */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {weekDays.map(day => (
                                    <div
                                        key={day}
                                        className="text-center text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider py-2"
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map(day => {
                                    const dateKey = format(day, 'yyyy-MM-dd')
                                    const daySchedules = schedulesByDate.get(dateKey) || []
                                    const allDaySchedules = allSchedulesByDate.get(dateKey) || []
                                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                                    const isCurrentMonth = isSameMonth(day, currentDate)
                                    const isToday = isTodayFn(day)
                                    const hasOverdue = allDaySchedules.some(s => isScheduleOverdue(s))
                                    const hasCompleted = allDaySchedules.some(s => s.status === 'completed')
                                    const hasMissingItems = allDaySchedules.some(s => s.missing_items && s.missing_items.trim() && s.missing_items_status !== 'resolved')

                                    return (
                                        <button
                                            key={dateKey}
                                            onClick={() => setSelectedDate(day)}
                                            className={cn(
                                                'relative min-h-[100px] p-2 rounded-xl border transition-all duration-200 text-start group',
                                                isCurrentMonth
                                                    ? 'bg-card/50 hover:bg-card'
                                                    : 'bg-background/30 opacity-40',
                                                isSelected
                                                    ? 'ring-2 ring-primary border-primary/50 bg-primary/5'
                                                    : 'border-border/30',
                                                isToday && !isSelected && 'border-primary/40',
                                                hasOverdue && !isSelected && 'border-red-500/30',
                                                !hasOverdue && hasMissingItems && !isSelected && 'border-orange-500/30',
                                            )}
                                        >
                                            {/* Day number */}
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={cn(
                                                    'text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
                                                    isToday
                                                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                                                        : isSelected
                                                            ? 'text-primary'
                                                            : 'text-muted-foreground group-hover:text-foreground'
                                                )}>
                                                    {format(day, 'd')}
                                                </span>
                                                {allDaySchedules.length > 0 && (
                                                    <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
                                                        {allDaySchedules.length}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Schedule pills */}
                                            <div className="space-y-1">
                                                {daySchedules.slice(0, 2).map(s => {
                                                    const overdue = isScheduleOverdue(s)
                                                    const clientName = s.client?.name || s.company_name || s.title
                                                    return (
                                                        <div
                                                            key={s.id}
                                                            className={cn(
                                                                'flex flex-col gap-0.5 text-[10px] px-1.5 py-1 rounded-md font-medium border-s-2',
                                                                overdue
                                                                    ? 'bg-red-500/10 text-red-400 border-red-500'
                                                                    : s.status === 'completed'
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500'
                                                                        : s.status === 'in_progress'
                                                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500'
                                                                            : (s.missing_items && s.missing_items.trim() && s.missing_items_status !== 'resolved')
                                                                                ? 'bg-orange-500/10 text-orange-400 border-orange-500'
                                                                                : 'bg-sky-500/10 text-sky-300 border-sky-500'
                                                            )}
                                                        >
                                                            {/* Row 1: type badge + time */}
                                                            <div className="flex items-center gap-1">
                                                                {s.schedule_type && (
                                                                    <span className={cn(
                                                                        'shrink-0 text-[9px] px-1 py-0.5 rounded font-bold leading-none',
                                                                        s.schedule_type === 'reels'
                                                                            ? 'bg-violet-500/20 text-violet-400'
                                                                            : 'bg-blue-500/20 text-blue-400'
                                                                    )}>
                                                                        {s.schedule_type === 'reels'
                                                                            ? (isAr ? 'ريلز' : 'Reels')
                                                                            : (isAr ? 'بوست' : 'Post')}
                                                                    </span>
                                                                )}
                                                                {s.start_time && (
                                                                    <span className="opacity-80 shrink-0">{formatTime12h(s.start_time)}</span>
                                                                )}
                                                            </div>
                                                            {/* Row 2: client name */}
                                                            <span className="truncate font-semibold">{clientName}</span>
                                                        </div>
                                                    )
                                                })}
                                                {daySchedules.length > 2 && (
                                                    <div className="text-[10px] text-muted-foreground/60 font-medium px-1.5">
                                                        +{daySchedules.length - 2} {isAr ? 'أخرى' : 'more'}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Bottom accent for days with events */}
                                            {allDaySchedules.length > 0 && (
                                                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                                                    {hasOverdue && <div className="w-1 h-1 rounded-full bg-red-500" />}
                                                    {hasCompleted && <div className="w-1 h-1 rounded-full bg-emerald-500" />}
                                                    {allDaySchedules.some(s => s.status === 'in_progress') && <div className="w-1 h-1 rounded-full bg-amber-400" />}
                                                    {hasMissingItems && <div className="w-1 h-1 rounded-full bg-orange-500" />}
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Selected Day Panel */}
                    {selectedDate && (
                        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-lg shadow-primary/10 animate-in fade-in slide-in-from-top-4 duration-300">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shadow-inner">
                                            <CalendarIcon className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">
                                                {format(selectedDate, 'EEEE', { locale: dateLocale })}
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground">
                                                {format(selectedDate, 'd MMMM yyyy', { locale: dateLocale })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
                                            {selectedSchedules.length} {isAr ? 'مواعيد' : 'events'}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => setSelectedDate(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {selectedSchedules.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                                            <CalendarIcon className="h-6 w-6 text-muted-foreground/30" />
                                        </div>
                                        <p className="text-sm text-muted-foreground font-semibold">
                                            {isAr ? 'لا توجد مواعيد في هذا اليوم' : 'No events scheduled for this day'}
                                        </p>
                                        {canCreate && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-3 rounded-xl"
                                                onClick={() => { setEditingSchedule(null); setFormOpen(true) }}
                                            >
                                                <Plus className="h-3.5 w-3.5 me-1.5" />
                                                {isAr ? 'إضافة جدولة' : 'Add Schedule'}
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <ScrollArea className="max-h-[600px]">
                                        <div className="space-y-3 pe-1">
                                            {selectedSchedules.map(s => (
                                                <ScheduleCard
                                                    key={s.id}
                                                    schedule={s}
                                                    isAr={isAr}
                                                    memberMap={memberMap}
                                                    onEdit={() => openEditForm(s)}
                                                    onDelete={() => openDeleteDialog(s.id)}
                                                    onStatusChange={(status) => handleStatusChange(s.id, status)}
                                                    isAccountManager={isAccountManager}
                                                    onApproval={handleApproval}
                                                />
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : (
                <ScheduleListView
                    schedules={filteredSchedules}
                    isAr={isAr}
                    memberMap={memberMap}
                    onEdit={openEditForm}
                    onDelete={openDeleteDialog}
                    onStatusChange={handleStatusChange}
                    isAccountManager={isAccountManager}
                    onApproval={handleApproval}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {isAr ? '⚠️ تأكيد الحذف' : '⚠️ Confirm Deletion'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {isAr 
                                ? 'هل أنت متأكد من حذف هذه الجدولة؟ لا يمكن التراجع عن هذا الإجراء.'
                                : 'Are you sure you want to delete this schedule? This action cannot be undone.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteSchedule.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                isAr ? 'حذف' : 'Delete'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
        </TooltipProvider>
    )
}
