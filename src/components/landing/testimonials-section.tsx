'use client'

import { motion, useReducedMotion, useAnimationControls } from 'framer-motion'
import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import { Quote, Star } from 'lucide-react'
import GlareHover from '../ui/GlareHover'

const TESTIMONIALS = [
    {
        nameAr: 'أحمد محمد',
        nameEn: 'Ahmed Mohamed',
        roleAr: 'مدير تسويق — شركة بيلا',
        roleEn: 'Marketing Director — Bella Co.',
        textAr: 'فريق DEX حوّل رؤيتنا لواقع مبهر. نتائج الحملة فاقت كل التوقعات بأرقام مضاعفة!',
        textEn: 'DEX transformed our vision into reality. Campaign results doubled our expectations!',
    },
    {
        nameAr: 'سارة علي',
        nameEn: 'Sara Ali',
        roleAr: 'مؤسسة — Bloom Boutique',
        roleEn: 'Founder — Bloom Boutique',
        textAr: 'الإبداع في التصميم والأفكار المبتكرة خلّتنا نتميز عن كل المنافسين في السوق.',
        textEn: 'Their creative designs and bold ideas made us stand out from every competitor in the market.',
    },
    {
        nameAr: 'محمد خالد',
        nameEn: 'Mohamed Khaled',
        roleAr: 'CEO — TechVault',
        roleEn: 'CEO — TechVault',
        textAr: 'شركاء حقيقيين بمعنى الكلمة. بيفهموا احتياجاتنا قبل ما نتكلم وبيقدموا نتائج استثنائية.',
        textEn: 'True partners in every sense. They understand our needs before we speak and deliver exceptional results.',
    },
    {
        nameAr: 'نورا حسن',
        nameEn: 'Noura Hassan',
        roleAr: 'مديرة ماركتنج — EatFresh',
        roleEn: 'Marketing Manager — EatFresh',
        textAr: 'حملة السوشيال ميديا اللي عملوها زوّدت متابعينا ٣ أضعاف في شهرين بس!',
        textEn: 'Their social media campaign tripled our followers in just two months!',
    },
    {
        nameAr: 'كريم وائل',
        nameEn: 'Karim Wael',
        roleAr: 'مؤسس — Urban Fitness',
        roleEn: 'Founder — Urban Fitness',
        textAr: 'من الفيديو للجرافيك للحملات، كل حاجة on brand وعلى أعلى مستوى.',
        textEn: 'From video to graphics to campaigns — everything was on brand and top-notch.',
    },
    {
        nameAr: 'ليلى جمال',
        nameEn: 'Layla Gamal',
        roleAr: 'مديرة عمليات — Nova Events',
        roleEn: 'Operations Manager — Nova Events',
        textAr: 'أكتر حاجة عجبتني هي سرعة الاستجابة وجودة التنفيذ. فريق محترف جدًا.',
        textEn: 'What impressed me most was their responsiveness and execution quality. Truly professional.',
    },
] as const

const FIVE_STARS = Array.from({ length: 5 })

