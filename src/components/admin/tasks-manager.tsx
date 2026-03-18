'use client'

import { useState, useMemo, useCallback, memo, useEffect } from 'react'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { useAdminTasks, useAdminTasksStats, useAdminTasksExport, useTaskDetails } from '@/hooks/use-tasks'
import { useTasksRealtime } from '@/hooks/use-realtime'
import { useDebounce } from '@/hooks'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Loader2,
    Download,
    Search,
    FileText,
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    X,
    SlidersHorizontal,
    Building2,
    FileSpreadsheet,
    Eye,
    User,
    Clock,
    MapPin,
    Tag,
    Layers,
    MessageSquare,
    Paperclip,
    FolderOpen,
    CalendarClock,
    Hash,
    AlertTriangle,
    RefreshCw,
    ExternalLink,
    Star
} from 'lucide-react'
import { exportTasksToCSV, exportTasksToPDF, type TaskExportData } from '@/lib/export-utils'
import { getFileIcon, formatFileSize } from '@/lib/file-utils'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import type { TaskFilters, TaskWithRelations } from '@/types/task'
import {
    DEPARTMENT_OPTIONS,
    STATUS_OPTIONS,
    PRIORITY_OPTIONS,
    TASK_TYPE_OPTIONS,
} from '@/lib/constants/admin'
import { StatusBadge, PriorityBadge, DepartmentBadge } from '@/components/shared/task-badges'

// ============================================
// Utility Functions
// ============================================

/**
 * Safely format a date string, returning fallback if invalid
 */
function formatTaskDate(dateString: string | null | undefined, formatStr: string = 'dd/MM/yyyy'): string {
    if (!dateString) return '-'
    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return '-'
        return format(date, formatStr)
    } catch {
        return '-'
    }
}

// ============================================
// Custom Hooks for Performance
// ============================================

function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') return

        const mql = window.matchMedia(query)
        setMatches(mql.matches)
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
        mql.addEventListener('change', handler)
        return () => mql.removeEventListener('change', handler)
    }, [query])
    return matches
}

const ROWS_PER_PAGE = 15

