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
                transition: { duration: 40, repeat: Infinity, ease: 'linear' },
            })
        }
    }, [prefersReducedMotion, isAr, marqueeControls])

    return (
        <section id="testimonials" className="relative overflow-hidden bg-[#022026] py-24 md:py-28" aria-labelledby="testimonials-heading">
            {/* Background */}
            <div className="pointer-events-none absolute inset-0">
                <div className="section-divider absolute top-0 left-0 right-0" />
                <div className="section-divider absolute bottom-0 left-0 right-0" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#022026] via-[#021c22] to-[#022026]" />
                <div className="absolute -left-20 top-1/3 h-[600px] w-[600px] rounded-full bg-primary/[0.025] blur-[160px]" />
                <div className="absolute -right-20 bottom-1/3 h-[500px] w-[500px] rounded-full bg-purple-500/[0.015] blur-[160px]" />
                <div className="absolute inset-0 grid-pattern opacity-15" />
            </div>

            <div className="container relative z-10 mx-auto px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    className="mb-20 text-center"
                >
                    <span className="section-label mb-6 inline-flex">
                        {isAr ? '06 — إشارات واردة' : '06 — Incoming Signals'}
                    </span>
                    <h2 id="testimonials-heading" className="mt-6 text-4xl font-black md:text-6xl lg:text-7xl text-glow-white">
                        {isAr ? 'ماذا يقول ' : 'What Clients '}
                            <span className="text-primary">
                            {isAr ? 'عملاؤنا' : 'Transmit'}
                        </span>
                    </h2>
                </motion.div>

                {/* Infinite marquee */}
                <div className="relative">
                    {/* Fade edges */}
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#022026] to-transparent md:w-40" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#022026] to-transparent md:w-40" />

                    <div
                        className="overflow-hidden"
                        onMouseEnter={() => marqueeControls.stop()}
                        onMouseLeave={() => {
                            if (!prefersReducedMotion) {
                                marqueeControls.start({
                                    x: isAr ? ['0%', '50%'] : ['0%', '-50%'],
                                    transition: { duration: 40, repeat: Infinity, ease: 'linear' },
                                })
                            }
                        }}
                    >
                        <motion.div
                            className="flex gap-6"
                            animate={marqueeControls}
                        >
                            {loopItems.map((testimonial, i) => (
                                <div
                                    key={i}
                                    className="group relative w-[380px] flex-shrink-0 rounded-3xl glass glass-hover transition-all duration-300 hover:scale-[1.04] hover:shadow-2xl hover:shadow-primary/20 cursor-pointer"
                                >
                                    <GlareHover
                                        glareColor="#ffffff"
                                        glareOpacity={0.1}
                                        glareAngle={-30}
                                        glareSize={150}
                                        className="h-full p-8"
                                    >
                                        {/* Quote icon */}
                                        <Quote className="mb-4 h-8 w-8 text-primary/20" />

                                        {/* Text */}
                                        <p className="mb-8 text-base leading-relaxed text-white/70">
                                            {isAr ? testimonial.textAr : testimonial.textEn}
                                        </p>

                                        {/* Footer */}
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-orange-500/80 text-sm font-bold text-white shadow-lg">
                                                {(isAr ? testimonial.nameAr : testimonial.nameEn).charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">
                                                    {isAr ? testimonial.nameAr : testimonial.nameEn}
                                                </div>
                                                <div className="text-xs text-white/40">
                                                    {isAr ? testimonial.roleAr : testimonial.roleEn}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stars */}
                                        <div className="absolute end-6 top-8 flex gap-0.5">
                                            {FIVE_STARS.map((_, j) => (
                                                <Star key={j} className="h-3.5 w-3.5 fill-primary/70 text-primary/70" />
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
