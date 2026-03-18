'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { Menu, Search, User, UserCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NotificationsPopover } from '@/components/shared/notifications-popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from '@/i18n/navigation'

import { MobileSidebar } from '@/components/layout/mobile-sidebar'
import type { Department } from '@/types/database'
import { useLogout } from '@/hooks/use-logout'

export function Header({ user, role, department, avatarUrl }: { user?: any, role?: string, department?: Department | null, avatarUrl?: string }) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const router = useRouter()
    // Defer Radix UI components (Sheet, Popover, DropdownMenu) until after
    // hydration. Their internal useId() generates different IDs on server vs
    // client, causing harmless but noisy hydration-mismatch warnings.
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    const handleLogout = useLogout()

    const navigateToAccount = () => {
        router.push(`/${locale}/account`)
    }

    const navigateToProfile = () => {
        router.push(`/profile`)
    }

    return (
        <header className="flex h-16 items-center border-b bg-background px-6" suppressHydrationWarning>
            {mounted ? (
                <MobileSidebar role={role} department={department} />
            ) : (
                <Button variant="ghost" size="icon" className="md:hidden me-4" aria-hidden>
                    <Menu className="h-5 w-5" />
                </Button>
            )}

            <div className="flex flex-1 items-center gap-4">
                <div className="relative w-full max-w-sm hidden md:flex">
                    <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder={isAr ? 'بحث...' : 'Search...'}
                        className="w-full bg-background ps-8"
                        aria-label={isAr ? 'بحث' : 'Search'}
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                {mounted && <NotificationsPopover />}

                {mounted ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={avatarUrl || ''} alt={user?.email || ''} />
                                    <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                             
                            
                            <DropdownMenuItem onClick={navigateToProfile} className="cursor-pointer">
                                <User className="me-2 h-4 w-4" />
                                {isAr ? 'الملف الشخصي' : 'Profile'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                                {isAr ? 'تسجيل الخروج' : 'Log out'}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-hidden>
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={avatarUrl || ''} alt={user?.email || ''} />
                            <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                    </Button>
                )}
            </div>
        </header>
    )
}
