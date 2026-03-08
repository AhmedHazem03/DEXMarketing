'use client'

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Rocket, Sparkles } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { useRef, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useIntroStore } from '@/store/intro-store'
import { SplitText } from '@/components/ui/split-text'


export function HeroOverlay() {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const Arrow = isAr ? ArrowLeft : ArrowRight
    const prefersReducedMotion = useReducedMotion()
    const ref = useRef<HTMLDivElement>(null)

    // Wait for cinematic entrance
    const isIntroComplete = useIntroStore((state) => state.isIntroComplete)

    const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
    const yText = useTransform(scrollYProgress, [0, 1], [0, 150])
    const opacityText = useTransform(scrollYProgress, [0, 0.5], [1, 0])

    // Only render or animate if intro is complete
    // We can use a simple variant toggle
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }

    return (
        <>
            <div ref={ref} className="relative z-10 grid min-h-[100dvh] grid-cols-1 lg:grid-cols-2 items-center gap-12 px-6 pt-24 pb-16 md:pt-28 md:pb-20 lg:pt-24 lg:pb-16 container mx-auto">
                {/* Text Content Column */}
                <div className="w-full flex flex-col justify-center items-start">
                    <motion.div
                        style={{ y: yText, opacity: opacityText }}
                        className="text-start"
                        initial="hidden"
                        animate={isIntroComplete ? "visible" : "hidden"}
                        variants={containerVariants}
                    >
                        {/* Mission badge */}
                        <motion.div
                            variants={{
                                hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
                                visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8 } }
                            }}
                            className="mb-10 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/[0.06] px-6 py-3 backdrop-blur-md shadow-[0_0_20px_rgba(251,191,36,0.08),inset_0_0_20px_rgba(251,191,36,0.03)]"
                        >
                            <motion.div
                                animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                                className="relative"
                            >
                                <Rocket className="h-5 w-5 text-primary drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                            </motion.div>
                            <span className="text-sm font-bold text-primary">
                                {isAr ? 'نطلق علامتك التجارية إلى المدار' : 'Launching Brands Into Orbit'}
                            </span>
                            <Sparkles className="h-3.5 w-3.5 text-primary/60" />
                        </motion.div>
{/* ---------- Main Headline ---------- */}
<div className="mb-14 overflow-visible relative">
    <h1 className="text-6xl sm:text-7xl lg:text-8xl xl:text-[7.5rem] font-black leading-[1.1] tracking-tight relative z-10">
        {isAr ? (
            // التصميم العربي المطابق للصورة
            <div className="relative inline-block w-full text-right" style={{ direction: 'rtl' }}>
                
                {/* حاوية نسبية لضمان تداخل النصوص */}
                <div className="relative inline-block">
                    {/* النص الأصفر */}
                    <div className="text-[#FFCC00] drop-shadow-[0_0_15px_rgba(251,191,36,0.15)] relative z-10">
                        <SplitText
                            text="الإبداع يبدأ"
                            className="text-7xl sm:text-8xl lg:text-[8.5rem] font-black leading-none inline-block"
                            delay={0.06}
                            animationFrom={{ opacity: 0, y: 40 }}
                            animationTo={{ opacity: 1, y: 0 }}
                            textAlign="right"
                            start={isIntroComplete}
                            type="words"
                        />
                    </div>
                    
                    {/* النص الأبيض اليدوي (متموضع بشكل مطلق ليتداخل مع "يبدأ") */}
                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 30, x: -20 },
                            visible: { 
                                opacity: 1, 
                                y: 0, 
                                x: 0, 
                                transition: { duration: 0.8, delay: 0.7, type: "spring", stiffness: 100 } 
                            }
                        }}
                        initial="hidden"
                        animate={isIntroComplete ? "visible" : "hidden"}
                        // التموضع المطلق أسفل يسار الحاوية ليكون تحت/فوق كلمة "يبدأ"
                        className="absolute -bottom-6 sm:-bottom-10 -left-4 sm:-left-8 z-20 pointer-events-none"
                    >
                        {/* النص باستخدام الخط اليدوي مع دوران خفيف */}
                        <span 
                            className="text-5xl sm:text-6xl lg:text-[4.5rem] text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] whitespace-nowrap block"
                            style={{ fontFamily: "var(--font-aref-ruqaa)", letterSpacing: '0.02em', transform: 'rotate(-2deg)' }} 
                        >
                            من هنا
                        </span>
                        
                        {/* خط الزخرفة المنحني (الخط اليدوي ذو الحلقة) */}
                        <motion.svg 
                            className="absolute -bottom-8 -left-4 w-32 h-14 sm:w-40 sm:h-16 text-white drop-shadow-md"
                            viewBox="0 0 100 40" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            variants={{
                                hidden: { pathLength: 0, opacity: 0 },
                                visible: { pathLength: 1, opacity: 1, transition: { duration: 1.2, delay: 1, ease: "easeInOut" } }
                            }}
                        >
                            {/* مسار يرسم خط فيه لفة (Loop) مشابه للذي في الصورة */}
                            <motion.path 
                                d="M 85 15 C 60 25, 45 30, 30 30 C 15 30, 10 20, 20 15 C 30 10, 35 25, 10 35" 
                                stroke="currentColor" 
                                strokeWidth="3" 
                                strokeLinecap="round"
                                fill="none"
                            />
                        </motion.svg>
                    </motion.div>
                </div>
                
            </div>
        ) : (
            // التصميم الإنجليزي 
            <div className="flex flex-col items-start gap-2" style={{ direction: 'ltr' }}>
                <SplitText
                    text="Creativity Starts"
                    className="text-[#FFCC00] py-1 drop-shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                    delay={0.06}
                    animationFrom={{ opacity: 0, y: 40 }}
                    animationTo={{ opacity: 1, y: 0 }}
                    textAlign="left"
                    start={isIntroComplete}
                    type="words"
                />
                <div className="relative">
                    <SplitText
                        text="From Here"
                        className="text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                        delay={0.06}
                        animationFrom={{ opacity: 0, y: 40 }}
                        animationTo={{ opacity: 1, y: 0 }}
                        textAlign="left"
                        start={isIntroComplete}
                        type="words"
                    />
                </div>
            </div>
        )}
    </h1>
