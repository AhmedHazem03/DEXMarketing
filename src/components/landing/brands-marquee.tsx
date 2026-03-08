'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useLocale } from 'next-intl'

const BRANDS = [
    { name: 'Royal Brands',   color: '#fbbf24' },
    { name: 'TechVault',      color: '#38bdf8' },
    { name: 'Bella Fashion',  color: '#ec4899' },
    { name: 'Urban Fitness',  color: '#4ade80' },
    { name: 'EatFresh',       color: '#f97316' },
    { name: 'Nova Events',    color: '#a78bfa' },
    { name: 'Bloom Boutique', color: '#fb7185' },
    { name: 'Arabica Coffee', color: '#d97706' },
    { name: 'LuxeHome',       color: '#34d399' },
    { name: 'FitZone',        color: '#60a5fa' },
    { name: 'Skyline Dev',    color: '#c084fc' },
    { name: 'Pulse Media',    color: '#f43f5e' },
]

export function BrandsMarquee() {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const prefersReducedMotion = useReducedMotion()

    const doubled = [...BRANDS, ...BRANDS]

    return (
        <section className="relative overflow-hidden py-10 md:py-14 bg-[#022026]">
            {/* Top & bottom lines */}
            <div className="section-divider absolute top-0 left-0 right-0" />
            <div className="section-divider absolute bottom-0 left-0 right-0" />

            <div className="container relative z-10 mx-auto px-6 mb-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <span className="section-label">
                        {isAr ? 'شركاء النجاح' : 'Trusted By Leading Brands'}
                    </span>
                </motion.div>
            </div>

            {/* Fade edges */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-28 bg-gradient-to-r from-[#022026] to-transparent md:w-48" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-28 bg-gradient-to-l from-[#022026] to-transparent md:w-48" />

            <div className="overflow-hidden">
                <motion.div
                    className="flex items-center gap-4"
                    animate={prefersReducedMotion ? undefined : { x: isAr ? ['0%', '50%'] : ['0%', '-50%'] }}
                    transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
                >
                    {doubled.map((brand, i) => (
                        <div
                            key={`${brand.name}-${i}`}
                            className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 cursor-default"
                        >
                            <span
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{
                                    backgroundColor: brand.color,
                                    boxShadow: `0 0 8px ${brand.color}70`,
                                }}
                            />
                            <span
                                className="whitespace-nowrap text-sm font-bold tracking-wide"
                                style={{ color: 'rgba(255,255,255,0.28)' }}
                            >
                                {brand.name}
                            </span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}

