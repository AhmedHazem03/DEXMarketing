'use client'

import { useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { motion, useInView, useMotionTemplate, useReducedMotion, useSpring } from 'framer-motion'
import { useLocale } from 'next-intl'
import Image from 'next/image'
import { Target, Eye, Sparkles } from 'lucide-react'
import { GlowOrb, FloatingHexagon, DotGrid } from './effects/floating-elements'
import GlareHover from '../ui/GlareHover'

export function AboutSection() {
  const locale = useLocale()
  const isAr = locale === 'ar'
  const shouldReduceMotion = useReducedMotion()
  const visualRef = useRef<HTMLDivElement>(null)
  const isVisualInView = useInView(visualRef, { amount: 0.55, margin: '-10% 0px -10% 0px' })

  const tiltX = useSpring(0, { stiffness: 95, damping: 20, mass: 0.7 })
  const tiltY = useSpring(0, { stiffness: 95, damping: 20, mass: 0.7 })
  const driftX = useSpring(0, { stiffness: 75, damping: 16, mass: 0.8 })
  const driftY = useSpring(0, { stiffness: 75, damping: 16, mass: 0.8 })
  const glowX = useSpring(50, { stiffness: 70, damping: 20, mass: 0.8 })
  const glowY = useSpring(50, { stiffness: 70, damping: 20, mass: 0.8 })

  const dynamicGlow = useMotionTemplate`radial-gradient(460px circle at ${glowX}% ${glowY}%, rgba(242, 203, 5, 0.22), rgba(34, 211, 238, 0.1) 42%, transparent 72%)`

  const handleVisualPointerMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return

    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    const centeredX = x - 0.5
    const centeredY = y - 0.5

    tiltX.set(-centeredY * 10)
    tiltY.set(centeredX * 12)
    driftX.set(centeredX * 9)
    driftY.set(centeredY * 7)
    glowX.set(x * 100)
    glowY.set(y * 100)
  }

  const resetVisualPointer = () => {
    tiltX.set(0)
    tiltY.set(0)
    driftX.set(0)
    driftY.set(0)
    glowX.set(50)
    glowY.set(50)
  }

  return (
    <section className="relative overflow-hidden bg-transparent py-20 md:py-24" id="about" aria-labelledby="about-heading">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* ── Floating decorative elements ── */}
      <GlowOrb color="#F2CB05" size={350} blur={120} opacity={0.03} className="top-20 -start-40" />
      <GlowOrb color="#22D3EE" size={250} blur={100} opacity={0.02} className="bottom-20 -end-32" />
      <FloatingHexagon className="top-32 end-20 w-16 h-16" delay={1} />
      <FloatingHexagon className="bottom-40 start-16 w-10 h-10" delay={3} duration={12} />
      <DotGrid rows={5} cols={5} gap={28} className="top-20 end-12 hidden lg:grid" />

      {/* Grid pattern background */}
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="container relative z-10 mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
           
          <h2 id="about-heading" className="mt-6 text-4xl sm:text-5xl font-black text-white leading-tight font-serif text-glow-white">
            {isAr ? 'من نحن' : 'About DEX'}
          </h2>
          <div className="mt-5 mx-auto w-20 h-[2px] bg-gradient-to-r from-transparent via-[#F2CB05]/60 to-transparent rounded-full" />
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
          {/* Text Side */}
          <motion.div
            initial={{ opacity: 0, x: isAr ? 40 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#F2CB05]/20 bg-[#F2CB05]/5 text-[#F2CB05] text-xs font-mono backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {isAr ? 'قصتنا' : 'Our Story'}
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
              {isAr
                ? 'نحوّل الأفكار إلى تجارب رقمية لا تُنسى'
                : 'We turn ideas into unforgettable digital experiences'}
            </h3>

            <p className="text-white/40 leading-relaxed text-base">
              {isAr
                ? 'بدأت رحلة DEX بشغف حقيقي للتسويق الإبداعي. من فريق صغير بأحلام كبيرة، نمونا لنصبح شريك رقمي متكامل لأكتر من 150 عميل. نؤمن إن كل براند ليه قصة تستحق تتحكي بأفضل صورة.'
                : 'DEX started with a genuine passion for creative marketing. From a small team with big dreams, we grew to become a full-service digital partner for 150+ clients. We believe every brand has a story worth telling in the best possible way.'}
            </p>

            <p className="text-white/40 leading-relaxed text-base">
              {isAr
                ? 'فريقنا من المصممين والمطورين والمسوقين بيشتغلوا كعائلة واحدة عشان يوصلوا لأفضل نتيجة. مش بنقدم خدمات بس — بنبني شراكات حقيقية.'
                : 'Our team of designers, developers, and marketers work as one family to achieve the best results. We don\'t just offer services — we build genuine partnerships.'}
            </p>
          </motion.div>

          {/* Visual Side */}
          <motion.div
            initial={{ opacity: 0, x: isAr ? -40 : 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div
              ref={visualRef}
              className="relative mx-auto aspect-square w-full max-w-[430px] [perspective:1200px]"
              onMouseMove={handleVisualPointerMove}
              onMouseLeave={resetVisualPointer}
            >
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                style={shouldReduceMotion ? undefined : { rotateX: tiltX, rotateY: tiltY, x: driftX, y: driftY }}
                animate={shouldReduceMotion ? undefined : { rotateZ: [0, 1.2, 0, -1.2, 0] }}
                transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
              >
                {/* Atmosphere glow to blend premium calm with cinematic depth */}
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.11),transparent_62%)] blur-3xl" />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: shouldReduceMotion
                      ? 'radial-gradient(420px circle at 50% 50%, rgba(242, 203, 5, 0.17), transparent 70%)'
                      : dynamicGlow,
                  }}
                />

                {/* Soft grounding shadow for stronger 3D depth */}
                <div className="absolute bottom-10 left-1/2 h-14 w-56 -translate-x-1/2 rounded-full bg-black/40 blur-2xl" />

                {/* Ring stack */}
                <motion.div
                  className="absolute top-1/2 left-1/2 h-[92%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#F2CB05]/14"
                  style={{ boxShadow: 'inset 0 0 48px rgba(242, 203, 5, 0.08)' }}
                  animate={shouldReduceMotion ? undefined : { rotate: 360 }}
                  transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute top-1/2 left-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#22D3EE]/14"
                  style={{ boxShadow: '0 0 26px rgba(34, 211, 238, 0.12)' }}
                  animate={shouldReduceMotion ? undefined : { rotate: -360 }}
                  transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute top-1/2 left-1/2 h-[86%] w-[86%] [transform:translate(-50%,-50%)_rotateX(70deg)_rotateY(8deg)]">
                  <motion.div
                    className="h-full w-full rounded-full border border-[#F2CB05]/10"
                    animate={shouldReduceMotion ? undefined : { rotate: 360 }}
                    transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
                  />
                </div>

                {/* Core sphere */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="relative flex h-44 w-44 items-center justify-center rounded-full border border-white/15 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.22),rgba(2,32,38,0.72)_48%,rgba(2,32,38,0.96)_100%)] shadow-[0_28px_80px_rgba(0,0,0,0.6),0_0_80px_rgba(242,203,5,0.16),inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-2xl"
                    animate={shouldReduceMotion ? undefined : { y: [0, -10, 0], scale: [1, 1.03, 1] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="absolute inset-[12%] rounded-full border border-[#F2CB05]/16" />
                    <div className="absolute inset-[20%] rounded-full bg-[radial-gradient(circle,rgba(242,203,5,0.2),transparent_72%)] blur-md" />

                    {/* Logo replays fade-in each time visual re-enters viewport */}
                    <motion.div
                      className="relative z-10 select-none"
                      initial={{ opacity: 0, scale: 0.84 }}
                      animate={isVisualInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.84 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                    >
                      <Image
                        src="/images/DEX LOGO 2.png"
                        alt="DEX Logo"
                        width={100}
                        height={100}
                        className="object-contain drop-shadow-[0_0_20px_rgba(242,203,5,0.35)]"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.82 }}
                        animate={
                          isVisualInView
                            ? { opacity: [0, 0.95, 0], scale: [0.82, 1.24, 1.62] }
                            : { opacity: 0, scale: 0.82 }
                        }
                        transition={{ duration: 0.66, delay: 0.6, times: [0, 0.36, 1], ease: 'easeOut' }}
                        className="pointer-events-none absolute inset-[-26%] rounded-full bg-[radial-gradient(circle,rgba(255,248,194,0.95)_0%,rgba(255,248,194,0.4)_35%,rgba(255,248,194,0)_74%)] mix-blend-screen"
                      />
                    </motion.div>
                  </motion.div>
                </div>

                {/* Orbit particles */}
                {shouldReduceMotion ? (
                  <>
                    <div
                      className="absolute top-[10%] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#F2CB05]/80 shadow-[0_0_16px_rgba(242,203,5,0.7)]"
                    />
                    <div
                      className="absolute top-1/2 left-[8%] h-2 w-2 -translate-y-1/2 rounded-full bg-[#22D3EE]/70 shadow-[0_0_12px_rgba(34,211,238,0.55)]"
                    />
                    <div
                      className="absolute bottom-[14%] right-[15%] h-2.5 w-2.5 rounded-full bg-[#F59E0B]/60 shadow-[0_0_14px_rgba(245,158,11,0.5)]"
                    />
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0"
                    >
                      <div
                        className="absolute top-[8%] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#F2CB05]/80 shadow-[0_0_16px_rgba(242,203,5,0.7)]"
                      />
                    </motion.div>
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 21, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-[9%]"
                    >
                      <div
                        className="absolute top-1/2 left-[2%] h-2 w-2 -translate-y-1/2 rounded-full bg-[#22D3EE]/70 shadow-[0_0_12px_rgba(34,211,238,0.55)]"
                      />
                    </motion.div>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 14, delay: 1.1, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-[18%]"
                    >
                      <div
                        className="absolute bottom-[4%] right-[14%] h-2.5 w-2.5 rounded-full bg-[#F59E0B]/60 shadow-[0_0_14px_rgba(245,158,11,0.5)]"
                      />
                    </motion.div>
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Mission & Vision Cards — GLASS */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="group relative rounded-2xl glass glass-hover transition-all duration-500 overflow-hidden"
          >
            <GlareHover
              glareColor="#ffffff"
              glareOpacity={0.15}
              glareAngle={-45}
              glareSize={250}
              className="p-8"
            >
              {/* Subtle corner glow */}
              <div className="absolute -top-10 -end-10 w-32 h-32 bg-[#22D3EE]/[0.06] blur-[60px] rounded-full group-hover:bg-[#22D3EE]/[0.1] transition-all duration-700" />

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#22D3EE]/10 flex items-center justify-center text-[#22D3EE] mb-5 ring-1 ring-[#22D3EE]/10">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {isAr ? 'مهمتنا' : 'Our Mission'}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  {isAr
                    ? 'نسعى لتقديم حلول تسويقية وتقنية مبتكرة تساعد عملاءنا على النمو والتميز في السوق الرقمي المتغير باستمرار.'
                    : 'We strive to deliver innovative marketing and tech solutions that help our clients grow and stand out in the ever-changing digital landscape.'}
                </p>
              </div>
            </GlareHover>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="group relative rounded-2xl glass glass-hover transition-all duration-500 overflow-hidden"
          >
            <GlareHover
              glareColor="#ffffff"
              glareOpacity={0.15}
              glareAngle={-45}
              glareSize={250}
              className="p-8"
            >
              {/* Subtle corner glow */}
              <div className="absolute -top-10 -end-10 w-32 h-32 bg-[#A855F7]/[0.06] blur-[60px] rounded-full group-hover:bg-[#A855F7]/[0.1] transition-all duration-700" />

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#A855F7]/10 flex items-center justify-center text-[#A855F7] mb-5 ring-1 ring-[#A855F7]/10">
                  <Eye className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {isAr ? 'رؤيتنا' : 'Our Vision'}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  {isAr
                    ? 'أن نكون الشريك الرقمي الأول لكل براند يطمح للتميز والريادة في المنطقة العربية وخارجها.'
                    : 'To be the #1 digital partner for every brand that aspires to excellence and leadership in the Arab region and beyond.'}
                </p>
              </div>
            </GlareHover>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
