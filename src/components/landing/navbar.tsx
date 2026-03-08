'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { Link } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import { LanguageSwitcher } from '@/components/common/language-switcher'
import { useAuthDashboardLink } from '@/hooks/use-auth-dashboard-link'
import { useThrottle } from '@/hooks/use-throttle'
import type { User } from '@supabase/supabase-js'

interface NavbarProps {
    initialUser?: User | null
    initialRole?: string
}

const NAV_LINKS = [
    { href: '/about', labelAr: 'من نحن', labelEn: 'About' },
    { href: '/services', labelAr: 'خدماتنا', labelEn: 'Services' },
    { href: '/portfolio', labelAr: 'أعمالنا', labelEn: 'Work' },
    { href: '/contact', labelAr: 'تواصل معنا', labelEn: 'Contact' },
] as const

export function Navbar({ initialUser, initialRole }: NavbarProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const { user, dashboardLink, handleLogout } = useAuthDashboardLink(initialUser, initialRole)

    // Scroll progress for the thin bottom bar
    const { scrollYProgress } = useScroll()
    const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

    // Throttled scroll handler - runs at most once every 150ms
    const handleScroll = useThrottle(() => {
        setIsScrolled(window.scrollY > 50)
    }, 150)

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [handleScroll])

    const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), [])

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ position: 'fixed' }} // Explicitly set position for Framer Motion
            className={`top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
                    ? 'bg-background/60 backdrop-blur-2xl shadow-[0_1px_0_rgba(255,255,255,0.04)] border-b border-white/[0.04]'
                    : ''
                }`}
        >
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link href="/" className="group flex items-center">
                        <Image
                            src="/images/DEX LOGO 2.png"
                            alt="DEX Advertising"
                            width={160}
                            height={80}
                            className="w-[88px] h-auto object-contain transition-transform duration-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.30)] hover:drop-shadow-[0_0_22px_rgba(251,191,36,0.85)] hover:scale-105"
                            priority
                        />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="relative px-4 py-2 text-[15px] font-semibold text-white/55 transition-colors hover:text-white rounded-xl hover:bg-white/[0.04]"
                            >
                                {isAr ? link.labelAr : link.labelEn}
                            </Link>
                        ))}
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />

                        {user ? (
                            <>
                                <Link href={dashboardLink} className="hidden sm:block">
                                    <Button className="rounded-xl bg-primary px-6 font-semibold text-background shadow-[0_0_20px_rgba(251,191,36,0.18)] transition-colors hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(251,191,36,0.28)]">
                                        {isAr ? 'لوحة التحكم' : 'Dashboard'}
                                    </Button>
                                </Link>
                                <Button
                                    variant="ghost"
                                    onClick={handleLogout}
                                    className="hidden sm:block font-semibold text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-xl"
                                >
                                    {isAr ? 'خروج' : 'Logout'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="hidden sm:block">
                                    <Button variant="ghost" className="rounded-xl font-medium text-white/50 hover:text-white hover:bg-white/[0.04]">
                                        {isAr ? 'الدخول' : 'Login'}
                                    </Button>
                                </Link>
                                <Link href="/register">
                                    <Button className="rounded-xl bg-primary px-6 font-semibold text-background shadow-[0_0_20px_rgba(251,191,36,0.18)] transition-colors hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(251,191,36,0.28)]">
                                        {isAr ? 'ابدأ الآن' : 'Get Started'}
                                    </Button>
                                </Link>
                            </>
                        )}

                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden rounded-xl text-primary hover:text-background hover:bg-primary/90"
                            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <X /> : <Menu />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Scroll progress bar */}
            <motion.div
                className="absolute bottom-0 left-0 h-[2px] origin-left bg-primary"
                style={{ width: progressWidth, opacity: isScrolled ? 1 : 0 }}
            />

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-background/95 backdrop-blur-2xl border-b border-white/[0.04]"
                    >
                        <div className="container mx-auto px-6 py-6 space-y-1">
                            {NAV_LINKS.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={closeMobileMenu}
                                    className="block rounded-xl px-4 py-3 text-lg font-medium text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white"
                                >
                                    {isAr ? link.labelAr : link.labelEn}
                                </Link>
                            ))}
                            <div className="pt-4 mt-4 border-t border-white/[0.06]">
                                {user ? (
                                    <>
                                        <Link href={dashboardLink} onClick={closeMobileMenu} className="block rounded-xl px-4 py-3 text-primary font-bold">
                                            {isAr ? 'لوحة التحكم' : 'Dashboard'}
                                        </Link>
                                        <button onClick={handleLogout} className="block w-full text-start rounded-xl px-4 py-3 text-primary font-bold transition-colors hover:bg-primary/10">
                                            {isAr ? 'تسجيل الخروج' : 'Logout'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/login" onClick={closeMobileMenu} className="block rounded-xl px-4 py-3 text-white/50">
                                            {isAr ? 'تسجيل الدخول' : 'Login'}
                                        </Link>
                                        <Link href="/register" onClick={closeMobileMenu} className="block rounded-xl px-4 py-3 text-primary font-bold">
                                            {isAr ? 'ابدأ الآن' : 'Get Started'}
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    )
}
