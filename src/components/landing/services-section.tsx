'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useLocale } from 'next-intl'
import { Megaphone, Palette, Video, TrendingUp, Camera, PenTool, LucideIcon } from 'lucide-react'
import { usePage } from '@/hooks/use-cms'
import { ServiceCard, FallbackServiceCard } from './cards/ServiceCards'

interface FallbackService {
    icon: LucideIcon
    titleAr: string
    titleEn: string
    descAr: string
    descEn: string
    gradient: string
    accent: string
    span: string // grid span class
}

const FALLBACK_SERVICES: FallbackService[] = [
    {
        icon: Megaphone,
        titleAr: 'إدارة الحملات الإعلانية',
        titleEn: 'Ad Campaigns',
        descAr: 'حملات إعلانية مستهدفة لتحقيق أعلى عائد استثمار وتوسيع نطاق وصولك',
        descEn: 'Laser-targeted campaigns built for maximum ROI and explosive growth',
        gradient: 'from-red-500/20 to-orange-500/20',
        accent: 'text-red-400',
        span: 'md:col-span-1',
    },
    {
        icon: Palette,
        titleAr: 'التصميم الإبداعي',
        titleEn: 'Creative Design',
        descAr: 'تصاميم مبتكرة تعكس هوية علامتك التجارية',
        descEn: 'Visual identities that turn heads and build trust',
        gradient: 'from-purple-500/20 to-pink-500/20',
        accent: 'text-purple-400',
        span: 'md:col-span-1 md:row-span-1',
    },
    {
        icon: Video,
        titleAr: 'إنتاج الفيديو',
        titleEn: 'Video Production',
        descAr: 'فيديوهات احترافية تروي قصتك بأسلوب مبتكر',
        descEn: 'Cinematic stories that captivate audiences',
        gradient: 'from-cyan-500/20 to-blue-500/20',
        accent: 'text-cyan-400',
        span: 'md:col-span-1 md:row-span-1',
    },
    
    {
        icon: Camera,
        titleAr: 'التصوير الاحترافي',
        titleEn: 'Photography',
        descAr: 'صور عالية الجودة تُبرز منتجاتك باحترافية',
        descEn: 'Premium visuals that elevate every pixel',
        gradient: 'from-yellow-500/20 to-primary/20',
        accent: 'text-yellow-400',
        span: 'md:col-span-1 md:row-span-1',
    },
    {
        icon: PenTool,
        titleAr: 'كتابة المحتوى',
        titleEn: 'Content Strategy',
        descAr: 'محتوى إبداعي يحوّل الزوار إلى عملاء دائمين',
        descEn: 'Words that convert browsers into loyal customers',
        gradient: 'from-indigo-500/20 to-violet-500/20',
        accent: 'text-indigo-400',
        span: 'md:col-span-1',
    },
]

const GRADIENT_COLORS = [
    'from-red-500/20 to-orange-500/20',
    'from-purple-500/20 to-pink-500/20',
    'from-cyan-500/20 to-blue-500/20',
    'from-green-500/20 to-emerald-500/20',
    'from-yellow-500/20 to-primary/20',
    'from-indigo-500/20 to-violet-500/20',
]

const ACCENT_COLORS = ['text-red-400', 'text-purple-400', 'text-cyan-400', 'text-green-400', 'text-yellow-400', 'text-indigo-400']
const SPANS = ['md:col-span-1', 'md:col-span-1', 'md:col-span-1', 'md:col-span-1', 'md:col-span-1', 'md:col-span-1']
const ICONS: LucideIcon[] = [Megaphone, Palette, Video, TrendingUp, Camera, PenTool]

export function ServicesSection() {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const { data: page } = usePage('services')
    const prefersReducedMotion = useReducedMotion()

    const content = isAr ? page?.content_ar : page?.content_en
    const cmsItems = (content && typeof content === 'object' && 'items' in (content as Record<string, unknown>))
        ? ((content as Record<string, unknown>).items as Array<Record<string, string>>)
        : null
    const hasCmsData = cmsItems && cmsItems.length > 0

    return (
        <section id="services" className="relative overflow-hidden pt-10 pb-24 md:pt-12 md:pb-28" aria-labelledby="services-heading">
            {/* Background decoration */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 h-[1px] w-[60%] -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <div className="absolute -left-40 top-1/4 h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-[120px]" />
                <div className="absolute -right-40 bottom-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/[0.03] blur-[120px]" />
            </div>

            <div className="container relative z-10 mx-auto px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    className="mb-24 text-center"
                >
                     
                    <h2 id="services-heading" className="mt-6 text-4xl font-black md:text-5xl lg:text-7xl font-serif text-glow-white">
                        {isAr ? 'كل ما تحتاجه ' : 'Everything You '}
                        <span className="text-primary">
                            {isAr ? 'للنجاح' : 'Need to Win'}
                        </span>
                    </h2>
                    <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
                        {isAr
                            ? 'أدوات وخدمات متكاملة تدفع مشروعك من الأرض إلى النجوم'
                            : 'A complete suite of tools to launch your brand from ground to orbit'}
                    </p>
                </motion.div>

                {/* Bento Grid */}
                <div className="grid gap-5 md:grid-cols-2 md:auto-rows-[280px] lg:auto-rows-[300px]">
                    {hasCmsData
                        ? cmsItems.map((item, i) => (
                            <ServiceCard
                                key={item.id || i}
                                item={item}
                                index={i}
                                isAr={isAr}
                                gradient={GRADIENT_COLORS[i % GRADIENT_COLORS.length]}
                                accent={ACCENT_COLORS[i % ACCENT_COLORS.length]}
                                span={SPANS[i % SPANS.length]}
                                IconComponent={ICONS[i % ICONS.length]}
                            />
                        ))
                        : FALLBACK_SERVICES.map((service, i) => (
                            <FallbackServiceCard
                                key={i}
                                service={service}
                                isAr={isAr}
                                index={i}
                            />
                        ))}
                </div>
            </div>
        </section>
    )
}