</div>
                        {/* Decorative accent line */}
                        <motion.div
                            variants={{
                                hidden: { scaleX: 0, opacity: 0 },
                                visible: { scaleX: 1, opacity: 1, transition: { duration: 1, delay: 0.4 } }
                            }}
                            className="mb-10 h-[2px] w-24 origin-left bg-gradient-to-r from-primary/60 via-yellow-300/40 to-transparent"
                        />

                        {/* Subtitle */}
                        <motion.p
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.5 } }
                            }}
                            className="mb-14 max-w-2xl text-lg md:text-xl font-medium leading-relaxed text-white/45"
                        >
                            {isAr
                                ? 'وكالة تسويق رقمي يحرّك الأرقام والمؤتمرات — من الإبداع البصري إلى إدارة الحملات، كل ما يحتاجه مشروعك لتصدر'
                                : 'A full-spectrum digital agency turning bold ideas into measurable growth — creativity, strategy, and execution under one mission.'}
                        </motion.p>

                        {/* CTAs */}
                        <motion.div
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.7 } }
                            }}
                            className="mb-16 flex flex-col items-start gap-5 sm:flex-row justify-start"
                        >
                            <Button
                                asChild
                                size="lg"
                                className="group relative overflow-hidden rounded-2xl bg-primary px-10 py-7 text-lg font-bold text-background shadow-[0_0_30px_rgba(251,191,36,0.22),0_0_60px_rgba(251,191,36,0.08)] transition-all duration-500 hover:bg-primary/90 hover:shadow-[0_0_50px_rgba(251,191,36,0.32),0_0_80px_rgba(251,191,36,0.12)] hover:scale-[1.02]"
                            >
                                <Link href="/register">
                                    <span className="relative z-10 flex items-center gap-2">
                                        <Rocket className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-12" />
                                        {isAr ? 'ابدأ مهمتك' : 'Start Your Mission'}
                                        <Arrow className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                                    </span>
                                </Link>
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="group rounded-2xl border-2 border-primary/40 bg-primary/10 px-10 py-7 text-lg font-semibold text-primary backdrop-blur-md hover:border-primary hover:bg-primary hover:text-background hover:shadow-[0_0_30px_rgba(251,191,36,0.16)] transition-all duration-400 hover:scale-[1.02]"
                            >
                                <span className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary/70 transition-colors duration-300 group-hover:text-background" />
                                    {isAr ? 'شاهد أعمالنا' : 'Explore Work'}
                                </span>
                            </Button>
                        </motion.div>


                    </motion.div>
                </div>

            </div >
        </>
    )
}
