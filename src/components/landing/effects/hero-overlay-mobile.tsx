'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Rocket, Sparkles } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { useIntroStore } from '@/store/intro-store'
import { SplitText } from '@/components/ui/split-text'

export function HeroOverlayMobile() {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const Arrow = isAr ? ArrowLeft : ArrowRight
    const prefersReducedMotion = useReducedMotion()
    const isIntroComplete = useIntroStore((state) => state.isIntroComplete)

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
    }

    return (
        <div
            className="relative z-[20] flex flex-col px-5 pt-4 pb-10"
            style={{ direction: isAr ? 'rtl' : 'ltr' }}
        >
            <motion.div
                initial="hidden"
                animate={isIntroComplete ? 'visible' : 'hidden'}
                variants={containerVariants}
                className="flex flex-col items-center text-center"
            >
                {/* Mission Badge */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
                        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7 } },
                    }}
                    className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-2 backdrop-blur-md shadow-[0_0_20px_rgba(251,191,36,0.08),inset_0_0_20px_rgba(251,191,36,0.03)]"
                >
                    <motion.div
                        animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    >
                        <Rocket className="h-4 w-4 text-primary drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                    </motion.div>
                    <span className="text-xs font-bold text-primary">
                        {isAr ? 'نطلق علامتك التجارية إلى المدار' : 'Launching Brands Into Orbit'}
                    </span>
                    <Sparkles className="h-3 w-3 text-primary/60" />
                </motion.div>

                {/* Main Headline */}
                <div className="mb-5 w-full">
                    {isAr ? (
                        <div className="flex flex-col items-center gap-1" style={{ direction: 'rtl' }}>
                            {/* حاوية نسبية تجمع "الإبداع يبدأ" + "من هنا" معاً */}
                            <div className="relative inline-block">
                                {/* السطر الأول - أصفر */}
                                <div className="text-[#FFCC00] drop-shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                                    <SplitText
                                        text="الإبداع يبدأ"
                                        className="text-[3.4rem] font-black leading-tight inline-block"
                                        delay={0.06}
                                        animationFrom={{ opacity: 0, y: 30 }}
                                        animationTo={{ opacity: 1, y: 0 }}
                                        textAlign="center"
                                        start={isIntroComplete}
                                        type="words"
                                    />
                                </div>

                                {/* "من هنا" — أسفل يسار الحاوية تحت كلمة "يبدأ" */}
                                <motion.div
                                    variants={{
                                        hidden: { opacity: 0, y: 20, x: -10 },
                                        visible: {
                                            opacity: 1,
                                            y: 0,
                                            x: 0,
                                            transition: { duration: 0.7, delay: 0.5, type: 'spring', stiffness: 100 },
                                        },
                                    }}
                                    className="absolute -bottom-3 -left-2 z-10 pointer-events-none"
                                >
                                    <span
                                        className="relative text-[2.3rem] text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] whitespace-nowrap block"
                                        style={{
                                            fontFamily: 'var(--font-aref-ruqaa)',
                                            letterSpacing: '0.02em',
                                            transform: 'rotate(-2deg)',
                                        }}
                                    >
                                        من هنا
                                        {/* خط الزخرفة */}
                                        <motion.svg
                                            className="absolute top-[78%] left-0 w-full h-5 text-white"
                                            viewBox="0 0 100 40"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            variants={{
                                                hidden: { pathLength: 0, opacity: 0 },
                                                visible: {
                                                    pathLength: 1,
                                                    opacity: 1,
                                                    transition: { duration: 1.2, delay: 1.0, ease: 'easeInOut' },
                                                },
                                            }}
                                        >
                                            <motion.path
                                                d="M 85 15 C 60 25, 45 30, 30 30 C 15 30, 10 20, 20 15 C 30 10, 35 25, 10 35"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                fill="none"
                                            />
                                        </motion.svg>
                                    </span>
                                </motion.div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1" style={{ direction: 'ltr' }}>
                            <SplitText
                                text="Creativity Starts"
                                className="text-[#FFCC00] text-[2.4rem] font-black leading-tight drop-shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                                delay={0.06}
                                animationFrom={{ opacity: 0, y: 30 }}
                                animationTo={{ opacity: 1, y: 0 }}
                                textAlign="center"
                                start={isIntroComplete}
                                type="words"
                            />
                            <motion.span
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.5 } },
                                }}
                                className="text-white text-[2.4rem] font-black leading-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.12)]"
                            >
                                From Here
                            </motion.span>
                        </div>
                    )}
                </div>

                {/* Accent Line */}
                <motion.div
                    variants={{
                        hidden: { scaleX: 0, opacity: 0 },
                        visible: {
                            scaleX: 1,
                            opacity: 1,
                            transition: { duration: 0.9, delay: 0.5 },
                        },
                    }}
                    className="mb-4 h-[2px] w-14 bg-gradient-to-r from-primary/60 via-yellow-300/40 to-transparent"
                />

                {/* Subtitle */}
                <motion.p
                    variants={{
                        hidden: { opacity: 0, y: 16 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.6 } },
                    }}
                    className="mb-6 text-sm font-medium leading-relaxed text-white/45"
                >
                    {isAr
                        ? 'وكالة تسويق رقمي يحرّك الأرقام والمؤتمرات — من الإبداع البصري إلى إدارة الحملات، كل ما يحتاجه مشروعك لتصدر'
                        : 'A full-spectrum digital agency turning bold ideas into measurable growth — creativity, strategy, and execution under one mission.'}
                </motion.p>

                {/* CTAs */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 16 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.75 } },
                    }}
                    className="flex w-full flex-col gap-3"
                >
                    <Button
                        asChild
                        size="lg"
                        className="group w-full relative overflow-hidden rounded-2xl bg-primary py-5 text-sm font-bold text-background shadow-[0_0_30px_rgba(251,191,36,0.22),0_0_60px_rgba(251,191,36,0.08)] transition-all duration-500 hover:bg-primary/90 hover:shadow-[0_0_50px_rgba(251,191,36,0.32)] active:scale-[0.98]"
                    >
                        <Link href="/contact">
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                <Rocket className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-12" />
                                {isAr ? 'ابدأ مهمتك' : 'Start Your Mission'}
                                <Arrow className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </span>
                        </Link>
                    </Button>
                    <Button
                        size="lg"
                        variant="outline"
                        className="group w-full rounded-2xl border-2 border-primary/40 bg-primary/10 py-5 text-sm font-semibold text-primary backdrop-blur-md hover:border-primary hover:bg-primary hover:text-background hover:shadow-[0_0_30px_rgba(251,191,36,0.16)] transition-all duration-400 active:scale-[0.98]"
                    >
                        <Link href="/portfolio">
                            <span className="flex items-center justify-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary/70 transition-colors duration-300 group-hover:text-background" />
                                {isAr ? 'شاهد أعمالنا' : 'Explore Work'}
                            </span>
                        </Link>
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    )
}
