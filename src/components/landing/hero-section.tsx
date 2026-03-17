'use client'

import { useRef, useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import Image from 'next/image'
import { HeroOverlay } from './effects/hero-overlay'
import { HeroSectionMobile } from './hero-section-mobile'
import { ChevronDown } from 'lucide-react'

function StarField() {
    const [stars, setStars] = useState<Array<{
        id: number; x: number; y: number; size: number; opacity: number;
        twinkleDuration: number; twinkleDelay: number; driftDuration: number;
        driftDelay: number; driftX: number; driftY: number;
    }>>([])

    useEffect(() => {
        setStars(Array.from({ length: 80 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.6 + 0.2,
            twinkleDuration: Math.random() * 3 + 2,
            twinkleDelay: Math.random() * 5,
            driftDuration: Math.random() * 20 + 15,
            driftDelay: Math.random() * 10,
            driftX: (Math.random() - 0.5) * 60,
            driftY: (Math.random() - 0.5) * 60,
        })))
    }, [])

    return (
        <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden" style={{ contain: 'strict' }}>
            <style>{`
                @keyframes twinkle {
                    0%, 100% { opacity: var(--star-opacity); transform: scale(1); }
                    50% { opacity: calc(var(--star-opacity) * 0.15); transform: scale(0.6); }
                }
                @keyframes drift {
                    0%   { transform: translate(0px, 0px); }
                    25%  { transform: translate(var(--dx), calc(var(--dy) * 0.5)); }
                    50%  { transform: translate(calc(var(--dx) * 0.3), var(--dy)); }
                    75%  { transform: translate(calc(var(--dx) * -0.5), calc(var(--dy) * 0.3)); }
                    100% { transform: translate(0px, 0px); }
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
                        '--dx': `${star.driftX}px`,
                        '--dy': `${star.driftY}px`,
                        opacity: star.opacity,
                        animation: `twinkle ${star.twinkleDuration}s ${star.twinkleDelay}s ease-in-out infinite, drift ${star.driftDuration}s ${star.driftDelay}s ease-in-out infinite`,
                        boxShadow: star.size > 1.8 ? `0 0 ${star.size * 2}px rgba(255,255,255,0.6)` : 'none',
                    } as React.CSSProperties}
                />
            ))}
        </div>
    )
}

function HeroSectionDesktop() {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const sectionRef = useRef<HTMLDivElement>(null)

    return (
        <section
            ref={sectionRef}
            className="relative min-h-[100dvh] w-full overflow-hidden bg-transparent"
            aria-label={isAr ? 'القسم الرئيسي' : 'Hero Section'}
        >
            {/* 3D Background - Now Global */}
            <div className="absolute inset-0 z-0" />

            {/* Stars Background */}
            <StarField />

            {/* Hero Image */}
            <div className="absolute inset-0 z-[5] pointer-events-none flex items-end lg:items-start justify-center lg:justify-end overflow-hidden lg:pt-0">
                <div
                    className={`relative w-full max-w-[240px] sm:max-w-[360px] lg:max-w-[580px] h-[40vh] sm:h-[48vh] lg:h-[70vh] lg:translate-y-[35%] ${isAr ? 'lg:translate-x-[10%]' : 'lg:translate-x-[0%]'
                        }`}
                >
                    <div className="relative w-full h-full">
                        {/* Full Detail Photorealistic Astronaut - STATIC */}
                        <Image
                            src="/images/astronaut_hero.png"
                            alt={isAr ? 'رائد فضاء يمثل الإبداع والابتكار' : 'Astronaut representing creativity and innovation'}
                            fill
                            priority
                            className="object-contain z-[12]"
                            sizes="(max-width: 640px) 240px, (max-width: 1024px) 360px, 580px"
                            quality={80}
                            style={{
                                filter: 'brightness(1.1) contrast(1.1) saturate(1.05) drop-shadow(0 0 30px rgba(0,0,0,0.5))',
                                transform: isAr ? 'scaleX(1)' : 'scaleX(-1)',
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Cinematic vignette */}
            <div
                className="pointer-events-none absolute inset-0 z-[1]"
                style={{
                    background: 'radial-gradient(ellipse at center,transparent 30%,#022026 100%)',
                }}
            />


            {/* Top vignette */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-32 z-[2] bg-gradient-to-b from-[#050505]/60 to-transparent" />

            {/* Content */}
            <div className="relative z-10 w-full h-full">
                <HeroOverlay />
            </div>

            {/* Scroll indicator - Static */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2" aria-hidden="true">
                <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/25">
                    Scroll
                </span>
                <ChevronDown className="h-4 w-4 text-white/20" />
                <div className="w-[1px] h-8 bg-gradient-to-b from-white/15 to-transparent" />
            </div>

            {/* Procedural Texture Filters (Hidden SVG) */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs />
            </svg>
        </section >
    )
}

export function HeroSection() {
    return (
        <>
            {/* Desktop: lg وما فوق */}
            <div className="hidden lg:block">
                <HeroSectionDesktop />
            </div>

            {/* Mobile: أقل من lg */}
            <div className="lg:hidden">
                <HeroSectionMobile />
            </div>
        </>
    )
}
