'use client'

import { motion } from 'framer-motion'
import { Play, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import GlareHover from '../../ui/GlareHover'

function isVideoUrl(url?: string): boolean {
    if (!url) return false
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.includes('/video/')
}

// Check if URL is external (starts with http:// or https://)
function isExternalUrl(url?: string): boolean {
    if (!url) return false
    return url.startsWith('http://') || url.startsWith('https://')
}

interface PortfolioItemProps {
    item: Record<string, string>
    index: number
    gradientColor: string
    isPlaying: boolean
    onPlay: (e: React.MouseEvent) => void
}

export function PortfolioItem({ item, index, gradientColor, isPlaying, onPlay }: PortfolioItemProps) {
    const hasMedia = !!item.media
    const isVideo = isVideoUrl(item.media)
    const isExternal = isExternalUrl(item.link)

    const cardContent = (
        <GlareHover
            glareColor="#f2cb05"
            glareOpacity={0.15}
            glareAngle={-45}
            glareSize={300}
            className="h-full"
        >
            {/* Background: Image, Video, or Gradient fallback */}
            {hasMedia && isVideo ? (
                isPlaying ? (
                    <video
                        src={item.media}
                        className="absolute inset-0 w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                    />
                ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradientColor} opacity-80`}>
                        <button
                            className="absolute inset-0 flex items-center justify-center z-10"
                            onClick={onPlay}
                            aria-label={item.title ? `Play video: ${item.title}` : 'Play video'}
                        >
                            <div className="w-16 h-16 rounded-full bg-primary/90 backdrop-blur-sm border border-primary flex items-center justify-center hover:bg-primary hover:border-primary transition-all duration-300 shadow-lg">
                                <Play className="h-8 w-8 text-background fill-background" />
                            </div>
                        </button>
                    </div>
                )
            ) : hasMedia ? (
                <Image
                    src={item.media}
                    alt={item.title || ''}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    loading="lazy"
                />
            ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${gradientColor} opacity-80 transition-opacity duration-500 group-hover:opacity-90`} />
            )}

            {/* Rich content overlay */}
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6">
                {item.category && (
                    <span className="mb-2 inline-block self-start rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/85 backdrop-blur-sm">
                        {item.category}
                    </span>
                )}
                <h3 className="text-xl font-bold text-white">{item.title || ''}</h3>
                {item.description && (
                    <p className="mt-1 text-sm text-white/65 line-clamp-2 translate-y-1 opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
                        {item.description}
                    </p>
                )}
            </div>

            {/* Hover overlay with glow */}
            {!isPlaying && (
                <div className="absolute inset-0 bg-primary/15 opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex items-center justify-center">
                    <div className="w-13 h-13 rounded-full border border-white/30 bg-white/15 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.3)] scale-75 group-hover:scale-100 transition-transform duration-400">
                        <ArrowRight className="h-6 w-6 text-white" />
                    </div>
                </div>
            )}
        </GlareHover>
    )

    const cardClasses = "group relative aspect-[4/3] rounded-3xl overflow-hidden cursor-pointer glass-card"

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className={cardClasses}
        >
            {item.link ? (
                isExternal ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="block h-full">
                        {cardContent}
                    </a>
                ) : (
                    <Link href={item.link} className="block h-full">
                        {cardContent}
                    </Link>
                )
            ) : (
                cardContent
            )}
        </motion.div>
    )
}

interface FallbackPortfolioItemProps {
    project: {
        titleAr: string
        titleEn: string
        category: string
        categoryAr: string
        color: string
    }
    index: number
    isAr: boolean
}

export function FallbackPortfolioItem({ project, index, isAr }: FallbackPortfolioItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="group relative aspect-[4/3] rounded-3xl overflow-hidden cursor-pointer glass-card"
        >
            <GlareHover
                glareColor="#f2cb05"
                glareOpacity={0.15}
                glareAngle={-45}
                glareSize={300}
                className="h-full"
            >
                {/* Gradient BG */}
                <div className={`absolute inset-0 bg-gradient-to-br ${project.color} opacity-80 transition-opacity duration-500 group-hover:opacity-90`} />

                {/* Rich content overlay */}
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/25 to-transparent p-6">
                    <span className="mb-2 inline-block self-start rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/85 backdrop-blur-sm">
                        {isAr ? project.categoryAr : project.category}
                    </span>
                    <h3 className="text-xl font-bold text-white">{isAr ? project.titleAr : project.titleEn}</h3>
                </div>

                {/* Hover glow overlay */}
                <div className="absolute inset-0 bg-primary/15 opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex items-center justify-center">
                    <div className="w-13 h-13 rounded-full border border-white/30 bg-white/15 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.3)] scale-75 group-hover:scale-100 transition-transform duration-400">
                        <ArrowRight className="h-6 w-6 text-white" />
                    </div>
                </div>
            </GlareHover>
        </motion.div>
    )
}
