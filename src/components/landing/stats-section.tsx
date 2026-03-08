'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useLocale } from 'next-intl'
import { Users, FolderKanban, Calendar, UserCheck } from 'lucide-react'
import { GlowOrb, OrbitalRing } from './effects/floating-elements'

interface Stat {
  icon: typeof Users
  value: number
  suffix: string
  labelEn: string
  labelAr: string
  color: string
}

const STATS: Stat[] = [
  { icon: Users, value: 150, suffix: '+', labelEn: 'Happy Clients', labelAr: 'عميل سعيد', color: '#F2CB05' },
  { icon: FolderKanban, value: 500, suffix: '+', labelEn: 'Projects Done', labelAr: 'مشروع مكتمل', color: '#22D3EE' },
  { icon: Calendar, value: 5, suffix: '+', labelEn: 'Years Experience', labelAr: 'سنوات خبرة', color: '#A855F7' },
  { icon: UserCheck, value: 30, suffix: '+', labelEn: 'Team Members', labelAr: 'عضو فريق', color: '#10B981' },
]

function useCountUp(end: number, duration: number = 2000, start: boolean = false) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!start) return

    let startTime: number | null = null
    let rafId: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * end))

      if (progress < 1) {
        rafId = requestAnimationFrame(animate)
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [end, duration, start])

  return count
}

function StatCard({ stat, index, isVisible }: { stat: Stat; index: number; isVisible: boolean }) {
  const locale = useLocale()
  const isAr = locale === 'ar'
  const count = useCountUp(stat.value, 2200, isVisible)
  const Icon = stat.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="relative group card-lift"
    >
      {/* Glass card — gradient border on hover */}
      <div className="glass rounded-3xl p-8 text-center overflow-hidden transition-all duration-500 group-hover:border-white/[0.12] gradient-border">
        {/* Full-card ambient glow on hover */}
        <div
          className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${stat.color}08 0%, transparent 65%)` }}
        />

        {/* Pulsing ring behind icon */}
        <div className="relative mx-auto mb-6 w-16 h-16">
          <div
            className="absolute inset-0 rounded-full transition-all duration-700 group-hover:scale-125 group-hover:opacity-0 opacity-40"
            style={{ backgroundColor: `${stat.color}18` }}
          />
          <div
            className="relative z-10 w-full h-full rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{
              backgroundColor: `${stat.color}12`,
              color: stat.color,
              boxShadow: `0 0 20px ${stat.color}20`,
            }}
          >
            <Icon className="h-7 w-7" />
          </div>
        </div>

        {/* Number */}
        <div
          className="relative z-10 text-5xl sm:text-6xl font-black font-mono mb-3 leading-none"
          style={{
            color: stat.color,
            textShadow: `0 0 40px ${stat.color}30`,
          }}
        >
          {count}<span className="text-4xl">{stat.suffix}</span>
        </div>

        {/* Label */}
        <p className="relative z-10 text-xs font-bold uppercase tracking-widest text-white/35">
          {isAr ? stat.labelAr : stat.labelEn}
        </p>
      </div>
    </motion.div>
  )
}

export function StatsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const locale = useLocale()
  const isAr = locale === 'ar'

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting) {
      setIsVisible(true)
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.3,
    })

    const el = ref.current
    if (el) observer.observe(el)
    return () => { if (el) observer.unobserve(el) }
  }, [handleIntersection])

  return (
    <section className="relative overflow-hidden py-20 md:py-24" id="stats" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 bg-transparent" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#F2CB05]/15 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* ── Floating decorative elements ── */}
      <GlowOrb color="#F2CB05" size={500} blur={160} opacity={0.025} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <OrbitalRing size={600} borderColor="rgba(242, 203, 5, 0.03)" dotColor="#F2CB05" duration={35} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:block" />

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <div className="container relative z-10 mx-auto px-6">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
           
        </motion.div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-8">
          {STATS.map((stat, i) => (
            <StatCard key={stat.labelEn} stat={stat} index={i} isVisible={isVisible} />
          ))}
        </div>
      </div>
    </section>
  )
}
