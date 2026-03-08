'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useLocale } from 'next-intl'
import { Target, Lightbulb, Rocket, BarChart3 } from 'lucide-react'
import { PROCESS_STATS as STATS_DATA, Stat } from '../../lib/constants/landing'
import GlareHover from '../ui/GlareHover'

const PROCESS_STEPS = [
    {
        icon: Lightbulb,
        titleEn: 'Discovery',
        titleAr: 'الاكتشاف',
        descEn: 'We dig deep into your brand, audience, and goals',
        descAr: 'نتعمق في فهم علامتك وجمهورك وأهدافك',
        accent: 'text-yellow-400 border-yellow-400/20 bg-yellow-400/[0.06]',
    },
    {
        icon: Target,
        titleEn: 'Strategy',
        titleAr: 'الاستراتيجية',
        descEn: 'Custom battle plan built for your market',
        descAr: 'خطة مخصصة مبنية على بيانات السوق',
        accent: 'text-cyan-400 border-cyan-400/20 bg-cyan-400/[0.06]',
    },
    {
        icon: Rocket,
        titleEn: 'Execution',
        titleAr: 'التنفيذ',
        descEn: 'Creative firepower meets pixel-perfect delivery',
        descAr: 'إبداع وتنفيذ على أعلى مستوى من الدقة',
        accent: 'text-orange-400 border-orange-400/20 bg-orange-400/[0.06]',
    },
    {
        icon: BarChart3,
        titleEn: 'Optimize',
        titleAr: 'التحسين',
        descEn: 'Data-driven iteration for continuous growth',
        descAr: 'تحسين مستمر مبني على البيانات والنتائج',
        accent: 'text-green-400 border-green-400/20 bg-green-400/[0.06]',
    },
]

export function ProcessSection() {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const prefersReducedMotion = useReducedMotion()

    return (
        <section className="relative overflow-hidden py-24 md:py-28">
            {/* Background */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 h-[1px] w-[60%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <div className="container relative z-10 mx-auto px-6">
                {/* Two-column layout */}
                <div className="grid items-start gap-20 lg:grid-cols-2">
                    {/* Left: About + Stats */}
                    <motion.div
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.7 }}
                    >
                        <span className="section-label mb-6 inline-flex">
                            {isAr ? '04 — لماذا DEX؟' : '04 — Why DEX?'}
                        </span>
                        <h2 className="mt-6 mb-6 text-4xl font-black md:text-5xl lg:text-6xl text-glow-white">
                            {isAr ? 'ليست مجرد ' : 'Not Just an '}
                            <span className="text-primary">
                                {isAr ? 'وكالة' : 'Agency'}
                            </span>
                        </h2>
                        <p className="mb-14 max-w-lg text-lg leading-relaxed text-white/50">
                            {isAr
                                ? 'إحنا فريق مهمته إن علامتك التجارية تتصدر. بندمج الإبداع مع البيانات عشان نحقق نتائج ملموسة مش مجرد تصاميم حلوة.'
                                : "We're a mission-driven team that fuses creativity with data to deliver tangible results — not just pretty designs."}
                        </p>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {STATS_DATA.map((stat: Stat, i: number) => (
                                <motion.div
                                    key={stat.value}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="rounded-2xl glass overflow-hidden"
                                >
                                    <GlareHover
                                        glareColor="#ffffff"
                                        glareOpacity={0.15}
                                        glareAngle={45}
                                        glareSize={200}
                                        className="p-6"
                                    >
                                        <div className="text-3xl font-black text-primary">
                                            {stat.value}
                                        </div>
                                        <div className="mt-1 text-sm text-white/40">
                                            {isAr ? stat.labelAr : stat.labelEn}
                                        </div>
                                    </GlareHover>
                                </motion.div>
                            ))}
                        </div>

                        {/* Trusted by strip */}
                        <div className="mt-12">
                            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/20">
                                {isAr ? 'موثوق من قبل' : 'Trusted By'}
                            </p>
                            <div className="flex items-center gap-8">
                                {['Bella', 'TechVault', 'Urban', 'EatFresh', 'Nova'].map((brand) => (
                                    <span key={brand} className="text-sm font-bold text-white/15 transition-colors hover:text-white/30">
                                        {brand}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: Process Steps */}
                    <div>
                        <motion.span
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            className="mb-8 inline-block text-sm font-bold uppercase tracking-[0.25em] text-white/30"
                        >
                            {isAr ? 'طريقة عملنا' : 'Our Process'}
                        </motion.span>

                        <div className="relative">
                            {/* Connecting line */}
                            <div className="absolute start-[23px] top-0 h-full w-[1px] bg-gradient-to-b from-primary/30 via-white/10 to-transparent" />

                            <div className="space-y-10">
                                {PROCESS_STEPS.map((step, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 30 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true, margin: '-50px' }}
                                        transition={{ delay: i * 0.15, duration: 0.5 }}
                                        className="group relative flex items-start gap-6"
                                    >
                                        {/* Step dot/icon */}
                                        <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${step.accent} transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(251,191,36,0.15)]`}>
                                            <step.icon className="h-5 w-5" />
                                        </div>

                                        {/* Content */}
                                        <div className="pb-2">
                                            <div className="mb-1 flex items-center gap-3">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-white/20">
                                                    {isAr ? `المرحلة ${i + 1}` : `Phase ${String(i + 1).padStart(2, '0')}`}
                                                </span>
                                            </div>
                                            <h3 className="mb-1 text-xl font-bold text-white">
                                                {isAr ? step.titleAr : step.titleEn}
                                            </h3>
                                            <p className="text-sm text-white/40 leading-relaxed">
                                                {isAr ? step.descAr : step.descEn}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
