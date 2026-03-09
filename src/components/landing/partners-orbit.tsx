'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLocale } from 'next-intl'

const PARTNERS = [
  { name: 'Royal Brands',   abbr: 'RB', color: '#fbbf24' },
  { name: 'TechVault',      abbr: 'TV', color: '#38bdf8' },
  { name: 'Bella Fashion',  abbr: 'BF', color: '#ec4899' },
  { name: 'Urban Fitness',  abbr: 'UF', color: '#4ade80' },
  { name: 'EatFresh',       abbr: 'EF', color: '#f97316' },
  { name: 'Nova Events',    abbr: 'NE', color: '#a78bfa' },
  { name: 'Bloom Boutique', abbr: 'BB', color: '#fb7185' },
  { name: 'Arabica Coffee', abbr: 'AC', color: '#d97706' },
  { name: 'LuxeHome',       abbr: 'LH', color: '#34d399' },
  { name: 'FitZone',        abbr: 'FZ', color: '#60a5fa' },
  { name: 'Skyline Dev',    abbr: 'SD', color: '#c084fc' },
  { name: 'Pulse Media',    abbr: 'PM', color: '#f43f5e' },
  { name: 'GreenLeaf',      abbr: 'GL', color: '#86efac' },
  { name: 'Nimbus Tech',    abbr: 'NT', color: '#67e8f9' },
  { name: 'Aura Studio',    abbr: 'AS', color: '#fda4af' },
  { name: 'ZenSpace',       abbr: 'ZS', color: '#d8b4fe' },
  { name: 'BluePeak',       abbr: 'BP', color: '#93c5fd' },
  { name: 'Ember Labs',     abbr: 'EL', color: '#fdba74' },
]

type Partner = { name: string; abbr: string; color: string }

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
      style={{ width: 108 }}
    >
      {/* circle */}
      <div
        className="relative w-[108px] h-[108px] rounded-full border flex items-center justify-center"
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
        {/* inner color ring */}
        <div
          className="absolute inset-[6px] rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${partner.color}22 0%, transparent 65%)`,
            border:     `1px solid ${partner.color}${hovered ? '50' : '20'}`,
            transition: 'border-color 0.35s',
          }}
        />

        {/* abbr */}
        <span
          className="relative z-10 font-black tracking-widest"
          style={{
            fontSize:   '15px',
            color:      hovered ? partner.color : `${partner.color}bb`,
            textShadow: hovered ? `0 0 18px ${partner.color}` : 'none',
            transition: 'color 0.3s, text-shadow 0.3s',
            letterSpacing: '0.1em',
          }}
        >
          {partner.abbr}
        </span>

        {/* top dot */}
        <span
          className="absolute top-[10px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
          style={{
            background: partner.color,
            boxShadow:  `0 0 6px ${partner.color}`,
            opacity:    hovered ? 1 : 0.4,
            transition: 'opacity 0.3s',
          }}
        />
      </div>

      {/* name label */}
      <motion.span
        className="text-[10px] font-semibold text-center whitespace-nowrap tracking-wide"
        animate={{ opacity: hovered ? 1 : 0.3, y: hovered ? 0 : 2 }}
        transition={{ duration: 0.25 }}
        style={{ color: hovered ? partner.color : 'rgba(255,255,255,0.5)' }}
      >
        {partner.name}
      </motion.span>
    </div>
  )
}

export function PartnersOrbit() {
  const locale  = useLocale()
  const isAr    = locale === 'ar'
  const [isPaused, setIsPaused] = useState(false)

  const items  = [...PARTNERS, ...PARTNERS, ...PARTNERS, ...PARTNERS]
  const dir    = isAr ? 'right' : 'left'
  const from   = dir === 'left' ? '0%'       : '-25%'
  const to     = dir === 'left' ? '-25%' : '0%'

  return (
    <section
      dir={isAr ? 'rtl' : 'ltr'}
      className="relative overflow-hidden py-24 bg-[#022026]"
    >
      <style>{`
        @keyframes marquee-single {
          from { transform: translateX(${from}); }
          to   { transform: translateX(${to}); }
        }
        @keyframes breathe-0 { 0%,100%{transform:scale(1)}   50%{transform:scale(1.04)} }
        @keyframes breathe-1 { 0%,100%{transform:scale(1)}   50%{transform:scale(1.035)} }
        @keyframes breathe-2 { 0%,100%{transform:scale(1)}   50%{transform:scale(1.045)} }
        @keyframes breathe-3 { 0%,100%{transform:scale(1)}   50%{transform:scale(1.03)} }
        @keyframes breathe-4 { 0%,100%{transform:scale(1)}   50%{transform:scale(1.04)} }
      `}</style>

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

        <div className="overflow-hidden py-4">
          <div
            style={{
              display:            'flex',
              alignItems:         'flex-start',
              animation:          'marquee-single 5s linear infinite',
              animationPlayState: isPaused ? 'paused' : 'running',
              willChange:         'transform',
            }}
          >
            {items.map((p, i) => (
              <PartnerCard
                key={`${p.name}-${i}`}
                partner={p}
                index={i}
                onHover={setIsPaused}
                isPaused={isPaused}
              />
            ))}
          </div>
        </div>
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