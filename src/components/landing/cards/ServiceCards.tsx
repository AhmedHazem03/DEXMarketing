'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import Image from 'next/image'
import GlareHover from '../../ui/GlareHover'

interface ServiceCardProps {
    item: Record<string, string>
    index: number
    isAr: boolean
    gradient: string
    accent: string
    span: string
    IconComponent: LucideIcon
}

export function ServiceCard({ item, index, isAr, gradient, accent, span, IconComponent }: ServiceCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ delay: index * 0.08, duration: 0.5 }}
            className={`group relative rounded-3xl glass-card ${span}`}
        >
            <GlareHover
                glareColor="#f2cb05"
                glareOpacity={0.12}
                glareAngle={-30}
                glareSize={280}
                className="h-full p-8"
            >
                {/* Gradient accent on hover */}
                <div className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${gradient} opacity-[0.04] transition-opacity duration-500 group-hover:opacity-[0.12]`} />

                {/* Ambient top-right glow */}
                <div className="pointer-events-none absolute -end-8 -top-8 h-40 w-40 rounded-full bg-primary/8 blur-3xl opacity-60 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative z-10 flex h-full flex-col justify-between">
                    <div>
                        {item.image ? (
                            <div className="relative mb-5 h-14 w-14 overflow-hidden rounded-2xl ring-1 ring-white/12 shadow-lg shadow-black/30">
                                <Image src={item.image} alt={item.title || ''} fill className="object-cover" sizes="56px" loading="lazy" />
                            </div>
                        ) : (
                            <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.07] backdrop-blur-sm ${accent} transition-all duration-400 group-hover:scale-110 group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:shadow-[0_0_24px_rgba(251,191,36,0.2)]`}>
                                <IconComponent className="h-7 w-7" />
                            </div>
                        )}
                        <h3 className="mb-2 text-xl font-bold text-white">{item.title || ''}</h3>
                        <p className="text-sm leading-relaxed text-white/50">{item.description || ''}</p>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/30 transition-colors duration-300 group-hover:text-primary">
                        <span>{isAr ? 'اعرف المزيد' : 'Learn more'}</span>
                        <span className="transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">→</span>
                    </div>
                </div>
            </GlareHover>
        </motion.div>
    )
}

interface FallbackService {
    icon: LucideIcon
    titleAr: string
    titleEn: string
    descAr: string
    descEn: string
    gradient: string
    accent: string
    span: string
}

interface FallbackServiceCardProps {
    service: FallbackService
    isAr: boolean
    index: number
}

export function FallbackServiceCard({ service, isAr, index }: FallbackServiceCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ delay: index * 0.08, duration: 0.5 }}
            className={`group relative rounded-3xl glass-card ${service.span}`}
        >
            <GlareHover
                glareColor="#f2cb05"
                glareOpacity={0.12}
                glareAngle={-30}
                glareSize={280}
                className="h-full p-8"
            >
                {/* Gradient accent */}
                <div className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${service.gradient} opacity-[0.04] transition-opacity duration-500 group-hover:opacity-[0.12]`} />

                {/* Ambient top-end glow */}
                <div className="pointer-events-none absolute -end-8 -top-8 h-40 w-40 rounded-full bg-primary/8 blur-3xl opacity-50 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative z-10 flex h-full flex-col justify-between">
                    <div>
                        {/* Icon box */}
                        <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.07] backdrop-blur-sm ${service.accent} transition-all duration-400 group-hover:scale-110 group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:shadow-[0_0_24px_rgba(251,191,36,0.2)]`}>
                            <service.icon className="h-7 w-7" />
                        </div>
                        <h3 className="mb-2 text-xl font-bold text-white lg:text-2xl">
                            {isAr ? service.titleAr : service.titleEn}
                        </h3>
                        <p className="text-sm leading-relaxed text-white/50 lg:text-base">
                            {isAr ? service.descAr : service.descEn}
                        </p>
                    </div>

                </div>
            </GlareHover>
        </motion.div>
    )
}
