'use client'

import { useState, useRef } from 'react'
import { motion, useMotionValue, useAnimationFrame } from 'framer-motion'
import { useLocale } from 'next-intl'

const GOLD = '#fbbf24'

const PARTNERS = [
  { name: 'الفانوس',           logo: '/first%2020/1.png',           color: GOLD },
  { name: 'Inscription Dev',   logo: '/first%2020/2.png',           color: GOLD },
  { name: 'CUBE Design',       logo: '/first%2020/3.png',           color: GOLD },
  { name: 'بورسعيد',           logo: '/first%2020/4.png',           color: GOLD },
  { name: 'نقابة المحامين',     logo: '/first%2020/5.png',           color: GOLD },
  { name: 'Happy King',        logo: '/first%2020/6.png',           color: GOLD },
  { name: 'Friends',           logo: '/first%2020/8.png',           color: GOLD },
  { name: 'TM',                logo: '/first%2020/10.png',          color: GOLD },
  { name: 'كبدة القلة',         logo: '/first%2020/11.png',          color: GOLD },
  { name: "Let's Go",          logo: '/first%2020/12.png',          color: GOLD },
  { name: 'طيارة',              logo: '/first%2020/13%20%282%29.png',   color: GOLD },
  { name: 'مشارق',              logo: '/first%2020/14%20%282%29.png',   color: GOLD },
  { name: 'No Name Fashion',   logo: '/first%2020/15%20%282%29.png',   color: GOLD },
  { name: 'R Burger',          logo: '/first%2020/15.png',              color: GOLD },
  { name: 'الأهرام تكنولوجي',   logo: '/first%2020/16%20%282%29.png',   color: GOLD },
  { name: 'خلدون',              logo: '/first%2020/17%20%282%29.png',   color: GOLD },
  { name: 'علوي',               logo: '/first%2020/18%20%283%29.png',   color: GOLD },
  { name: 'Magic Square',      logo: '/first%2020/18.png',              color: GOLD },
]

type Partner = { name: string; logo: string; color: string }

function InfiniteMarquee({ children, paused, speed = 100 }: { children: React.ReactNode; paused: boolean; speed?: number }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)

  useAnimationFrame((_, delta) => {
    if (paused) return
    const el = trackRef.current
    if (!el) return
    const halfWidth = el.scrollWidth / 2
    let next = x.get() - (speed * delta) / 1000
    if (Math.abs(next) >= halfWidth) next = 0
    x.set(next)
  })

  return (
    <div className="overflow-hidden py-4" dir="ltr">
      <motion.div
        ref={trackRef}
        style={{ x, display: 'flex', alignItems: 'flex-start', width: 'max-content' }}
      >
        {children}
      </motion.div>
    </div>
  )
}

