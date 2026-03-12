'use client'

import { motion } from 'framer-motion'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { PortfolioItem, FallbackPortfolioItem } from './cards/PortfolioCards'
import { usePage } from '@/hooks/use-cms'
import { useState, useCallback } from 'react'
import { GRADIENT_COLORS } from '@/lib/constants/landing'

import { Link } from '@/i18n/navigation'

// Fallback data when CMS has no content
const FALLBACK_PROJECTS = [
    { titleAr: 'حملة إطلاق منتج', titleEn: 'Product Launch Campaign', category: 'Marketing', categoryAr: 'تسويق', color: 'from-red-500 to-orange-500' },
    { titleAr: 'هوية بصرية متكاملة', titleEn: 'Full Brand Identity', category: 'Branding', categoryAr: 'برندينج', color: 'from-purple-500 to-pink-500' },
    { titleAr: 'فيديو إعلاني', titleEn: 'Commercial Video', category: 'Video', categoryAr: 'فيديو', color: 'from-cyan-500 to-blue-500' },
    { titleAr: 'موقع تجاري', titleEn: 'E-commerce Website', category: 'Web', categoryAr: 'ويب', color: 'from-green-500 to-emerald-500' },
    { titleAr: 'حملة سوشيال ميديا', titleEn: 'Social Media Campaign', category: 'Social', categoryAr: 'سوشيال', color: 'from-yellow-500 to-primary' },
    { titleAr: 'تصوير منتجات', titleEn: 'Product Photography', category: 'Photo', categoryAr: 'تصوير', color: 'from-indigo-500 to-violet-500' },
] as const

export function PortfolioSection() {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const { data: page } = usePage('portfolio')
    const [playingVideo, setPlayingVideo] = useState<string | null>(null)

    const handlePlayVideo = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setPlayingVideo(id)
    }, [])

    // Try to read CMS items
    const content = isAr ? page?.content_ar : page?.content_en
    const cmsItems = (content && typeof content === 'object' && 'items' in (content as Record<string, unknown>))
        ? ((content as Record<string, unknown>).items as Array<Record<string, string>>)
        : null

    const hasCmsData = cmsItems && cmsItems.length > 0

    return (
        <section id="portfolio" className="relative overflow-hidden bg-transparent pt-24 pb-10 md:pt-28 md:pb-12" aria-labelledby="portfolio-heading">
            <div className="container relative z-10 mx-auto px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.8 }}
                    className="mb-24"
                >
                    <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
                        <div>
                           
                            <h2 id="portfolio-heading" className="text-5xl md:text-7xl font-black leading-tight text-glow-white">
                                {isAr ? 'مشاريع ' : 'Projects '}
                                <span className="block text-primary">
                                    {isAr ? 'تُلهم العالم' : 'That Inspire'}
                                </span>
                            </h2>
                        </div>
                        <Link href="/portfolio" className="flex-shrink-0">
                            <Button
                                variant="outline"
                                size="lg"
                                className="group rounded-2xl border-primary/40 bg-primary/10 px-8 py-6 font-semibold text-primary hover:border-primary hover:bg-primary hover:text-background transition-all duration-300 hover:scale-[1.02]"
                            >
                                {isAr ? 'كل الأعمال' : 'View All Projects'}
                                {isAr
                                    ? <ArrowLeft className="ms-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                                    : <ArrowRight className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                }
                            </Button>
                        </Link>
                    </div>
                </motion.div>

                {/* Portfolio Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {hasCmsData ? (
                        cmsItems.map((item, i) => (
                            <PortfolioItem
                                key={item.id || i}
                                item={item}
                                index={i}
                                isPlaying={playingVideo === item.id}
                                onPlay={(e) => handlePlayVideo(item.id || String(i), e)}
                                gradientColor={GRADIENT_COLORS[i % GRADIENT_COLORS.length]}
                            />
                        ))
                    ) : (
                        FALLBACK_PROJECTS.map((project, i) => (
                            <FallbackPortfolioItem
                                key={i}
                                project={project}
                                index={i}
                                isAr={isAr}
                            />
                        ))
                    )}
                </div>
            </div>
        </section>
    )
}