export function TasksManager() {
    const t = useTranslations('tasksManager')
    const locale = useLocale() as 'ar' | 'en'
    // Real-time subscription for live task updates
    useTasksRealtime()

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [departmentFilter, setDepartmentFilter] = useState('all')
    const [priorityFilter, setPriorityFilter] = useState('all')
    const [taskTypeFilter, setTaskTypeFilter] = useState('all')
    const [date, setDate] = useState<DateRange | undefined>()
    const [currentPage, setCurrentPage] = useState(1)
    const [showFilters, setShowFilters] = useState(false)
    const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null)
    const isSmallScreen = useMediaQuery('(max-width: 639px)')

    // Debounce search to avoid excessive API calls
    const debouncedSearch = useDebounce(search, 400)

    // Build filters object ΓÇö only include non-default values
    const filters = useMemo<TaskFilters>(() => ({
        search: debouncedSearch.length > 2 ? debouncedSearch : undefined,
        status: statusFilter === 'all' ? undefined : (statusFilter as any),
        department: departmentFilter === 'all' ? undefined : (departmentFilter as any),
        priority: priorityFilter === 'all' ? undefined : (priorityFilter as any),
        task_type: taskTypeFilter === 'all' ? undefined : (taskTypeFilter as any),
        dateFrom: date?.from?.toISOString(),
        dateTo: date?.to?.toISOString(),
    }), [debouncedSearch, statusFilter, departmentFilter, priorityFilter, taskTypeFilter, date])

    // Server-side paginated data
    const { data: paginatedResult, isLoading, error, isFetching } = useAdminTasks(filters, currentPage, ROWS_PER_PAGE)
    // Lightweight stats query (separate so stats don't flicker on page change)
    const { data: stats } = useAdminTasksStats(filters)
    // Export data (only fetched when requested)
    const { data: exportData } = useAdminTasksExport(filters, isExporting !== null)

    const tasks = paginatedResult?.data ?? []
    const totalCount = paginatedResult?.totalCount ?? 0
    const totalPages = Math.ceil(totalCount / ROWS_PER_PAGE)

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0
        if (statusFilter !== 'all') count++
        if (departmentFilter !== 'all') count++
        if (priorityFilter !== 'all') count++
        if (taskTypeFilter !== 'all') count++
        if (date?.from) count++
        if (debouncedSearch.length > 2) count++
        return count
    }, [statusFilter, departmentFilter, priorityFilter, taskTypeFilter, date, debouncedSearch])

    // Reset page to 1 when any filter changes
    const handleStatusChange = useCallback((value: string) => {
        setStatusFilter(value)
        setCurrentPage(1)
    }, [])

    const handleDepartmentChange = useCallback((value: string) => {
        setDepartmentFilter(value)
        setCurrentPage(1)
    }, [])

    const handlePriorityChange = useCallback((value: string) => {
        setPriorityFilter(value)
        setCurrentPage(1)
    }, [])

    const handleTaskTypeChange = useCallback((value: string) => {
        setTaskTypeFilter(value)
        setCurrentPage(1)
    }, [])

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value)
        setCurrentPage(1)
    }, [])

    const handleDateChange = useCallback((range: DateRange | undefined) => {
        setDate(range)
        setCurrentPage(1)
    }, [])

    const clearAllFilters = useCallback(() => {
        setSearch('')
        setStatusFilter('all')
        setDepartmentFilter('all')
        setPriorityFilter('all')
        setTaskTypeFilter('all')
        setDate(undefined)
        setCurrentPage(1)
    }, [])

    // Export handlers - trigger data fetch and wait for useEffect to handle the actual export
    const handleExportCSV = useCallback(() => {
        setIsExporting('csv')
    }, [])

    const handleExportPDF = useCallback(() => {
        setIsExporting('pdf')
    }, [])

    // Perform download once data is available (single source of truth)
    useEffect(() => {
        if (isExporting && exportData && exportData.length > 0) {
            if (isExporting === 'csv') {
                exportTasksToCSV(exportData as TaskExportData[], undefined, locale)
                setIsExporting(null)
            } else if (isExporting === 'pdf') {
                exportTasksToPDF(exportData as TaskExportData[], undefined, stats, locale)
                    .catch((error) => console.error('Error exporting PDF:', error))
                    .finally(() => setIsExporting(null))
            }
        }
    }, [isExporting, exportData, stats, locale])

    if (isLoading) {
        return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    if (error) {
        return <div className="text-red-500 p-3 md:p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/20 text-sm">{t('errorLoadingData')}</div>
    }

    // Type-safe tasks data
    const typedTasks = tasks as TaskWithRelations[]

    return (
        <Card>
            <CardContent className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
                {/* Summary Stats ΓÇö from lightweight stats query */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                    <TaskStatCard value={stats?.total ?? 0} label={t('totalTasks')} colorClass="bg-blue-100 dark:bg-blue-500/20 text-blue-700" />
                    <TaskStatCard value={stats?.in_progress ?? 0} label={t('inProgress')} colorClass="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700" />
                    <TaskStatCard value={stats?.review ?? 0} label={t('review')} colorClass="bg-purple-100 dark:bg-purple-500/20 text-purple-700" />
                    <TaskStatCard value={stats?.approved ?? 0} label={t('approved')} colorClass="bg-green-100 dark:bg-green-500/20 text-green-700" />
                </div>

                {/* Search + Filter Toggle (Mobile) + Export */}
                <div className="flex flex-col gap-3">
                    <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('searchPlaceholder')}
                                value={search}
                                onChange={handleSearchChange}
                                className="pe-9"
                            />
                        </div>
                        {/* Filter Toggle - visible on mobile, hidden on lg+ */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="lg:hidden shrink-0 relative"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1.5 -end-1.5 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                        {/* Mobile Export Dropdown */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="md:hidden shrink-0"
                                    disabled={totalCount === 0 || isExporting !== null}
                                    title={t('export')}
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-2" align="end">
                                <div className="flex flex-col gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleExportCSV}
                                        disabled={isExporting !== null}
                                        className="justify-start"
                                    >
                                        {isExporting === 'csv' ? <Loader2 className="w-4 h-4 ms-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 ms-2" />}
                                        CSV
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleExportPDF}
                                        disabled={isExporting !== null}
                                        className="justify-start"
                                    >
                                        {isExporting === 'pdf' ? <Loader2 className="w-4 h-4 ms-2 animate-spin" /> : <FileText className="w-4 h-4 ms-2" />}
                                        PDF
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        {/* Desktop Export Buttons */}
                        <div className="hidden md:flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleExportCSV}
                                disabled={totalCount === 0 || isExporting !== null}
                            >
                                {isExporting === 'csv' ? <Loader2 className="w-4 h-4 ms-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 ms-2" />}
                                CSV
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleExportPDF}
                                disabled={totalCount === 0 || isExporting !== null}
                            >
                                {isExporting === 'pdf' ? <Loader2 className="w-4 h-4 ms-2 animate-spin" /> : <FileText className="w-4 h-4 ms-2" />}
                                PDF
                            </Button>
                        </div>
                    </div>

                    {/* Filters Panel - always visible on lg+, collapsible on mobile */}
                    <div className={cn(
                        "flex-col gap-3 transition-all duration-200",
                        showFilters ? "flex" : "hidden lg:flex"
                    )}>
                        {/* Row 1: Department + Status + Priority + Task Type */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            <Select value={departmentFilter} onValueChange={handleDepartmentChange}>
                                <SelectTrigger className="w-full">
                                    <Building2 className="w-4 h-4 ms-1 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder={t('department')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {DEPARTMENT_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={handleStatusChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={priorityFilter} onValueChange={handlePriorityChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('priority')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRIORITY_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={taskTypeFilter} onValueChange={handleTaskTypeChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('type')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {TASK_TYPE_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Row 2: Date + Clear */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant="outline"
                                        className={cn(
                                            "w-full sm:w-[240px] justify-start text-start font-normal text-sm",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="ms-2 h-4 w-4 shrink-0" />
                                        {date?.from ? (
                                            date.to ? (
                                                <span className="truncate">
                                                    {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                                                </span>
                                            ) : (
                                                format(date.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>{t('selectDate')}</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={date?.from}
                                        selected={date}
                                        onSelect={handleDateChange}
                                        numberOfMonths={isSmallScreen ? 1 : 2}
                                    />
                                </PopoverContent>
                            </Popover>
                            {date && (
                                <Button variant="ghost" size="icon" onClick={() => handleDateChange(undefined)} title={t('removeDate')}>
                                    <X className="h-4 w-4" />
                                </Button>
                            )}

                            {activeFilterCount > 0 && (
                                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                                    <X className="w-4 h-4 ms-1" />
                                    {t('clearAll', { count: activeFilterCount })}
                                </Button>
                            )}
                        </div>

                        {/* Active Filters Badges */}
                        {activeFilterCount > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                {[
                                    { filter: departmentFilter, options: DEPARTMENT_OPTIONS, handler: handleDepartmentChange, icon: <Building2 className="w-3 h-3" /> },
                                    { filter: statusFilter, options: STATUS_OPTIONS, handler: handleStatusChange },
                                    { filter: priorityFilter, options: PRIORITY_OPTIONS, handler: handlePriorityChange },
                                    { filter: taskTypeFilter, options: TASK_TYPE_OPTIONS, handler: handleTaskTypeChange },
                                ].map(({ filter, options, handler, icon }, idx) => (
                                    filter !== 'all' && (
                                        <Badge key={idx} variant="secondary" className="gap-1 text-xs">
                                            {icon}
                                            {options.find(o => o.value === filter)?.label}
                                            <button onClick={() => handler('all')} className="ms-0.5 hover:text-red-500">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    )
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                    {isFetching && !isLoading && (
                        <div className="flex justify-center py-2">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {typedTasks.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground text-sm">
                            {t('noMatchingTasks')}
                        </div>
                    ) : (
                        typedTasks.map((task) => (
                            <MobileTaskCard key={task.id} task={task} />
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block border rounded-lg overflow-hidden relative">
                    {isFetching && !isLoading && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    )}
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[260px]">{t('taskTitle')}</TableHead>
                                <TableHead className="w-[150px]">{t('client')}</TableHead>
                                <TableHead className="w-[140px] hidden lg:table-cell">{t('teamLeader')}</TableHead>
                                <TableHead className="w-[140px] hidden lg:table-cell">{t('designer')}</TableHead>
                                <TableHead className="w-[110px] text-center">{t('status')}</TableHead>
                                <TableHead className="w-[100px] text-center hidden lg:table-cell">{t('priority')}</TableHead>
                                <TableHead className="w-[110px] text-center hidden xl:table-cell">{t('date')}</TableHead>
                                <TableHead className="w-[80px] text-center">{t('actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {typedTasks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                        {t('noMatchingTasks')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                typedTasks.map((task) => (
                                    <TableRow key={task.id} className="align-middle">
                                        {/* Task Title */}
                                        <TableCell className="font-medium py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="line-clamp-1 text-sm font-semibold">{task.title}</span>
                                                {task.description && (
                                                    <span className="text-xs text-muted-foreground line-clamp-1 max-w-[230px]">{task.description}</span>
                                                )}
                                                <DepartmentBadge department={task.department} />
                                            </div>
                                        </TableCell>
                                        {/* Client */}
                                        <TableCell className="py-3">
                                            <span className="font-medium text-sm line-clamp-1">
                                                {task.client?.name || task.project?.client?.name || task.company_name || '-'}
                                            </span>
                                        </TableCell>
                                        {/* Team Leader */}
                                        <TableCell className="hidden lg:table-cell py-3">
                                            <div className="flex items-center gap-2">
                                                {task.creator?.avatar_url ? (
                                                    <Image src={task.creator.avatar_url} alt="" width={28} height={28} className="w-7 h-7 rounded-full shrink-0" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-medium">
                                                        {task.creator?.name?.[0] || '?'}
                                                    </div>
                                                )}
                                                <span className="text-sm line-clamp-1">{task.creator?.name || 'System'}</span>
                                            </div>
                                        </TableCell>
                                        {/* Designer */}
                                        <TableCell className="hidden lg:table-cell py-3">
                                            {task.assigned_user ? (
                                                <div className="flex items-center gap-2">
                                                    {task.assigned_user.avatar_url ? (
                                                        <Image src={task.assigned_user.avatar_url} alt="" width={28} height={28} className="w-7 h-7 rounded-full shrink-0" />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-medium">
                                                            {task.assigned_user.name?.[0] || '?'}
                                                        </div>
                                                    )}
                                                    <span className="text-sm line-clamp-1">{task.assigned_user.name}</span>
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="opacity-50 text-xs">{t('unassigned')}</Badge>
                                            )}
                                        </TableCell>
                                        {/* Status */}
                                        <TableCell className="text-center py-3">
                                            <StatusBadge status={task.status} />
                                        </TableCell>
                                        {/* Priority */}
                                        <TableCell className="text-center hidden lg:table-cell py-3">
                                            <PriorityBadge priority={task.priority} />
                                        </TableCell>
                                        {/* Date */}
                                        <TableCell className="text-center hidden xl:table-cell py-3">
                                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                                {formatTaskDate(task.created_at)}
                                            </span>
                                        </TableCell>
                                        {/* Actions */}
                                        <TableCell className="text-center py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <TaskDetailDialog task={task} variant="desktop" />
                                                {task.client_feedback && (
                                                    <TaskFeedbackDialog
                                                        feedback={task.client_feedback}
                                                        taskTitle={task.title}
                                                        variant="desktop"
                                                    />
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between mt-4">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                        {totalCount > 0 ? (
                            <>
                                <span className="hidden sm:inline">
                                    {t('showingRange', { from: ((currentPage - 1) * ROWS_PER_PAGE) + 1, to: Math.min(currentPage * ROWS_PER_PAGE, totalCount), total: totalCount })}
                                    {' '}{t('pageOf', { current: currentPage, total: totalPages })}
                                </span>
                                <span className="sm:hidden">
                                    {currentPage}/{totalPages}
                                </span>
                            </>
                        ) : (
                            t('noResults')
                        )}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || isFetching}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                        {/* Page number buttons - reactive via useMediaQuery */}
                        {totalPages > 1 && (() => {
                            const maxButtons = isSmallScreen ? 3 : 5
                            const actualButtons = Math.min(maxButtons, totalPages)
                            const startPage = Math.max(1, Math.min(currentPage - Math.floor(actualButtons / 2), totalPages - actualButtons + 1))
                            return Array.from({ length: actualButtons }, (_, i) => {
                                const page = startPage + i
                                return (
                                    <Button
                                        key={page}
                                        variant={page === currentPage ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentPage(page)}
                                        disabled={isFetching}
                                        className="w-8 h-8 p-0 text-xs"
                                    >
                                        {page}
                                    </Button>
                                )
                            })
                        })()}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage >= totalPages || isFetching}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}

// ============================================
// Shared Sub-Components
// ============================================

/**
 * Body of the task detail dialog — fetches full data lazily including attachments
 */
function TaskDetailBody({ task }: { task: TaskWithRelations }) {
    const t = useTranslations('tasksManager')
    const locale = useLocale()
    const clientName = task.client?.name || task.project?.client?.name || task.company_name
    const { data: fullTask, isLoading: loadingDetails } = useTaskDetails(task.id)
    const attachments = fullTask?.attachments ?? []

    const formatDate = (d?: string | null) => {
        if (!d) return null
        try { return format(new Date(d), locale === 'ar' ? 'dd/MM/yyyy' : 'MMM d, yyyy') } catch { return d }
    }
    const formatDateTime = (d?: string | null) => {
        if (!d) return null
        try { return format(new Date(d), locale === 'ar' ? 'dd/MM/yyyy HH:mm' : 'MMM d, yyyy HH:mm') } catch { return d }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Colored header */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4 border-b shrink-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                    {task.department && <DepartmentBadge department={task.department} />}
                </div>
                <h2 className="font-semibold text-base leading-snug">{task.title}</h2>
                {task.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                )}
                {task.id && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span>{task.id.slice(0, 8)}</span>
                    </div>
                )}
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">

                {/* People */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />{t('sectionPeople')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {clientName && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
                                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <div className="text-[11px] text-muted-foreground">{t('clientLabel')}</div>
                                    <div className="text-sm font-medium truncate">{clientName}</div>
                                </div>
                            </div>
                        )}
                        {task.creator && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <div className="text-[11px] text-muted-foreground">{t('teamLeaderLabel')}</div>
                                    <div className="text-sm font-medium truncate">{task.creator.name}</div>
                                    {task.creator.email && <div className="text-[11px] text-muted-foreground truncate">{task.creator.email}</div>}
                                </div>
                            </div>
                        )}
                        {task.assigned_user && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <div className="text-[11px] text-muted-foreground">{t('designerLabel')}</div>
                                    <div className="text-sm font-medium truncate">{task.assigned_user.name}</div>
                                    {task.assigned_user.email && <div className="text-[11px] text-muted-foreground truncate">{task.assigned_user.email}</div>}
                                </div>
                            </div>
                        )}
                        {task.editor && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <div className="text-[11px] text-muted-foreground">{t('editor')}</div>
                                    <div className="text-sm font-medium truncate">{typeof task.editor === 'string' ? task.editor : (task.editor as { name?: string })?.name || ''}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Task Info */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" />{t('sectionTaskInfo')}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {task.task_type && (
                            <div className="p-2.5 rounded-lg bg-muted/40">
                                <div className="text-[11px] text-muted-foreground">{t('typeLabel')}</div>
                                <div className="text-sm font-medium">{task.task_type}</div>
                            </div>
                        )}
                        {task.workflow_stage && (
                            <div className="p-2.5 rounded-lg bg-muted/40">
                                <div className="text-[11px] text-muted-foreground">{t('workflowStage')}</div>
                                <div className="text-sm font-medium">{task.workflow_stage}</div>
                            </div>
                        )}
                        {task.request_type && (
                            <div className="p-2.5 rounded-lg bg-muted/40">
                                <div className="text-[11px] text-muted-foreground">{t('requestType')}</div>
                                <div className="text-sm font-medium">{task.request_type}</div>
                            </div>
                        )}
                        {task.request_status && (
                            <div className="p-2.5 rounded-lg bg-muted/40">
                                <div className="text-[11px] text-muted-foreground">{t('requestStatus')}</div>
                                <div className="text-sm font-medium">{task.request_status}</div>
                            </div>
                        )}
                        {task.project?.name && (
                            <div className="p-2.5 rounded-lg bg-muted/40">
                                <div className="text-[11px] text-muted-foreground">{t('project')}</div>
                                <div className="text-sm font-medium">{task.project.name}</div>
                            </div>
                        )}
                        <div className="p-2.5 rounded-lg bg-muted/40">
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" />{t('commentsCount')}</div>
                            <div className="text-sm font-medium">{task.comments_count ?? 0}</div>
                        </div>
                    </div>
                </div>

                {/* Dates */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />{t('sectionDates')}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div className="p-2.5 rounded-lg bg-muted/40">
                            <div className="text-[11px] text-muted-foreground">{t('createdAt')}</div>
                            <div className="text-sm font-medium">{formatDate(task.created_at)}</div>
                        </div>
                        {task.updated_at && (
                            <div className="p-2.5 rounded-lg bg-muted/40">
                                <div className="text-[11px] text-muted-foreground">{t('updatedAt')}</div>
                                <div className="text-sm font-medium">{formatDate(task.updated_at)}</div>
                            </div>
                        )}
                        {task.deadline && (
                            <div className="p-2.5 rounded-lg bg-muted/40">
                                <div className="text-[11px] text-muted-foreground">{t('deadline')}</div>
                                <div className="text-sm font-medium">{formatDate(task.deadline)}</div>
                            </div>
                        )}
                        {task.scheduled_date && (
                            <div className="p-2.5 rounded-lg bg-muted/40">
                                <div className="text-[11px] text-muted-foreground">{t('scheduledDate')}</div>
                                <div className="text-sm font-medium">{formatDateTime(task.scheduled_date)}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Location */}
                {task.location && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />{t('location')}
                        </h3>
                        <div className="p-2.5 rounded-lg bg-muted/40 text-sm">{task.location}</div>
                    </div>
                )}

                {/* Attachments */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Paperclip className="h-3.5 w-3.5" />{t('sectionAttachments')}
                        {!loadingDetails && <span className="text-xs normal-case font-normal">({attachments.length})</span>}
                    </h3>
                    {loadingDetails ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('loadingAttachments')}
                        </div>
                    ) : attachments.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                            <FolderOpen className="h-4 w-4" />
                            {t('noAttachments')}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {attachments.map((attachment) => {
                                const FileIcon = getFileIcon(attachment.file_type)
                                return (
                                    <div
                                        key={attachment.id}
                                        className={cn(
                                            'flex items-center gap-3 p-3 rounded-lg border bg-card/50',
                                            attachment.is_final && 'border-green-500/50 bg-green-500/5'
                                        )}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <FileIcon className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm truncate">{attachment.file_name}</span>
                                                {attachment.is_final && (
                                                    <Badge variant="secondary" className="text-green-600 bg-green-500/10 shrink-0 text-[10px]">
                                                        <Star className="h-3 w-3 me-1" />
                                                        {locale === 'ar' ? 'نهائي' : 'Final'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                <a href={attachment.file_url} target="_blank" rel="noopener noreferrer" aria-label="Open file">
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                <a href={attachment.file_url} download aria-label="Download file">
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Rejection Reason */}
                {task.rejection_reason && (
                    <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive mb-1">
                            <AlertTriangle className="h-3.5 w-3.5" />{t('rejectionReason')}
                        </div>
                        <p className="text-sm text-destructive/80">{task.rejection_reason}</p>
                    </div>
                )}

                {/* Client Feedback */}
                {task.client_feedback && (
                    <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 mb-1">
                            <MessageSquare className="h-3.5 w-3.5" />{t('feedbackTitle')}
                        </div>
                        <p className="text-sm text-orange-700 dark:text-orange-300">{task.client_feedback}</p>
                    </div>
                )}

            </div>
        </div>
    )
}

/**
 * Controlled dialog that lazy-loads task details only when opened
 */
const TaskDetailDialog = memo(function TaskDetailDialog({
    task,
    variant = 'desktop'
}: {
    task: TaskWithRelations
    variant?: 'desktop' | 'mobile'
}) {
    const [open, setOpen] = useState(false)
    const t = useTranslations('tasksManager')
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {variant === 'desktop' ? (
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/5" title={t('viewDetails')}>
                        <Eye className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-primary px-2">
                        <Eye className="w-3.5 h-3.5" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-[94vw] sm:max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogTitle className="sr-only">{task.title}</DialogTitle>
                {open && <TaskDetailBody task={task} />}
            </DialogContent>
        </Dialog>
    )
})

/**
 * Reusable dialog for displaying client feedback
 */
const TaskFeedbackDialog = memo(function TaskFeedbackDialog({
    feedback,
    taskTitle,
    variant = 'desktop'
}: {
    feedback: string
    taskTitle: string
    variant?: 'desktop' | 'mobile'
}) {
    const t = useTranslations('tasksManager')
    return (
        <Dialog>
            <DialogTrigger asChild>
                {variant === 'desktop' ? (
                    <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20">
                        <FileText className="w-4 h-4 ms-1" />
                        <span className="hidden lg:inline">{t('feedback')}</span>
                    </Button>
                ) : (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 px-2">
                        <FileText className="w-3.5 h-3.5 ms-1" />
                        {t('feedback')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className={variant === 'desktop' ? "max-w-[90vw] sm:max-w-lg" : "max-w-[92vw] sm:max-w-lg"}>
                <DialogHeader>
                    <DialogTitle className={variant === 'mobile' ? "text-base" : undefined}>
                        {t('feedbackTitle')}{variant === 'desktop' ? ` ${t('fromClient')}` : ''}
                    </DialogTitle>
                    <DialogDescription className={variant === 'mobile' ? "text-xs" : undefined}>
                        {variant === 'desktop' ? `${t('forTask')} ` : `${t('task')} `}{taskTitle}
                    </DialogDescription>
                </DialogHeader>
                <div className={cn(
                    "bg-orange-50 dark:bg-orange-950/20 rounded-lg text-orange-900 dark:text-orange-200 border border-orange-100 dark:border-orange-800",
                    variant === 'desktop' ? "p-4 min-h-[100px]" : "p-3 min-h-[80px] text-sm"
                )}>
                    {feedback}
                </div>
            </DialogContent>
        </Dialog>
    )
})

/**
 * Reusable stat card for task metrics
 */
const TaskStatCard = memo(function TaskStatCard({
    value,
    label,
    colorClass
}: {
    value: number
    label: string
    colorClass: string
}) {
    return (
        <div className={cn("rounded-lg p-2.5 md:p-3 text-center", colorClass)}>
            <div className="text-xl md:text-2xl font-bold">{value}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground">{label}</div>
        </div>
    )
})

// ============================================
// Mobile Task Card ΓÇö React.memo to prevent unnecessary re-renders
// ============================================

const MobileTaskCard = memo(function MobileTaskCard({ task }: { task: TaskWithRelations }) {
    const t = useTranslations('tasksManager')
    return (
        <div className="border rounded-lg p-3 space-y-2.5 bg-card">
            {/* Header: Title + Status */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-1">{task.title}</h3>
                    {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>
                    )}
                </div>
                <StatusBadge status={task.status} />
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                {/* Department */}
                <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{t('departmentLabel')}</span>
                    <DepartmentBadge department={task.department} />
                </div>
                {/* Priority */}
                <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{t('priorityLabel')}</span>
                    <PriorityBadge priority={task.priority} />
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                    <span className="text-muted-foreground shrink-0">{t('clientLabel')}</span>
                    <span className="truncate font-medium">{task.client?.name || task.project?.client?.name || task.company_name || '-'}</span>
                </div>
                {/* Assigned */}
                <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{t('designerLabel')}</span>
                    <span className="truncate">{task.assigned_user?.name || t('unassigned')}</span>
                </div>
                {/* Date */}
                <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{t('dateLabel')}</span>
                    <span>{formatTaskDate(task.created_at)}</span>
                </div>
            </div>

            {/* Footer: Creator + Actions */}
            <div className="flex items-center justify-between pt-1.5 border-t">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {task.creator?.avatar_url && (
                        <Image src={task.creator.avatar_url} alt="" width={20} height={20} className="w-5 h-5 rounded-full" />
                    )}
                    <span>{task.creator?.name || 'System'}</span>
                </div>
                <div className="flex items-center gap-1">
                    <TaskDetailDialog task={task} variant="mobile" />
                    {task.client_feedback && (
                        <TaskFeedbackDialog
                            feedback={task.client_feedback}
                            taskTitle={task.title}
                            variant="mobile"
                        />
                    )}
                </div>
            </div>
        </div>
    )
})

// StatusBadge, PriorityBadge, DepartmentBadge imported from @/components/shared/task-badges
