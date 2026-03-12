'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { HeroOverlayMobile } from './effects/hero-overlay-mobile'

function StarFieldMobile() {
    const [stars, setStars] = useState<Array<{
        id: number; x: number; y: number; size: number; opacity: number;
        twinkleDuration: number; twinkleDelay: number;
    }>>([])

    useEffect(() => {
        setStars(Array.from({ length: 60 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 1.8 + 0.4,
            opacity: Math.random() * 0.5 + 0.15,
            twinkleDuration: Math.random() * 3 + 2,
            twinkleDelay: Math.random() * 5,
        })))
    }, [])

    return (
        <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
            <style>{`
                @keyframes twinkle-m {
                    0%, 100% { opacity: var(--star-opacity); transform: scale(1); }
                    50% { opacity: calc(var(--star-opacity) * 0.15); transform: scale(0.6); }
                }
            `}</style>
            {stars.map((star) => (
                <div
                    key={star.id}
                    className="absolute rounded-full bg-white"
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        '--star-opacity': star.opacity,
                        opacity: star.opacity,
                        animation: `twinkle-m ${star.twinkleDuration}s ${star.twinkleDelay}s ease-in-out infinite`,
                        boxShadow: star.size > 1.5 ? `0 0 ${star.size * 2}px rgba(255,255,255,0.5)` : 'none',
                    } as React.CSSProperties}
                />
            ))}
        </div>
    )
}

export function HeroSectionMobile() {
    const locale = useLocale()
    const isAr = locale === 'ar'

    return (
        <section
            className="relative w-full min-h-[100dvh] overflow-hidden bg-transparent flex flex-col"
            aria-label={isAr ? 'القسم الرئيسي' : 'Hero Section'}
        >
            {/* Stars */}
            <StarFieldMobile />

            {/* Radial vignette - جوانب فقط */}
            <div
                className="pointer-events-none absolute inset-0 z-[1]"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(2,32,38,0.5) 100%)',
                }}
            />

            {/* Top vignette */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-32 z-[3] bg-gradient-to-b from-[#050505]/70 to-transparent" />

            {/* ===== النصف العلوي: صورة الرائد الفضائي ===== */}
            <div className="relative z-[5] w-full flex-shrink-0" style={{ height: '50dvh' }}>
                <Image
                    src="/images/astronaut_hero.png"
                    alt={isAr ? 'رائد فضاء يمثل الإبداع والابتكار' : 'Astronaut representing creativity and innovation'}
                    fill
                    priority
                    className="object-contain object-bottom"
                    sizes="100vw"
                    quality={80}
                    style={{
                        filter: 'brightness(1.1) contrast(1.1) saturate(1.05) drop-shadow(0 0 40px rgba(0,0,0,0.6))',
                        transform: isAr ? 'scaleX(1)' : 'scaleX(-1)',
                    }}
                />

                {/* Gradient دمج أسفل الصورة */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-40 z-[6] pointer-events-none"
                    style={{
                        background: 'linear-gradient(to top, #022026 0%, transparent 100%)',
                    }}
                />
            </div>

            {/* ===== النصف السفلي: المحتوى النصي ===== */}
            <div className="relative z-[20] flex-1 bg-[#022026]">
                <HeroOverlayMobile />
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5" aria-hidden="true">
                <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-white/20">
                    Scroll
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-white/15" />
                <div className="w-[1px] h-6 bg-gradient-to-b from-white/12 to-transparent" />
            </div>
        </section>
    )
}