export function TestimonialsSection() {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const prefersReducedMotion = useReducedMotion()
    const marqueeControls = useAnimationControls()

    // Duplicate for seamless loop
    const loopItems = [...TESTIMONIALS, ...TESTIMONIALS]

    useEffect(() => {
        if (!prefersReducedMotion) {
            marqueeControls.start({
                x: isAr ? ['0%', '50%'] : ['0%', '-50%'],
                transition: { duration: 16, repeat: Infinity, ease: 'linear' },
            })
        }
    }, [prefersReducedMotion, isAr, marqueeControls])

    const resumeMarquee = () => {
        if (!prefersReducedMotion) {
            marqueeControls.start({
                x: isAr ? ['0%', '50%'] : ['0%', '-50%'],
                    transition: { duration: 7, repeat: Infinity, ease: 'linear' },
            })
        }
    }

    return (
        <section id="testimonials" className="relative overflow-hidden bg-[#022026] py-16 md:py-24 lg:py-28" aria-labelledby="testimonials-heading">
            {/* Background */}
            <div className="pointer-events-none absolute inset-0">
                <div className="section-divider absolute top-0 left-0 right-0" />
                <div className="section-divider absolute bottom-0 left-0 right-0" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#022026] via-[#021c22] to-[#022026]" />
                <div className="absolute -left-20 top-1/3 h-[400px] w-[400px] md:h-[600px] md:w-[600px] rounded-full bg-primary/[0.025] blur-[160px]" />
                <div className="absolute -right-20 bottom-1/3 h-[300px] w-[300px] md:h-[500px] md:w-[500px] rounded-full bg-purple-500/[0.015] blur-[160px]" />
                <div className="absolute inset-0 grid-pattern opacity-15" />
            </div>

            <div className="container relative z-10 mx-auto px-4 sm:px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    className="mb-10 md:mb-16 lg:mb-20 text-center"
                >
                    <span className="section-label mb-4 md:mb-6 inline-flex">
                        {isAr ? '06 — إشارات واردة' : '06 — Incoming Signals'}
                    </span>
                    <h2
                        id="testimonials-heading"
                        className="mt-4 md:mt-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-glow-white leading-tight"
                    >
                        {isAr ? 'ماذا يقول ' : 'What Clients '}
                        <span className="text-primary">
                            {isAr ? 'عملاؤنا' : 'Transmit'}
                        </span>
                    </h2>
                </motion.div>

                {/* Infinite marquee */}
                <div className="relative">
                    {/* Fade edges */}
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 sm:w-16 md:w-32 bg-gradient-to-r from-[#022026] to-transparent" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 sm:w-16 md:w-32 bg-gradient-to-l from-[#022026] to-transparent" />

                    <div
                        className="overflow-hidden"
                        onMouseEnter={() => marqueeControls.stop()}
                        onMouseLeave={resumeMarquee}
                        onTouchStart={() => marqueeControls.stop()}
                        onTouchEnd={resumeMarquee}
                    >
                        <motion.div
                            className="flex gap-4 md:gap-6"
                            animate={marqueeControls}
                        >
                            {loopItems.map((testimonial, i) => (
                                <div
                                    key={i}
                                    className="group relative w-[230px] sm:w-[270px] md:w-[300px] lg:w-[320px] flex-shrink-0 rounded-2xl md:rounded-3xl glass glass-hover transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/20 cursor-pointer"
                                >
                                    <GlareHover
                                        glareColor="#ffffff"
                                        glareOpacity={0.1}
                                        glareAngle={-30}
                                        glareSize={150}
                                        className="h-full p-4 sm:p-5 md:p-6"
                                    >
                                        {/* Quote icon */}
                                        <Quote className="mb-2 md:mb-3 h-5 w-5 md:h-6 md:w-6 text-primary/20" />

                                        {/* Text */}
                                        <p className="mb-4 md:mb-5 text-xs md:text-sm leading-relaxed text-white/70">
                                            {isAr ? testimonial.textAr : testimonial.textEn}
                                        </p>

                                        {/* Footer */}
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-orange-500/80 text-xs font-bold text-white shadow-lg flex-shrink-0">
                                                {(isAr ? testimonial.nameAr : testimonial.nameEn).charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[11px] md:text-xs font-bold text-white truncate">
                                                    {isAr ? testimonial.nameAr : testimonial.nameEn}
                                                </div>
                                                <div className="text-[9px] md:text-[10px] text-white/40 truncate">
                                                    {isAr ? testimonial.roleAr : testimonial.roleEn}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stars */}
                                        <div className="absolute end-3 md:end-4 top-4 md:top-5 flex gap-0.5">
                                            {FIVE_STARS.map((_, j) => (
                                                <Star key={j} className="h-2.5 w-2.5 md:h-3 md:w-3 fill-primary/70 text-primary/70" />
                                            ))}
                                        </div>
                                    </GlareHover>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    )
}
