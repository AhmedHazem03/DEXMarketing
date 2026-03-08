'use client'

import { Fragment, useState } from 'react'
import { useLocale } from 'next-intl'
import { format } from 'date-fns'
import {
    Plus,
    Search,
    ChevronDown,
    ChevronUp,
    MoreHorizontal,
    Trash2,
    Banknote,
    Pencil,
    FileDown,
    FileText,
    Download,
    Eye,
    CalendarIcon,
    X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

import { useClientAccounts, useDeleteClientAccount } from '@/hooks/use-client-accounts'
import { useClients } from '@/hooks/use-clients'
import { useCurrentRole } from '@/hooks/use-current-role'
import { useClientAccountsRealtimeSync } from '@/hooks/use-realtime'
import { AddClientAccountDialog } from './add-client-account-dialog'
import { AddClientTransactionDialog } from './add-client-transaction-dialog'
import { EditClientAccountDialog } from './edit-client-account-dialog'
import { ClientAccountDetails } from './client-account-details'
import { EditTransactionDialog } from './edit-transaction-dialog'
import type { ClientAccountWithRelations, Transaction } from '@/types/database'
import { getCategoryLabel } from '@/lib/constants/treasury'
import { cn } from '@/lib/utils'
import { exportClientAccountsToCSV, exportClientAccountsToPDF, generateFilename } from '@/lib/export-utils'

// ============================================
// Component
// ============================================

export function ClientAccountsPage() {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const { isAccountant } = useCurrentRole()

    // Enable real-time sync for client accounts and transactions
    useClientAccountsRealtimeSync()

    const [searchQuery, setSearchQuery] = useState('')
    const [clientFilter, setClientFilter] = useState<string>('')
    const [dateFrom, setDateFrom] = useState<string>('')
    const [dateTo, setDateTo] = useState<string>('')
    const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null)
    const [addAccountOpen, setAddAccountOpen] = useState(false)
    const [addTransactionOpen, setAddTransactionOpen] = useState(false)
    const [transactionMode, setTransactionMode] = useState<'client' | 'treasury'>('client')
    const [selectedAccountForTransaction, setSelectedAccountForTransaction] = useState<string | undefined>()
    const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null)
    const [editAccount, setEditAccount] = useState<ClientAccountWithRelations | null>(null)
    const [viewDetailsAccount, setViewDetailsAccount] = useState<ClientAccountWithRelations | null>(null)
    const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
    const [isExporting, setIsExporting] = useState(false)

    const { data: clientAccounts, isLoading } = useClientAccounts({ search: searchQuery, clientId: clientFilter, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
    const { data: clients } = useClients()
    const deleteClientAccount = useDeleteClientAccount()

    const handleAddTransaction = (accountId: string, mode: 'client' | 'treasury') => {
        setSelectedAccountForTransaction(accountId)
        setTransactionMode(mode)
        setAddTransactionOpen(true)
    }

    const handleDeleteAccount = async () => {
        if (!deleteAccountId) return
        try {
            await deleteClientAccount.mutateAsync(deleteAccountId)
            setDeleteAccountId(null)
        } catch (error) {
            console.error('Failed to delete account:', error)
        }
    }

    const handleExportCSV = () => {
        if (!clientAccounts?.length) return
        setIsExporting(true)
        try {
            const filename = generateFilename('client_accounts', 'csv', isAr)
            const exportData = clientAccounts.map(acc => ({
                ...acc,
                client: acc.client ?? null,
                transactions: acc.transactions ?? []
            }))
            exportClientAccountsToCSV(exportData, filename, isAr)
            toast.success(isAr ? 'تم تصدير الملف بنجاح' : 'File exported successfully')
        } catch (error) {
            console.error('Export CSV Error:', error)
            toast.error(isAr ? 'فشل تصدير الملف' : 'Failed to export file')
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportPDF = async () => {
        if (!clientAccounts?.length) return
        setIsExporting(true)
        try {
            const filename = generateFilename('client_accounts', 'pdf', isAr)
            const exportData = clientAccounts.map(acc => ({
                ...acc,
                client: acc.client ?? null,
                transactions: acc.transactions ?? []
            }))
            await exportClientAccountsToPDF(exportData, filename, isAr)
            toast.success(isAr ? 'تم تصدير الملف بنجاح' : 'File exported successfully')
        } catch (error) {
            console.error('Export PDF Error:', error)
            toast.error(isAr ? 'فشل تصدير الملف' : 'Failed to export file')
        } finally {
            setIsExporting(false)
        }
    }

    const toggleExpanded = (accountId: string) => {
        setExpandedAccountId(expandedAccountId === accountId ? null : accountId)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-cyan-500 tracking-tight">
                        {isAr ? 'حسابات العملاء' : 'Client Accounts'}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {isAr
                            ? 'إدارة حسابات العملاء والمعاملات المرتبطة بها'
                            : 'Manage client accounts and their related transactions'
                        }
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isExporting || !clientAccounts?.length}>
                                <Download className="me-2 h-4 w-4" />
                                {isAr ? 'تصدير' : 'Export'}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleExportCSV}>
                                <FileText className="me-2 h-4 w-4" />
                                {isAr ? 'تصدير CSV' : 'Export CSV'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportPDF}>
                                <FileDown className="me-2 h-4 w-4" />
                                {isAr ? 'تصدير PDF' : 'Export PDF'}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        onClick={() => setAddAccountOpen(true)}
                        size="sm"
                    >
                        <Plus className="me-2 h-4 w-4" />
                        {isAr ? 'حساب جديد' : 'New Account'}
                    </Button>
                    <Button
                        onClick={() => {
                            setSelectedAccountForTransaction(undefined)
                            setTransactionMode('client')
                            setAddTransactionOpen(true)
                        }}
                        variant="outline"
                        size="sm"
                    >
                        <Banknote className="me-2 h-4 w-4" />
                        {isAr ? 'معاملة عميل' : 'Client Transaction'}
                    </Button>

                </div>
            </div>

            {/* Search Filter */}
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[180px] max-w-sm w-full">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={isAr ? 'ابحث عن عميل...' : 'Search client...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ps-9"
                    />
                </div>
                <Select value={clientFilter || '__all__'} onValueChange={(v) => setClientFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder={isAr ? 'العميل' : 'Client'} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">{isAr ? 'الكل' : 'All'}</SelectItem>
                        {clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                                {(client as any).user?.name || client.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {/* From Date Filter */}
                <div className="relative w-full sm:w-auto">
                    <CalendarIcon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="ps-9 pe-8 w-full sm:w-[170px]"
                        title={isAr ? 'من تاريخ' : 'From date'}
                    />
                    {dateFrom && (
                        <button
                            type="button"
                            aria-label={isAr ? 'مسح تاريخ البداية' : 'Clear start date'}
                            onClick={() => setDateFrom('')}
                            className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                {/* To Date Filter */}
                <div className="relative w-full sm:w-auto">
                    <CalendarIcon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="ps-9 pe-8 w-full sm:w-[170px]"
                        title={isAr ? 'إلى تاريخ' : 'To date'}
                    />
                    {dateTo && (
                        <button
                            type="button"
                            aria-label={isAr ? 'مسح تاريخ النهاية' : 'Clear end date'}
                            onClick={() => setDateTo('')}
                            className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                {/* Clear all date filters */}
                {(dateFrom || dateTo) && (
                    <button
                        type="button"
                        onClick={() => { setDateFrom(''); setDateTo('') }}
                        className="text-xs text-muted-foreground hover:text-destructive underline whitespace-nowrap"
                    >
                        {isAr ? 'مسح التواريخ' : 'Clear dates'}
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-10"></TableHead>
                            <TableHead>{isAr ? 'العميل' : 'Client'}</TableHead>
                            <TableHead>{isAr ? 'اسم الباقة' : 'Package Name'}</TableHead>
                            <TableHead className="text-center">{isAr ? 'الرصيد المتبقي' : 'Remaining Balance'}</TableHead>
                            <TableHead>{isAr ? 'تاريخ الإنشاء' : 'Created At'}</TableHead>
                            <TableHead className="text-end">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    {isAr ? 'جاري التحميل...' : 'Loading...'}
                                </TableCell>
                            </TableRow>
                        ) : !clientAccounts || clientAccounts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    {isAr ? 'لا توجد حسابات' : 'No accounts found'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            clientAccounts.map((account) => {
                                const isExpanded = expandedAccountId === account.id
                                const userName = (account.client as any)?.user?.name
                                const clientName = userName || account.client?.name || 'N/A'
                                const packageName = isAr
                                    ? (account.package_name_ar || account.package_name)
                                    : account.package_name
                                const remainingBalance = account.remaining_balance || 0

                                return (
                                    <Fragment key={account.id}>
                                        {/* Main Row */}
                                        <TableRow>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => toggleExpanded(account.id)}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="font-medium">{clientName}</TableCell>
                                            <TableCell>{packageName}</TableCell>
                                            <TableCell className="text-center">
                                                <span
                                                    className={cn(
                                                        'font-semibold',
                                                        remainingBalance < 0 && 'text-destructive',
                                                        remainingBalance === 0 && 'text-muted-foreground',
                                                        remainingBalance > 0 && 'text-primary'
                                                    )}
                                                >
                                                    {remainingBalance.toLocaleString()} ج.م
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {account.created_at
                                                    ? format(new Date(account.created_at), 'PP')
                                                    : 'N/A'
                                                }
                                            </TableCell>
                                            <TableCell className="text-end">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>
                                                            {isAr ? 'إجراءات' : 'Actions'}
                                                        </DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => setViewDetailsAccount(account)}
                                                        >
                                                            <Eye className="me-2 h-4 w-4" />
                                                            {isAr ? 'عرض التفاصيل' : 'View Details'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleAddTransaction(account.id, 'client')}
                                                        >
                                                            <Banknote className="me-2 h-4 w-4" />
                                                            {isAr ? 'معاملة عميل' : 'Client Transaction'}
                                                        </DropdownMenuItem>

                                                        {!isAccountant && (
                                                            <DropdownMenuItem
                                                                onClick={() => setEditAccount(account)}
                                                            >
                                                                <Pencil className="me-2 h-4 w-4" />
                                                                {isAr ? 'تعديل' : 'Edit'}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {!isAccountant && (
                                                            <DropdownMenuItem
                                                                onClick={() => setDeleteAccountId(account.id)}
                                                                className="text-destructive"
                                                            >
                                                                <Trash2 className="me-2 h-4 w-4" />
                                                                {isAr ? 'حذف' : 'Delete'}
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>

                                        {/* Expanded Transactions */}
                                        {isExpanded && account.transactions && account.transactions.length > 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="bg-muted/30 p-4">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium text-sm mb-3">
                                                            {isAr ? 'المعاملات المرتبطة:' : 'Related Transactions:'}
                                                        </h4>
                                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                                            {account.transactions.map((transaction) => (
                                                                <div
                                                                    key={transaction.id}
                                                                    className="flex items-center justify-between p-3 bg-background rounded-md border text-sm"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <Badge
                                                                            variant={
                                                                                transaction.type === 'income'
                                                                                    ? 'default'
                                                                                    : 'destructive'
                                                                            }
                                                                        >
                                                                            {transaction.type === 'income'
                                                                                ? (isAr ? 'دخل' : 'Income')
                                                                                : (isAr ? 'صرف' : 'Expense')
                                                                            }
                                                                        </Badge>
                                                                        <span className="font-medium">
                                                                            {getCategoryLabel(transaction.category, isAr)}
                                                                        </span>
                                                                        {transaction.description && (
                                                                            <span className="text-muted-foreground">
                                                                                - {transaction.description}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <span className="font-semibold">
                                                                            {transaction.amount.toLocaleString()} ج.م
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {transaction.transaction_date
                                                                                ? format(new Date(transaction.transaction_date), 'PP')
                                                                                : 'N/A'
                                                                            }
                                                                        </span>
                                                                        {!isAccountant && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7"
                                                                                onClick={() => setEditTransaction(transaction)}
                                                                            >
                                                                                <Pencil className="h-3 w-3" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {isExpanded && (!account.transactions || account.transactions.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                                                    {isAr ? 'لا توجد معاملات' : 'No transactions'}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialogs */}
            <AddClientAccountDialog
                open={addAccountOpen}
                onOpenChange={setAddAccountOpen}
            />
            <AddClientTransactionDialog
                open={addTransactionOpen}
                onOpenChange={(open) => {
                    setAddTransactionOpen(open)
                    if (!open) setSelectedAccountForTransaction(undefined)
                }}
                defaultClientAccountId={selectedAccountForTransaction}
                mode={transactionMode}
            />
            <EditClientAccountDialog
                open={!!editAccount}
                onOpenChange={(open) => !open && setEditAccount(null)}
                account={editAccount}
            />
            <ClientAccountDetails
                open={!!viewDetailsAccount}
                onOpenChange={(open) => !open && setViewDetailsAccount(null)}
                account={viewDetailsAccount}
            />
            <EditTransactionDialog
                open={!!editTransaction}
                onOpenChange={(open) => !open && setEditTransaction(null)}
                transaction={editTransaction}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteAccountId} onOpenChange={(open) => !open && setDeleteAccountId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {isAr ? 'تأكيد الحذف' : 'Confirm Deletion'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {isAr
                                ? 'هل أنت متأكد من حذف هذا الحساب؟ سيتم حذف جميع المعاملات المرتبطة به.'
                                : 'Are you sure you want to delete this account? All related transactions will be deleted.'
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteAccount}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteClientAccount.isPending ? (
                                <span>{isAr ? 'جاري الحذف...' : 'Deleting...'}</span>
                            ) : (
                                <span>{isAr ? 'حذف' : 'Delete'}</span>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
