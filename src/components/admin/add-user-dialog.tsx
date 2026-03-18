'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { UserPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createUser } from '@/lib/actions/users'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

const DEPARTMENT_REQUIRED_ROLES = ['team_leader', 'account_manager', 'videographer', 'editor', 'photographer', 'creator', 'designer'] as const

function createFormSchema(t: ReturnType<typeof useTranslations<'addUser'>>) {
    return z.object({
        name: z.string().min(2, t('nameMin')),
        email: z.string().email(t('emailInvalid')),
        password: z.string().min(8, t('passwordMin')).regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            t('passwordComplexity')
        ),
        role: z.enum(['admin', 'accountant', 'team_leader', 'account_manager', 'creator', 'designer', 'client', 'videographer', 'editor', 'photographer']),
        department: z.enum(['photography', 'content']).nullable().optional(),
    }).superRefine((data, ctx) => {
        // Only team_leader picks a department manually; all other roles are auto-assigned
        if (data.role === 'team_leader' && !data.department) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: t('departmentRequired'),
                path: ['department'],
            })
        }
    })
}

export function AddUserDialog() {
    const t = useTranslations('addUser')
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const queryClient = useQueryClient()
    const formSchema = createFormSchema(t)

    const handleOpenChange = (value: boolean) => {
        if (!value && isLoading) return // منع الإغلاق أثناء التحميل
        if (!value) {
            form.reset()
            setIsLoading(false)
        }
        setOpen(value)
    }

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            role: 'client',
            department: null,
        }
    })

    const selectedRole = form.watch('role')
    const needsDepartment = DEPARTMENT_REQUIRED_ROLES.includes(selectedRole as any)

    // Auto-set department for photography-only roles
    const autoDepartmentRoles: Record<string, 'photography' | 'content'> = {
        videographer: 'photography',
        editor: 'photography',
        photographer: 'photography',
        creator: 'content',
        designer: 'content',
        account_manager: 'content',
    }

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        // Auto-resolve department if role has a fixed department
        const department = autoDepartmentRoles[values.role] || values.department || null
        setIsLoading(true)
        try {
            const res = await createUser({ ...values, department: department ?? undefined })
            if (res.success) {
                toast.success(t('success'))
                queryClient.invalidateQueries({ queryKey: ['users'] })
                form.reset()
                setOpen(false)
            } else {
                toast.error(res.error || t('error'))
            }
        } catch (err) {
            toast.error(t('unexpectedError'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="h-4 w-4 me-2" />
                    {t('addMember')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>
                        {t('description')}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('name')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('namePlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('email')}</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="example@dex.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('password')}</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder={t('passwordPlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('role')}</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('rolePlaceholder')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                                            <SelectItem value="account_manager">{t('roles.account_manager')}</SelectItem>
                                            <SelectItem value="team_leader">{t('roles.team_leader')}</SelectItem>
                                            <SelectItem value="accountant">{t('roles.accountant')}</SelectItem>
                                            <SelectItem value="creator">{t('roles.creator')}</SelectItem>
                                            <SelectItem value="designer">{t('roles.designer')}</SelectItem>
                                            <SelectItem value="videographer">{t('roles.videographer')}</SelectItem>
                                            <SelectItem value="editor">{t('roles.editor')}</SelectItem>
                                            <SelectItem value="photographer">{t('roles.photographer')}</SelectItem>
                                            <SelectItem value="client">{t('roles.client')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Department selector for team_leader role */}
                        {selectedRole === 'team_leader' && (
                            <FormField
                                control={form.control}
                                name="department"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('department')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('departmentPlaceholder')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="photography">{t('departmentPhotography')}</SelectItem>
                                                <SelectItem value="content">{t('departmentContent')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <DialogFooter className="pt-4">
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                {t('createAccount')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
