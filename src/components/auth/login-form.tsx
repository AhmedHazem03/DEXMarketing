'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'

export function LoginForm() {
    const t = useTranslations('auth')
    const common = useTranslations('common')
    const locale = useLocale()
    const isAr = locale === 'ar'
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const formSchema = z.object({
        email: z.string().email({ message: isAr ? 'البريد الإلكتروني غير صالح' : 'Invalid email address' }),
        password: z.string().min(6, { message: isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters' }),
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        const supabase = createClient()

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            })

            if (error) {
                toast.error(isAr ? 'فشل تسجيل الدخول: ' + error.message : 'Login failed: ' + error.message)
                return
            }

            toast.success(isAr ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully')

            // Fetch user identity
            const { data: { user } } = await supabase.auth.getUser()

            // Log login activity (fire-and-forget for performance)
            if (user) {
                supabase.from('activity_log').insert({ user_id: user.id, action: 'login', details: { email: values.email } }).then()
            }

            if (!user) {
                router.push('/login')
                return
            }

            // Check DB for the most up-to-date role
            let role = user.user_metadata?.role

            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile) {
                role = profile.role
            }

            const normalizedRole = role ? String(role).toLowerCase().trim() : ''

            switch (normalizedRole) {
                case 'admin':
                    router.push('/admin')
                    break;
                case 'client':
                    router.push('/client')
                    break;
                case 'team_leader':
                    router.push('/team-leader')
                    break;
                case 'creator':
                case 'designer':
                    router.push('/creator')
                    break;
                case 'accountant':
                    router.push('/accountant')
                    break;
                case 'photographer':
                    router.push('/photographer')
                    break;
                case 'videographer':
                    router.push('/videographer')
                    break;
                case 'editor':
                    router.push('/editor')
                    break;
                case 'account_manager':
                    router.push('/account-manager')
                    break;
                case 'moderator':
                    router.push('/moderator')
                    break;
                default:
                    router.push('/client')
            }

        } catch (error) {
            toast.error(isAr ? 'حدث خطأ ما' : 'Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>{isAr ? 'تسجيل الدخول' : t('login')}</CardTitle>
                <CardDescription>
                    {isAr ? 'أدخل بيانات الدخول للوصول إلى النظام' : 'Enter your credentials to access the system'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{isAr ? 'البريد الإلكتروني' : t('email')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="name@example.com" {...field} className={isAr ? "text-right" : ""} />
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
                                    <FormLabel>{isAr ? 'كلمة المرور' : t('password')}</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} className={isAr ? "text-right" : ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (isAr ? 'جاري التحميل...' : common('loading')) : (isAr ? 'تسجيل الدخول' : t('login'))}
                        </Button>
                    </form>
                </Form>
            </CardContent>
            {/* Registration disabled
            <CardFooter className="flex justify-center">
                <Link href="/register" className="text-sm text-muted-foreground hover:underline">
                    {isAr ? 'ليس لديك حساب؟ سجل الآن' : "Don't have an account? Register"}
                </Link>
            </CardFooter>
            */}
        </Card>
    )
}
