'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { Loader2, Search, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form'
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

import type { Package } from '@/types/database'
import { useClients } from '@/hooks/use-clients'
import { usePackages, useCreateClientAccount } from '@/hooks'
import { cn } from '@/lib/utils'

type ClientWithUser = {
    id: string
    name?: string | null
    email?: string | null
    phone?: string | null
    created_at?: string | null
    user?: { id: string; name: string | null; email: string; role: string } | null
    [key: string]: unknown
}

// ============================================
// Schema
// ============================================

const clientAccountSchema = z.object({
    client_id: z.string().min(1, 'Client is required'),
    package_id: z.string().min(1, 'Package is required'),
})

type ClientAccountFormValues = z.infer<typeof clientAccountSchema>

// ============================================
// Component
// ============================================

interface AddClientAccountDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AddClientAccountDialog({ open, onOpenChange }: AddClientAccountDialogProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'

    const [clientSearchOpen, setClientSearchOpen] = useState(false)
    const [clientSearchQuery, setClientSearchQuery] = useState('')
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)

    const { data: clients, isLoading: clientsLoading } = useClients()
    const { data: packages } = usePackages(true) // Active packages only
    const createClientAccount = useCreateClientAccount()

    const form = useForm<ClientAccountFormValues>({
        resolver: zodResolver(clientAccountSchema),
        defaultValues: {
            client_id: '',
            package_id: '',
        },
    })

    const selectedClientId = form.watch('client_id')
    const selectedPackageId = form.watch('package_id')

    const typedClients = clients as ClientWithUser[] | undefined

    // Filter clients based on search query
    const filteredClients = typedClients?.filter((client) => {
        if (!clientSearchQuery) return true
        const query = clientSearchQuery.toLowerCase()
        const displayName = client.user?.name || client.name || ''
        return (
            displayName.toLowerCase().includes(query) ||
            client.email?.toLowerCase().includes(query) ||
            client.phone?.includes(query)
        )
    })

    // Update selected package info when package changes
    useEffect(() => {
        if (selectedPackageId && packages) {
            const pkg = packages.find(p => p.id === selectedPackageId)
            setSelectedPackage(pkg ?? null)
        } else {
            setSelectedPackage(null)
        }
    }, [selectedPackageId, packages])

    const onSubmit = async (values: ClientAccountFormValues) => {
        try {
            await createClientAccount.mutateAsync({
                client_id: values.client_id,
                package_id: values.package_id,
            })
            onOpenChange(false)
            form.reset()
            setSelectedPackage(null)
        } catch (error) {
            console.error('Form submission failed:', error)
        }
    }

    const isLoading = createClientAccount.isPending

    // Find selected client for display
    const selectedClient = typedClients?.find(c => c.id === selectedClientId)

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            onOpenChange(isOpen)
            if (!isOpen) {
                form.reset()
                setSelectedPackage(null)
                setClientSearchQuery('')
                setClientSearchOpen(false)
            }
        }}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isAr ? 'إضافة حساب عميل' : 'Add Client Account'}
                    </DialogTitle>
                    <DialogDescription>
                        {isAr
                            ? 'اختر العميل والباقة لإنشاء حساب جديد'
                            : 'Select client and package to create a new account'
                        }
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Client Selection (Searchable Dropdown) */}
                        <FormField
                            control={form.control}
                            name="client_id"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{isAr ? 'العميل' : 'Client'} *</FormLabel>
                                    <Popover open={clientSearchOpen} onOpenChange={(open) => {
                                        setClientSearchOpen(open)
                                        if (!open) setClientSearchQuery('')
                                    }}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    type="button"
                                                    className={cn(
                                                        'w-full justify-between',
                                                        !field.value && 'text-muted-foreground'
                                                    )}
                                                >
                                                    <span className="truncate">
                                                        {field.value
                                                            ? (selectedClient?.user?.name || selectedClient?.name || selectedClient?.email || 'عميل')
                                                            : (isAr ? 'اختر العميل...' : 'Select client...')
                                                        }
                                                    </span>
                                                    <Search className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0 z-[200]" align="start">
                                            <div className="flex flex-col max-h-[360px] overflow-hidden">
                                                {/* Search Input */}
                                                <div className="flex items-center border-b px-3 shrink-0">
                                                    <Search className="me-2 h-4 w-4 shrink-0 opacity-50" />
                                                    <input
                                                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                                        placeholder={isAr ? 'ابحث عن عميل...' : 'Search client...'}
                                                        value={clientSearchQuery}
                                                        onChange={(e) => setClientSearchQuery(e.target.value)}
                                                    />
                                                </div>
                                                {/* Client List */}
                                                <div className="flex-1 overflow-y-auto p-1">
                                                    {clientsLoading ? (
                                                        <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            {isAr ? 'جاري التحميل...' : 'Loading...'}
                                                        </div>
                                                    ) : !filteredClients || filteredClients.length === 0 ? (
                                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                                            {isAr ? 'لا يوجد عملاء' : 'No clients found'}
                                                        </div>
                                                    ) : (
                                                        filteredClients.map((client) => {
                                                            const displayName = client.user?.name || client.name || client.email || 'عميل بدون اسم'
                                                            const subtitle = client.email
                                                            const createdDate = client.created_at 
                                                                ? format(new Date(client.created_at), 'PPP', { locale: isAr ? ar : enUS })
                                                                : ''
                                                            const isSelected = client.id === field.value
                                                            
                                                            return (
                                                                <div
                                                                    key={client.id}
                                                                    onClick={() => {
                                                                        field.onChange(client.id)
                                                                        setClientSearchOpen(false)
                                                                        setClientSearchQuery('')
                                                                    }}
                                                                    className={cn(
                                                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                                                        isSelected && "bg-accent"
                                                                    )}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "me-2 h-4 w-4 shrink-0",
                                                                            isSelected ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div className="flex flex-col flex-1 min-w-0">
                                                                        <span className="font-medium truncate">
                                                                            {displayName}
                                                                        </span>
                                                                        {subtitle && (
                                                                            <span className="text-xs text-muted-foreground truncate">
                                                                                {subtitle}
                                                                            </span>
                                                                        )}
                                                                        {createdDate && (
                                                                            <span className="text-xs text-muted-foreground mt-0.5">
                                                                                {isAr ? 'أضيف في: ' : 'Added: '}{createdDate}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>
                                        {isAr ? 'العميل يمكنه الاشتراك في أكثر من باقة' : 'Client can subscribe to multiple packages'}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Package Selection */}
                        <FormField
                            control={form.control}
                            name="package_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{isAr ? 'الباقة' : 'Package'} *</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={isAr ? 'اختر الباقة' : 'Select package'} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent position="popper" className="max-h-[200px]">
                                            {packages?.map((pkg) => (
                                                <SelectItem key={pkg.id} value={pkg.id}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{isAr ? (pkg.name_ar || pkg.name) : pkg.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            ({pkg.price.toLocaleString()} ج.م)
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Package Info Display */}
                        {selectedPackage && (
                            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {isAr ? 'سعر الباقة:' : 'Package Price:'}
                                    </span>
                                    <span className="font-semibold">
                                        {selectedPackage.price.toLocaleString()} ج.م
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {isAr ? 'المدة:' : 'Duration:'}
                                    </span>
                                    <span className="font-semibold">
                                        {selectedPackage.duration_days} {isAr ? 'يوم' : 'days'}
                                    </span>
                                </div>
                                {selectedPackage.description && (
                                    <p className="text-xs text-muted-foreground pt-2 border-t">
                                        {isAr ? (selectedPackage.description_ar || selectedPackage.description) : selectedPackage.description}
                                    </p>
                                )}
                            </div>
                        )}

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                {isAr ? 'إلغاء' : 'Cancel'}
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                {isAr ? 'إضافة الحساب' : 'Add Account'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
