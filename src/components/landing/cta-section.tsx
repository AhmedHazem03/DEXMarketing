'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useLocale } from 'next-intl'
import { Rocket, ArrowLeft, ArrowRight, Phone, Mail, Zap, Facebook, Instagram, Twitter } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { useSiteSettingsContext } from '@/components/providers/site-settings-provider'


export function CTASection() {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const Arrow = isAr ? ArrowLeft : ArrowRight
    const settings = useSiteSettingsContext()
    const prefersReducedMotion = useReducedMotion()

    const phone = settings.contact_phone || '+20 123 456 7890'
    const email = settings.contact_email || 'info@dex-advertising.com'

    const TikTokIcon = () => (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
        </svg>
    )

    const socialLinks = [
        { icon: <Facebook className="h-4 w-4" />, href: settings.social_facebook, label: 'Facebook' },
        { icon: <Instagram className="h-4 w-4" />, href: settings.social_instagram, label: 'Instagram' },
        { icon: <Twitter className="h-4 w-4" />, href: settings.social_twitter, label: 'Twitter / X' },
        { icon: <TikTokIcon />, href: settings.social_tiktok, label: 'TikTok' },
    ].filter(s => s.href)

    return (
        <section id="cta" className="relative overflow-hidden py-28 md:py-32">
            {/* Background effects */}
            <div className="pointer-events-none absolute inset-0">
                <div className="section-divider absolute top-0 left-0 right-0" />
                <div className="absolute left-1/2 top-0 h-[1px] w-[60%] -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#022026] via-[#021a1f] to-[#022026]" />
                {/* Large ambient orbs */}
                <div className="absolute left-1/4 top-1/4 h-[700px] w-[700px] rounded-full bg-primary/[0.04] blur-[180px]" />
                <div className="absolute right-1/4 bottom-1/4 h-[500px] w-[500px] rounded-full bg-orange-500/[0.04] blur-[150px]" />
                {/* Grid pattern */}
                <div className="absolute inset-0 grid-pattern opacity-15" />
            </div>

            {/* Section label at top */}
            <div className="container relative z-10 mx-auto px-6 mb-16 text-center">
                <motion.span
                    className="section-label inline-flex"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    {isAr ? '08 — انطلق بمهمتك' : '08 — Begin Your Mission'}
                </motion.span>
            </div>

            <div className="container relative z-10 mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="mx-auto max-w-5xl"
                >
                    {/* Glassy card */}
                    <div className="glass-premium relative overflow-hidden rounded-3xl p-14 md:p-24 gradient-border">
                        {/* Inner glow */}
                        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/[0.07] via-transparent to-orange-500/[0.05]" />

                        {/* Grid lines decoration */}
                        <div className="pointer-events-none absolute inset-0 opacity-[0.025]" style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                            backgroundSize: '60px 60px',
                        }} />

                        {/* Animated orbital rings behind everything */}
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl">
                            {!prefersReducedMotion && (
                                <>
                                    <motion.div
                                        className="absolute w-[600px] h-[600px] rounded-full border border-primary/[0.06]"
                                        animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                                        transition={{ rotate: { duration: 25, repeat: Infinity, ease: 'linear' }, scale: { duration: 8, repeat: Infinity, ease: 'easeInOut' } }}
                                    />
                                    <motion.div
                                        className="absolute w-[400px] h-[400px] rounded-full border border-white/[0.04]"
                                        animate={{ rotate: -360 }}
                                        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                                    />
                                    {/* Orbiting dot */}
                                    <motion.div
                                        className="absolute w-2 h-2 rounded-full bg-primary/50"
                                        style={{ boxShadow: '0 0 12px rgba(251,191,36,0.4)', transformOrigin: '300px 0px' }}
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                                    />
                                </>
                            )}
                        </div>

                        <div className="relative z-10 text-center">
                            {/* Icon */}
                            <motion.div
                                className="mx-auto mb-10 flex h-24 w-24 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.08] shadow-[0_0_40px_rgba(251,191,36,0.12)]"
                                animate={prefersReducedMotion ? undefined : { scale: [1, 1.06, 1], boxShadow: ['0_0_40px_rgba(251,191,36,0.12)', '0_0_60px_rgba(251,191,36,0.2)', '0_0_40px_rgba(251,191,36,0.12)'] }}
                                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                <Zap className="h-11 w-11 text-primary drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                            </motion.div>

                            {/* Heading */}
                            <h2 className="mb-8 text-4xl font-black md:text-6xl lg:text-7xl leading-tight text-glow-white">
                                {isAr ? 'جاهز ' : 'Ready to '}
                                <span className="text-primary">
                                    {isAr ? 'تنطلق؟' : 'Launch?'}
                                </span>
                            </h2>

                            <p className="mx-auto mb-16 max-w-xl text-lg md:text-xl text-white/45 leading-relaxed">
                                {isAr
                                    ? 'تواصل معنا اليوم وخلّي فريقنا يصمّملك خطة تسويقية مخصصة — الاستشارة الأولى مجانية'
                                    : 'Get in touch and let our team craft a custom growth strategy — your first consultation is on us'}
                            </p>

                            {/* CTA Buttons */}
                            <div className="mb-14 flex flex-col items-center justify-center gap-4 sm:flex-row">
                                <Link href="https://wa.me/201553030051">
                                    <Button
                                        size="lg"
                                        className="group relative overflow-hidden rounded-2xl bg-primary px-14 py-8 text-xl font-bold text-background shadow-[0_0_40px_rgba(251,191,36,0.22),0_0_80px_rgba(251,191,36,0.08)] transition-all duration-500 hover:bg-primary/90 hover:shadow-[0_0_60px_rgba(251,191,36,0.32),0_0_100px_rgba(251,191,36,0.12)] hover:scale-[1.03]"
                                    >
                                        <span className="relative z-10 flex items-center gap-3">
                                            <Rocket className="h-6 w-6 transition-transform group-hover:-translate-y-1 group-hover:rotate-12" />
                                            {isAr ? 'احجز استشارتك المجانية' : 'Book Free Consultation'}
                                            <Arrow className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                        </span>
                                    </Button>
                                </Link>
                            </div>

                            {/* Social Media Icons */}
                            {socialLinks.length > 0 && (
                                <div className="mb-10 flex items-center justify-center gap-3">
                                    {socialLinks.map(({ icon, href, label }) => (
                                        <motion.a
                                            key={label}
                                            href={href as string}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={label}
                                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/40 transition-all duration-300 hover:border-primary/40 hover:bg-primary/[0.08] hover:text-primary hover:scale-110 hover:shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                                            whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                                        >
                                            {icon}
                                        </motion.a>
                                    ))}
                                </div>
                            )}

                            {/* Contact badges */}
                            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                                <a
                                    href={`tel:${phone}`}
                                    className="flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-white/45 transition-all duration-300 hover:border-primary/25 hover:text-primary hover:bg-primary/[0.04] hover:scale-[1.02]"
                                >
                                    <Phone className="h-4 w-4" />
                                    <span dir="ltr">{phone}</span>
                                </a>
                                <a
                                    href={`mailto:${email}`}
                                    className="flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-white/45 transition-all duration-300 hover:border-primary/25 hover:text-primary hover:bg-primary/[0.04] hover:scale-[1.02]"
                                >
                                    <Mail className="h-4 w-4" />
                                    <span>{email}</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
