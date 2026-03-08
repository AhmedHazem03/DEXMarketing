'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { format, isAfter, isBefore } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useTransactions, useApproveTransaction, useDeleteTransaction, useUpdateTransaction } from '@/hooks/use-treasury'
import { EditTransactionDialog } from '@/components/treasury/edit-transaction-dialog'
import { useDebounce, usePagination } from '@/hooks'
import { useCurrentRole } from '@/hooks/use-current-role'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryLabel } from '@/lib/constants/treasury'
import type { TransactionType, Transaction } from '@/types/database'
import {
    ArrowUpRight,
    ArrowDownLeft,
    MoreHorizontal,
    FileText,
    Search,
    CalendarIcon,
    X,
    SlidersHorizontal,
    ArrowDownUp,
    Download,
    FileSpreadsheet,
    ChevronLeft,
    ChevronRight,
    Loader2,
    CheckCircle,
    Pencil,
    Trash2,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { exportToCSV, exportToPDF, generateFilename, calculateStats } from '@/lib/export-utils'
import { toast } from 'sonner'

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]
    .filter((cat, index, self) => self.findIndex(c => c.value === cat.value) === index)

type SortField = 'created_at' | 'amount'
type SortDir = 'asc' | 'desc'

interface FilterErrors {
    dateRange?: string
    minAmount?: string
    maxAmount?: string
    amountRange?: string
}

