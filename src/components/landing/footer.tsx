'use client'

import { useLocale } from 'next-intl'
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useSiteSettingsContext } from '@/components/providers/site-settings-provider'
import { createClient } from '@/lib/supabase/client'
import { useAuthDashboardLink } from '@/hooks/use-auth-dashboard-link'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'

interface FooterProps {
    initialUser?: User | null
    initialRole?: string
}

const QUICK_LINKS_AR = ['الرئيسية', 'من نحن', 'خدماتنا', 'أعمالنا', 'تواصل معنا'] as const
const QUICK_LINKS_EN = ['Home', 'About Us', 'Services', 'Portfolio', 'Contact Us'] as const
const QUICK_LINK_HREFS = ['/', '/about', '/services', '/portfolio', '/contact'] as const

export function Footer({ initialUser, initialRole }: FooterProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const settings = useSiteSettingsContext()
    const { user, dashboardLink } = useAuthDashboardLink(initialUser, initialRole)

    // Contact info from CMS — cached via React Query with 5min stale time
    const { data: contactInfo = {} } = useQuery({
        queryKey: ['footer-contact', isAr ? 'ar' : 'en'],
        queryFn: async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('pages')
                .select('content_ar, content_en')
                .eq('slug', 'contact')
                .single()

            if (!data) return {}
            const content = isAr
                ? (data as Record<string, unknown>).content_ar
                : (data as Record<string, unknown>).content_en

            try {
                const parsed = typeof content === 'string' ? JSON.parse(content) : content
                if (parsed && typeof parsed === 'object') {
                    return {
                        email: (parsed as Record<string, string>).email,
                        phone: (parsed as Record<string, string>).phone,
                        address: (parsed as Record<string, string>).address,
                    }
                }
            } catch {
                // not JSON — ignore
            }
            return {}
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000,   // 10 minutes
    })

    const phone = contactInfo.phone || settings.contact_phone || '+20 123 456 7890'
    const email = contactInfo.email || settings.contact_email || 'info@dex-advertising.com'
    const address = contactInfo.address
        || (isAr ? (settings.contact_address_ar || 'القاهرة، مصر') : (settings.contact_address_en || 'Cairo, Egypt'))

    const TikTokIcon = () => (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
        </svg>
    )

    const socialLinks = [
        { icon: <Facebook className="h-4 w-4" />, href: settings.social_facebook || '#', label: 'Facebook' },
        { icon: <Instagram className="h-4 w-4" />, href: settings.social_instagram || '#', label: 'Instagram' },
        { icon: <Twitter className="h-4 w-4" />, href: settings.social_twitter || '#', label: 'Twitter' },
        { icon: <TikTokIcon />, href: settings.social_tiktok || '#', label: 'TikTok' },
    ]

    return (
        <footer className="relative bg-[#011C1F] text-white pt-20 pb-10 overflow-hidden border-t border-white/[0.04]">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <div className="absolute -top-[500px] -left-[500px] w-[1000px] h-[1000px] bg-primary/[0.02] rounded-full blur-[200px] pointer-events-none" />
            <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/[0.02] rounded-full blur-[200px] pointer-events-none" />

            <div className="container relative z-10 px-6 mx-auto">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
                    {/* Brand Column */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="flex items-center">
                            <Image
                                src="/images/DEX LOGO 2.png"
                                alt="DEX Advertising"
                                width={200}
                                height={100}
                                className="w-[120px] h-auto object-contain
                                           drop-shadow-[0_0_10px_rgba(251,191,36,0.30)]"
                            />
                        </div>
                        <p className="text-gray-400 leading-relaxed max-w-sm text-base">
                            {isAr
                                ? 'شريكك الاستراتيجي في رحلة التحول الرقمي. نبتكر حلولاً تسويقية ذكية تدفع أعمالك نحو النمو والريادة.'
                                : 'Your strategic partner in digital transformation. We innovate smart marketing solutions that drive your business towards growth and leadership.'
                            }
                        </p>

                        {/* Social Icons */}
                        <div className="flex gap-3 pt-2">
                            {socialLinks.map(({ icon, href, label }) => (
                                <a
                                    key={label}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={label}
                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-primary hover:text-white hover:scale-110 flex items-center justify-center transition-all duration-300 text-gray-400 border border-white/5"
                                >
                                    {icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="lg:col-span-2 lg:col-start-6">
                        <h4 className="font-bold text-lg mb-6 text-white inline-block relative after:content-[''] after:absolute after:bottom-[-8px] after:start-0 after:w-10 after:h-1 after:bg-primary after:rounded-full">
                            {isAr ? 'الشركة' : 'Company'}
                        </h4>
                        <ul className="space-y-4">
                            {QUICK_LINK_HREFS.map((href, i) => (
                                <li key={href}>
                                    <Link href={href} className="text-gray-400 hover:text-primary transition-colors flex items-center gap-2 group">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/0 group-hover:bg-primary transition-colors" />
                                        {isAr ? QUICK_LINKS_AR[i] : QUICK_LINKS_EN[i]}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal / Support */}
                    <div className="lg:col-span-2">
                        <h4 className="font-bold text-lg mb-6 text-white inline-block relative after:content-[''] after:absolute after:bottom-[-8px] after:start-0 after:w-10 after:h-1 after:bg-primary after:rounded-full">
                            {isAr ? 'الدعم' : 'Support'}
                        </h4>
                        <ul className="space-y-4 text-gray-400">
                            {[
                                { href: '/services', labelAr: 'مركز المساعدة', labelEn: 'Help Center' },
                                { href: '/privacy', labelAr: 'سياسة الخصوصية', labelEn: 'Privacy Policy' },
                                { href: '/terms', labelAr: 'الشروط والأحكام', labelEn: 'Terms & Conditions' },
                            ].map(({ href, labelAr, labelEn }) => (
                                <li key={href}>
                                    <Link href={href} className="hover:text-primary transition-colors flex items-center gap-2 group">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/0 group-hover:bg-primary transition-colors" />
                                        {isAr ? labelAr : labelEn}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <Link href={dashboardLink} className="hover:text-primary transition-colors flex items-center gap-2 group">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/0 group-hover:bg-primary transition-colors" />
                                    {user
                                        ? (isAr ? 'لوحة التحكم' : 'Go to Dashboard')
                                        : (isAr ? 'دخول العملاء' : 'Client Login')
                                    }
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="lg:col-span-4">
                        <h4 className="font-bold text-lg mb-6 text-white inline-block relative after:content-[''] after:absolute after:bottom-[-8px] after:start-0 after:w-10 after:h-1 after:bg-primary after:rounded-full">
                            {isAr ? 'تواصل معنا' : 'Get in Touch'}
                        </h4>

                        <div className="space-y-4 mb-8">
                            <a href={`mailto:${email}`} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{isAr ? 'راسلنا' : 'Email Us'}</span>
                                    <span className="text-gray-200 font-medium">{email}</span>
                                </div>
                            </a>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{isAr ? 'اتصل بنا' : 'Call Us'}</span>
                                    <span className="text-gray-200 font-medium" dir="ltr">{phone}</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mt-1">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{isAr ? 'زورنا' : 'Visit Us'}</span>
                                    <span className="text-gray-200 font-medium leading-snug">{address}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Bottom */}
                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-500 text-sm font-medium">
                        &copy; {new Date().getFullYear()} DEX Advertising. {isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}
                    </p>
                    <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
                        <span>Designed & Developed by DEX Tech Team</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