function PartnerCard({
  partner,
  index,
  onHover,
  isPaused,
}: {
  partner: Partner
  index: number
  onHover: (v: boolean) => void
  isPaused: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const delay = (index % PARTNERS.length) * 0.18

  function handleEnter(e: React.MouseEvent<HTMLDivElement>) {
    setHovered(true)
    onHover(true)
    const el = e.currentTarget as HTMLDivElement
    el.style.borderColor = `${partner.color}70`
    el.style.boxShadow   = `0 0 32px ${partner.color}40, 0 0 12px ${partner.color}20, inset 0 0 24px ${partner.color}12`
    el.style.background  = `${partner.color}0e`
    el.style.transform   = 'scale(1.13)'
  }

  function handleLeave(e: React.MouseEvent<HTMLDivElement>) {
    setHovered(false)
    onHover(false)
    const el = e.currentTarget as HTMLDivElement
    el.style.borderColor = 'rgba(255,255,255,0.08)'
    el.style.boxShadow   = 'none'
    el.style.background  = 'rgba(255,255,255,0.025)'
    el.style.transform   = 'scale(1)'
  }

  return (
    <div
      className="flex-shrink-0 flex flex-col items-center gap-3 mx-5 cursor-default select-none"
      style={{ width: 140 }}
    >
      {/* circle */}
      <div
        className="relative w-[140px] h-[140px] rounded-full border flex items-center justify-center"
        style={{
          borderColor:    'rgba(255,255,255,0.08)',
          background:     'rgba(255,255,255,0.025)',
          backdropFilter: 'blur(10px)',
          transition:     'border-color 0.35s, box-shadow 0.35s, background 0.35s, transform 0.35s',
          animation:      !isPaused && !hovered
            ? `breathe-${index % 5} ${3 + (index % 3) * 0.7}s ease-in-out ${delay}s infinite`
            : 'none',
        }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {/* logo image */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden"
          style={{
            background: '#022026',
            border:     `1px solid ${partner.color}${hovered ? '80' : '30'}`,
            transition: 'border-color 0.35s',
          }}
        >
          <img
            src={partner.logo}
            alt={partner.name}
            loading="lazy"
            decoding="async"
            style={{
              width:      '100%',
              height:     '100%',
              objectFit:  'cover',
              display:    'block',
              transition: 'transform 0.35s',
              transform:  hovered ? 'scale(1.08)' : 'scale(1)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export function PartnersOrbit() {
  const locale  = useLocale()
  const isAr    = locale === 'ar'
  const [isPaused, setIsPaused] = useState(false)

  const items = [...PARTNERS, ...PARTNERS]

  return (
    <section
      dir={isAr ? 'rtl' : 'ltr'}
      className="relative overflow-hidden py-24 bg-[#022026]"
    >
      <div className="section-divider absolute top-0    left-0 right-0" />
      <div className="section-divider absolute bottom-0 left-0 right-0" />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(2,178,175,0.06) 0%, transparent 70%)' }}
      />

      {/* header */}
      <div className="container relative z-10 mx-auto px-6 mb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="section-label">
            {isAr ? '\u0634\u0631\u0643\u0627\u0621 \u0627\u0644\u0646\u062c\u0627\u062d' : 'Trusted By Leading Brands'}
          </span>
          <p className="mt-3 text-sm text-white/35 max-w-sm mx-auto leading-relaxed">
            {isAr
              ? '\u0639\u0644\u0627\u0645\u0627\u062a \u062a\u062c\u0627\u0631\u064a\u0629 \u0631\u0627\u0626\u062f\u0629 \u062a\u062b\u0642 \u0641\u064a \u062f\u064a\u0643\u0633 \u0644\u062a\u062d\u0642\u064a\u0642 \u0646\u062a\u0627\u0626\u062c \u0631\u0642\u0645\u064a\u0629 \u0627\u0633\u062a\u062b\u0646\u0627\u0626\u064a\u0629'
              : 'Leading brands trust DEX to deliver outstanding digital results'}
          </p>
        </motion.div>
      </div>

      {/* marquee */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="relative z-10"
      >
        {/* fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0  z-20 w-28 md:w-52 bg-gradient-to-r  from-[#022026] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-28 md:w-52 bg-gradient-to-l from-[#022026] to-transparent" />

        <InfiniteMarquee paused={isPaused}>
          {items.map((p, i) => (
            <PartnerCard
              key={`${p.name}-${i}`}
              partner={p}
              index={i}
              onHover={setIsPaused}
              isPaused={isPaused}
            />
          ))}
        </InfiniteMarquee>
      </motion.div>

      {/* pause hint */}
      <motion.p
        className="mt-4 text-center text-[11px] text-white/20 tracking-widest uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: isPaused ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {isAr ? '\u23f8\ufe0e \u0645\u062a\u0648\u0642\u0641 \u2014 \u062d\u0631\u0651\u0643 \u0627\u0644\u0645\u0627\u0648\u0633 \u0644\u0644\u0645\u062a\u0627\u0628\u0639\u0629' : '\u23f8\ufe0e paused \u2014 move cursor to continue'}
      </motion.p>
    </section>
  )
}