export function TransactionsTable() {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const { isAdmin, isAccountant } = useCurrentRole()

    // Filter state
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search, 300)
    const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'transfer'>('all')
    const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
    const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
    const [minAmount, setMinAmount] = useState('')
    const [maxAmount, setMaxAmount] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    const [sortField, setSortField] = useState<SortField>('created_at')
    const [sortDir, setSortDir] = useState<SortDir>('desc')
    const [isExporting, setIsExporting] = useState(false)

    // Approval dialog state
    const [approveDialogOpen, setApproveDialogOpen] = useState(false)
    const [transactionToApprove, setTransactionToApprove] = useState<string | null>(null)
    const [visibleToClient, setVisibleToClient] = useState(false)

    const approveTransaction = useApproveTransaction()
    const deleteTransaction = useDeleteTransaction()

    // Edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null)

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)

    // Validation
    const filterErrors = useMemo<FilterErrors>(() => {
        const errors: FilterErrors = {}

        // Date range: from must be before to
        if (dateFrom && dateTo && isAfter(dateFrom, dateTo)) {
            errors.dateRange = isAr
                ? 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية'
                : 'Start date must be before end date'
        }

        // Min amount: cannot be negative
        if (minAmount && Number(minAmount) < 0) {
            errors.minAmount = isAr
                ? 'لا يمكن أن يكون المبلغ سالب'
                : 'Amount cannot be negative'
        }

        // Max amount: cannot be negative
        if (maxAmount && Number(maxAmount) < 0) {
            errors.maxAmount = isAr
                ? 'لا يمكن أن يكون المبلغ سالب'
                : 'Amount cannot be negative'
        }

        // Amount range: min must be <= max
        if (
            minAmount && maxAmount &&
            Number(minAmount) >= 0 && Number(maxAmount) >= 0 &&
            Number(minAmount) > Number(maxAmount)
        ) {
            errors.amountRange = isAr
                ? 'الحد الأدنى يجب أن يكون أقل من أو يساوي الحد الأقصى'
                : 'Min amount must be less than or equal to max amount'
        }

        return errors
    }, [dateFrom, dateTo, minAmount, maxAmount, isAr])

    const hasErrors = Object.keys(filterErrors).length > 0

    // Validated date setters — auto-fix if possible
    const handleDateFromChange = useCallback((date: Date | undefined) => {
        setDateFrom(date)
    }, [])

    const handleDateToChange = useCallback((date: Date | undefined) => {
        setDateTo(date)
    }, [])

    // Amount setters — block negative input
    const handleMinAmountChange = useCallback((value: string) => {
        if (value === '' || Number(value) >= 0) {
            setMinAmount(value)
        }
    }, [])

    const handleMaxAmountChange = useCallback((value: string) => {
        if (value === '' || Number(value) >= 0) {
            setMaxAmount(value)
        }
    }, [])

    // Build query filters — only apply valid filters
    const queryFilters = useMemo(() => {
        // Don't send invalid filters to the server
        const validDateFrom = dateFrom && !filterErrors.dateRange ? dateFrom : undefined
        const validDateTo = dateTo && !filterErrors.dateRange ? dateTo : undefined
        const validMin = minAmount && !filterErrors.minAmount && !filterErrors.amountRange ? Number(minAmount) : undefined
        const validMax = maxAmount && !filterErrors.maxAmount && !filterErrors.amountRange ? Number(maxAmount) : undefined

        return {
            type: typeFilter !== 'all' ? typeFilter : undefined,
            category: categoryFilter !== 'all' ? categoryFilter : undefined,
            paymentMethod: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
            startDate: validDateFrom ? validDateFrom.toISOString() : undefined,
            endDate: validDateTo ? validDateTo.toISOString() : undefined,
            minAmount: validMin,
            maxAmount: validMax,
            limit: 100,
        }
    }, [typeFilter, categoryFilter, paymentMethodFilter, dateFrom, dateTo, minAmount, maxAmount, filterErrors])

    const { data: transactions, isLoading } = useTransactions(queryFilters)

    // Client-side search + sort (using debounced search)
    const filteredTransactions = useMemo(() => {
        let result = transactions?.filter(t =>
            !debouncedSearch ||
            t.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            t.category?.toLowerCase().includes(debouncedSearch.toLowerCase())
        ) || []

        // Sort
        result = [...result].sort((a, b) => {
            let cmp = 0
            if (sortField === 'amount') {
                cmp = a.amount - b.amount
            } else {
                cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            }
            return sortDir === 'asc' ? cmp : -cmp
        })

        return result
    }, [transactions, debouncedSearch, sortField, sortDir])

    // Pagination
    const pagination = usePagination({
        totalItems: filteredTransactions.length,
        itemsPerPage: 10,
        initialPage: 1
    })

    // Reset to page 1 whenever filters or search changes
    useEffect(() => {
        pagination.goToPage(1)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, typeFilter, categoryFilter, paymentMethodFilter, dateFrom, dateTo, minAmount, maxAmount, sortField, sortDir])

    // Reset category filter when type changes to avoid invalid combos
    useEffect(() => {
        setCategoryFilter('all')
    }, [typeFilter])

    const paginatedTransactions = useMemo(
        () => pagination.paginateItems(filteredTransactions),
        [filteredTransactions, pagination]
    )

    // Calculate stats for filtered data
    const stats = useMemo(() => calculateStats(filteredTransactions), [filteredTransactions])

    const activeFilterCount = [
        typeFilter !== 'all',
        categoryFilter !== 'all',
        paymentMethodFilter !== 'all',
        !!dateFrom,
        !!dateTo,
        !!minAmount,
        !!maxAmount,
    ].filter(Boolean).length

    const clearAllFilters = () => {
        setTypeFilter('all')
        setCategoryFilter('all')
        setPaymentMethodFilter('all')
        setDateFrom(undefined)
        setDateTo(undefined)
        setMinAmount('')
        setMaxAmount('')
        setSearch('')
    }

    // Dynamic categories based on type filter
    const visibleCategories = useMemo(() => {
        if (typeFilter === 'income') return INCOME_CATEGORIES
        if (typeFilter === 'expense') return EXPENSE_CATEGORIES
        return ALL_CATEGORIES
    }, [typeFilter])

    // Export handlers
    const handleExportCSV = useCallback(() => {
        setIsExporting(true)
        try {
            const filename = generateFilename('treasury', 'csv', isAr)
            exportToCSV(filteredTransactions, filename, isAr)
            toast.success(
                isAr ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully',
                { description: isAr ? `الملف: ${filename}` : `File: ${filename}` }
            )
        } catch (error) {
            toast.error(
                isAr ? 'فشل تصدير البيانات' : 'Failed to export data',
                { description: isAr ? 'حدث خطأ أثناء التصدير' : 'An error occurred during export' }
            )
        } finally {
            setIsExporting(false)
        }
    }, [filteredTransactions, isAr])

    const handleExportPDF = useCallback(async () => {
        setIsExporting(true)
        try {
            const filename = generateFilename('treasury', 'pdf', isAr)
            await exportToPDF(filteredTransactions, filename, isAr, {
                totalIncome: stats.totalIncome,
                totalExpense: stats.totalExpense,
                balance: stats.balance
            })
            toast.success(
                isAr ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully',
                { description: isAr ? `الملف: ${filename}` : `File: ${filename}` }
            )
        } catch (error) {
            toast.error(
                isAr ? 'فشل تصدير البيانات' : 'Failed to export data',
                { description: isAr ? 'حدث خطأ أثناء التصدير' : 'An error occurred during export' }
            )
        } finally {
            setIsExporting(false)
        }
    }, [filteredTransactions, isAr, stats])

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Search + Toggle Filters + Export */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={isAr ? 'بحث في المعاملات...' : 'Search transactions...'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="ps-10"
                    />
                </div>
                <Button
                    variant={showFilters ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-2"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    {isAr ? 'فلاتر' : 'Filters'}
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
                {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-muted-foreground">
                        <X className="h-3.5 w-3.5" />
                        {isAr ? 'مسح الكل' : 'Clear all'}
                    </Button>
                )}

                {/* Export Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            disabled={filteredTransactions.length === 0 || isExporting}
                        >
                            {isExporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            {isAr ? 'تصدير' : 'Export'}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            {isAr ? 'تصدير CSV' : 'Export CSV'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                            <FileText className="h-4 w-4" />
                            {isAr ? 'تصدير PDF' : 'Export PDF'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-card">
                    {/* Type Filter */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            {isAr ? 'النوع' : 'Type'}
                        </label>
                        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionType | 'all')}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                                <SelectItem value="income">
                                    <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                        {isAr ? 'إيراد' : 'Income'}
                                    </span>
                                </SelectItem>
                                <SelectItem value="expense">
                                    <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500" />
                                        {isAr ? 'مصروف' : 'Expense'}
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Category Filter */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            {isAr ? 'الفئة' : 'Category'}
                        </label>
                        <Select value={categoryFilter} onValueChange={(v) => {
                            setCategoryFilter(v)
                        }}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                                {visibleCategories.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        {getCategoryLabel(cat.value, isAr)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Payment Method Filter */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            {isAr ? 'طريقة الدفع' : 'Payment Method'}
                        </label>
                        <Select value={paymentMethodFilter} onValueChange={(v) => setPaymentMethodFilter(v as 'all' | 'cash' | 'transfer')}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                                <SelectItem value="cash">{isAr ? 'نقد' : 'Cash'}</SelectItem>
                                <SelectItem value="transfer">{isAr ? 'محفظة إلكترونية' : 'Mobile Wallet'}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date From */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            {isAr ? 'من تاريخ' : 'From Date'}
                        </label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={`w-full justify-start text-start font-normal gap-2 ${filterErrors.dateRange ? 'border-destructive' : ''}`}
                                >
                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                    {dateFrom
                                        ? format(dateFrom, 'PP', { locale: isAr ? ar : enUS })
                                        : <span className="text-muted-foreground">{isAr ? 'اختر تاريخ' : 'Pick date'}</span>
                                    }
                                    {dateFrom && (
                                        <X
                                            className="h-3.5 w-3.5 ms-auto text-muted-foreground hover:text-foreground"
                                            onClick={(e) => { e.stopPropagation(); setDateFrom(undefined) }}
                                        />
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dateFrom}
                                    onSelect={handleDateFromChange}
                                    disabled={dateTo ? { after: dateTo } : undefined}
                                />
                            </PopoverContent>
                        </Popover>
                        {filterErrors.dateRange && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {filterErrors.dateRange}
                            </p>
                        )}
                    </div>

                    {/* Date To */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            {isAr ? 'إلى تاريخ' : 'To Date'}
                        </label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={`w-full justify-start text-start font-normal gap-2 ${filterErrors.dateRange ? 'border-destructive' : ''}`}
                                >
                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                    {dateTo
                                        ? format(dateTo, 'PP', { locale: isAr ? ar : enUS })
                                        : <span className="text-muted-foreground">{isAr ? 'اختر تاريخ' : 'Pick date'}</span>
                                    }
                                    {dateTo && (
                                        <X
                                            className="h-3.5 w-3.5 ms-auto text-muted-foreground hover:text-foreground"
                                            onClick={(e) => { e.stopPropagation(); setDateTo(undefined) }}
                                        />
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dateTo}
                                    onSelect={handleDateToChange}
                                    disabled={dateFrom ? { before: dateFrom } : undefined}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Min Amount */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            {isAr ? 'الحد الأدنى' : 'Min Amount'}
                        </label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={minAmount}
                            onChange={(e) => handleMinAmountChange(e.target.value)}
                            className={filterErrors.minAmount || filterErrors.amountRange ? 'border-destructive' : ''}
                        />
                        {filterErrors.minAmount && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {filterErrors.minAmount}
                            </p>
                        )}
                    </div>

                    {/* Max Amount */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            {isAr ? 'الحد الأقصى' : 'Max Amount'}
                        </label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="∞"
                            value={maxAmount}
                            onChange={(e) => handleMaxAmountChange(e.target.value)}
                            className={filterErrors.maxAmount || filterErrors.amountRange ? 'border-destructive' : ''}
                        />
                        {filterErrors.maxAmount && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {filterErrors.maxAmount}
                            </p>
                        )}
                        {filterErrors.amountRange && !filterErrors.minAmount && !filterErrors.maxAmount && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {filterErrors.amountRange}
                            </p>
                        )}
                    </div>

                    {/* Sort */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            {isAr ? 'ترتيب حسب' : 'Sort By'}
                        </label>
                        <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="created_at">{isAr ? 'التاريخ' : 'Date'}</SelectItem>
                                <SelectItem value="amount">{isAr ? 'المبلغ' : 'Amount'}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sort Direction */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            {isAr ? 'الاتجاه' : 'Direction'}
                        </label>
                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                        >
                            <ArrowDownUp className="h-4 w-4" />
                            {sortDir === 'desc'
                                ? (isAr ? 'الأحدث أولاً' : 'Newest first')
                                : (isAr ? 'الأقدم أولاً' : 'Oldest first')
                            }
                        </Button>
                    </div>
                </div>
            )}

            {/* Active Filters Badges */}
            {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2">
                    {typeFilter !== 'all' && (
                        <Badge variant="secondary" className="gap-1 pe-1">
                            {typeFilter === 'income' ? (isAr ? 'إيراد' : 'Income') : (isAr ? 'مصروف' : 'Expense')}
                            <button type="button" aria-label={isAr ? 'إزالة فلتر النوع' : 'Remove type filter'} onClick={() => setTypeFilter('all')} className="ms-1 rounded-full hover:bg-muted p-0.5">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {categoryFilter !== 'all' && (
                        <Badge variant="secondary" className="gap-1 pe-1">
                            {getCategoryLabel(categoryFilter, isAr)}
                            <button type="button" aria-label={isAr ? 'إزالة فلتر الفئة' : 'Remove category filter'} onClick={() => setCategoryFilter('all')} className="ms-1 rounded-full hover:bg-muted p-0.5">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {paymentMethodFilter !== 'all' && (
                        <Badge variant="secondary" className="gap-1 pe-1">
                            {paymentMethodFilter === 'cash'
                                ? (isAr ? 'نقد' : 'Cash')
                                : (isAr ? 'محفظة إلكترونية' : 'Mobile Wallet')}
                            <button type="button" aria-label={isAr ? 'إزالة فلتر طريقة الدفع' : 'Remove payment method filter'} onClick={() => setPaymentMethodFilter('all')} className="ms-1 rounded-full hover:bg-muted p-0.5">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {dateFrom && (
                        <Badge variant="secondary" className="gap-1 pe-1">
                            {isAr ? 'من: ' : 'From: '}{format(dateFrom, 'PP', { locale: isAr ? ar : enUS })}
                            <button type="button" aria-label={isAr ? 'إزالة تاريخ البداية' : 'Remove start date'} onClick={() => setDateFrom(undefined)} className="ms-1 rounded-full hover:bg-muted p-0.5">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {dateTo && (
                        <Badge variant="secondary" className="gap-1 pe-1">
                            {isAr ? 'إلى: ' : 'To: '}{format(dateTo, 'PP', { locale: isAr ? ar : enUS })}
                            <button type="button" aria-label={isAr ? 'إزالة تاريخ النهاية' : 'Remove end date'} onClick={() => setDateTo(undefined)} className="ms-1 rounded-full hover:bg-muted p-0.5">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {minAmount && (
                        <Badge variant="secondary" className="gap-1 pe-1">
                            {isAr ? 'أدنى: ' : 'Min: '}{minAmount} ج.م
                            <button type="button" aria-label={isAr ? 'إزالة الحد الأدنى' : 'Remove min amount'} onClick={() => setMinAmount('')} className="ms-1 rounded-full hover:bg-muted p-0.5">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {maxAmount && (
                        <Badge variant="secondary" className="gap-1 pe-1">
                            {isAr ? 'أقصى: ' : 'Max: '}{maxAmount} ج.م
                            <button type="button" aria-label={isAr ? 'إزالة الحد الأقصى' : 'Remove max amount'} onClick={() => setMaxAmount('')} className="ms-1 rounded-full hover:bg-muted p-0.5">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                </div>
            )}

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
                {isAr
                    ? `${filteredTransactions.length} معاملة`
                    : `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''}`
                }
            </div>

            {/* Filtered Data Statistics */}
            {filteredTransactions.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg border bg-card">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                            {isAr ? 'إجمالي الإيرادات' : 'Total Income'}
                        </p>
                        <p className="text-xl font-bold text-green-600">
                            {stats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                            {isAr ? 'إجمالي المصروفات' : 'Total Expenses'}
                        </p>
                        <p className="text-xl font-bold text-red-600">
                            {stats.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                            {isAr ? 'الرصيد الصافي' : 'Net Balance'}
                        </p>
                        <p className={`text-xl font-bold ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stats.balance >= 0 ? '+' : ''}{stats.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                        </p>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>{isAr ? 'المعاملة' : 'Transaction'}</TableHead>
                            <TableHead>{isAr ? 'العميل' : 'Client'}</TableHead>
                            <TableHead>{isAr ? 'الفئة' : 'Category'}</TableHead>
                            <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                            <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                            <TableHead className="text-end">{isAr ? 'المبلغ' : 'Amount'}</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedTransactions?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                    {isAr ? 'لا توجد معاملات' : 'No transactions found'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedTransactions?.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className={`
                                                w-9 h-9 rounded-full flex items-center justify-center
                                                ${tx.type === 'income' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}
                                            `}>
                                                {tx.type === 'income' ? (
                                                    <ArrowDownLeft className="h-5 w-5" />
                                                ) : (
                                                    <ArrowUpRight className="h-5 w-5" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{tx.description}</p>
                                                {tx.receipt_url && (
                                                    <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                                                        <FileText className="h-3 w-3 me-1" />
                                                        {isAr ? 'مرفق إيصال' : 'Receipt attached'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-medium">
                                            {tx.client
                                                ? (tx.client.user?.name || tx.client.name)
                                                : (isAr ? 'شركة' : 'Company')
                                            }
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <Badge variant="secondary" className="font-normal w-fit">
                                                {getCategoryLabel(tx.category, isAr)}
                                            </Badge>
                                            {tx.payment_method && (
                                                <span className="text-xs text-muted-foreground">
                                                    {tx.payment_method === 'cash'
                                                        ? (isAr ? 'نقد' : 'Cash')
                                                        : tx.payment_method === 'transfer'
                                                            ? (isAr ? 'محفظة إلكترونية' : 'Mobile Wallet')
                                                            : (isAr ? 'شيك' : 'Check')}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={tx.is_approved ? 'default' : 'outline'} className={tx.is_approved ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'text-yellow-700 border-yellow-400 dark:text-yellow-300'}>
                                            {tx.is_approved
                                                ? (isAr ? 'معتمد' : 'Approved')
                                                : (isAr ? 'قيد الانتظار' : 'Pending')
                                            }
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-muted-foreground text-sm">
                                            {format(new Date(tx.created_at), 'PPP', { locale: isAr ? ar : enUS })}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-end font-semibold">
                                        <span className={tx.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                                            {tx.type === 'income' ? '+' : '-'}
                                            {tx.amount.toLocaleString()} ج.م
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {/* View Receipt - Available to Everyone */}
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        if (tx.receipt_url) {
                                                            window.open(tx.receipt_url, '_blank', 'noopener,noreferrer')
                                                        }
                                                    }}
                                                    disabled={!tx.receipt_url}
                                                >
                                                    <FileText className="me-2 h-4 w-4" />
                                                    {isAr ? 'عرض الإيصال' : 'View Receipt'}
                                                </DropdownMenuItem>

                                                {/* Approve - Admin Only */}
                                                {isAdmin && !tx.is_approved && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setTransactionToApprove(tx.id)
                                                                setVisibleToClient(false)
                                                                setApproveDialogOpen(true)
                                                            }}
                                                        >
                                                            <CheckCircle className="me-2 h-4 w-4 text-green-600" />
                                                            {isAr ? 'الموافقة على المعاملة' : 'Approve Transaction'}
                                                        </DropdownMenuItem>
                                                    </>
                                                )}

                                                {/* Edit - Admin Only */}
                                                {isAdmin && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setTransactionToEdit(tx)
                                                                setEditDialogOpen(true)
                                                            }}
                                                        >
                                                            <Pencil className="me-2 h-4 w-4" />
                                                            {isAr ? 'تعديل' : 'Edit'}
                                                        </DropdownMenuItem>
                                                    </>
                                                )}

                                                {/* Delete - Admin Only */}
                                                {isAdmin && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => {
                                                                setTransactionToDelete(tx.id)
                                                                setDeleteDialogOpen(true)
                                                            }}
                                                        >
                                                            <Trash2 className="me-2 h-4 w-4" />
                                                            {isAr ? 'حذف' : 'Delete'}
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {filteredTransactions.length > 0 && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <div className="text-sm text-muted-foreground">
                        {isAr ? (
                            <>
                                عرض {pagination.startIndex + 1} - {pagination.endIndex} من أصل {filteredTransactions.length}
                            </>
                        ) : (
                            <>
                                Showing {pagination.startIndex + 1} - {pagination.endIndex} of {filteredTransactions.length}
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={pagination.prevPage}
                            disabled={!pagination.canGoPrev}
                            className="gap-1"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            {isAr ? 'السابق' : 'Previous'}
                        </Button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                let pageNum: number
                                if (pagination.totalPages <= 5) {
                                    pageNum = i + 1
                                } else if (pagination.currentPage <= 3) {
                                    pageNum = i + 1
                                } else if (pagination.currentPage >= pagination.totalPages - 2) {
                                    pageNum = pagination.totalPages - 4 + i
                                } else {
                                    pageNum = pagination.currentPage - 2 + i
                                }

                                return (
                                    <Button
                                        key={pageNum}
                                        variant={pagination.currentPage === pageNum ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => pagination.goToPage(pageNum)}
                                        className="w-8 h-8 p-0"
                                    >
                                        {pageNum}
                                    </Button>
                                )
                            })}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={pagination.nextPage}
                            disabled={!pagination.canGoNext}
                            className="gap-1"
                        >
                            {isAr ? 'التالي' : 'Next'}
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Approval Dialog */}
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {isAr ? 'الموافقة على المعاملة' : 'Approve Transaction'}
                        </DialogTitle>
                        <DialogDescription>
                            {isAr
                                ? 'قم بالموافقة على المعاملة واختر إذا كنت تريد أن تكون مرئية للعميل'
                                : 'Approve the transaction and choose if it should be visible to client'
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 py-4">
                        <Checkbox
                            id="visible-to-client"
                            checked={visibleToClient}
                            onCheckedChange={(checked) => setVisibleToClient(checked as boolean)}
                        />
                        <Label
                            htmlFor="visible-to-client"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                            {isAr ? 'مرئي للعميل' : 'Visible to Client'}
                        </Label>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setApproveDialogOpen(false)
                                setTransactionToApprove(null)
                                setVisibleToClient(false)
                            }}
                        >
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!transactionToApprove) return
                                try {
                                    await approveTransaction.mutateAsync({
                                        transactionId: transactionToApprove,
                                        visibleToClient: visibleToClient,
                                    })
                                    toast.success(isAr ? 'تم اعتماد المعاملة' : 'Transaction approved')
                                    setApproveDialogOpen(false)
                                    setTransactionToApprove(null)
                                    setVisibleToClient(false)
                                } catch (error) {
                                    console.error('Failed to approve transaction:', error)
                                    toast.error(isAr ? 'فشل اعتماد المعاملة' : 'Failed to approve transaction')
                                }
                            }}
                            disabled={approveTransaction.isPending}
                        >
                            {approveTransaction.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            {isAr ? 'موافقة' : 'Approve'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Transaction Dialog */}
            <EditTransactionDialog
                open={editDialogOpen}
                onOpenChange={(open) => {
                    setEditDialogOpen(open)
                    if (!open) setTransactionToEdit(null)
                }}
                transaction={transactionToEdit}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {isAr ? 'تأكيد الحذف' : 'Confirm Delete'}
                        </DialogTitle>
                        <DialogDescription>
                            {isAr
                                ? 'هل أنت متأكد من حذف هذه المعاملة؟ لا يمكن التراجع عن هذا الإجراء.'
                                : 'Are you sure you want to delete this transaction? This action cannot be undone.'
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteDialogOpen(false)
                                setTransactionToDelete(null)
                            }}
                        >
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (!transactionToDelete) return
                                try {
                                    await deleteTransaction.mutateAsync(transactionToDelete)
                                    toast.success(isAr ? 'تم حذف المعاملة' : 'Transaction deleted')
                                    setDeleteDialogOpen(false)
                                    setTransactionToDelete(null)
                                } catch (error) {
                                    console.error('Failed to delete transaction:', error)
                                    toast.error(isAr ? 'فشل حذف المعاملة' : 'Failed to delete transaction')
                                }
                            }}
                            disabled={deleteTransaction.isPending}
                        >
                            {deleteTransaction.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            {isAr ? 'حذف' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
