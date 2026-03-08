'use client'

import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useLocale } from 'next-intl'
import { Send, Mail, Phone, MapPin, Loader2, CheckCircle } from 'lucide-react'
import { GlowOrb, FloatingHexagon, DotGrid, OrbitalRing } from './effects/floating-elements'

const CONTACT_INFO = [
  {
    icon: Mail,
    labelEn: 'Email',
    labelAr: 'البريد',
    valueEn: 'hello@dex.marketing',
    valueAr: 'hello@dex.marketing',
    href: 'mailto:hello@dex.marketing',
    color: '#F2CB05',
  },
  {
    icon: Phone,
    labelEn: 'Phone',
    labelAr: 'الهاتف',
    valueEn: '+20 100 000 0000',
    valueAr: '+20 100 000 0000',
    href: 'tel:+201000000000',
    color: '#22D3EE',
  },
  {
    icon: MapPin,
    labelEn: 'Location',
    labelAr: 'الموقع',
    valueEn: 'Cairo, Egypt',
    valueAr: 'القاهرة، مصر',
    href: '#',
    color: '#A855F7',
  },
]

export function ContactSection() {
  const locale = useLocale()
  const isAr = locale === 'ar'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isError, setIsError] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      message: formData.get('message') as string,
    }

    try {
      // Send contact form data to Supabase
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('contact_messages').insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        message: data.message,
      })

      if (error) throw error

      setIsSubmitted(true)
      setTimeout(() => setIsSubmitted(false), 4000)
      form.reset()
    } catch {
      setIsError(true)
      setTimeout(() => setIsError(false), 4000)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="relative overflow-hidden bg-transparent py-20 md:py-24" id="contact" aria-labelledby="contact-heading">
      {/* ── Floating decorative elements ── */}
      <GlowOrb color="#F2CB05" size={400} blur={140} opacity={0.03} className="top-0 -end-40" />
      <GlowOrb color="#22D3EE" size={300} blur={100} opacity={0.02} className="bottom-0 -start-32" />
      <FloatingHexagon className="top-28 end-16 w-14 h-14" delay={0} />
      <FloatingHexagon className="bottom-32 start-12 w-10 h-10" delay={3} duration={12} />
      <DotGrid rows={6} cols={6} gap={24} className="top-16 start-8 hidden lg:grid" />
      <OrbitalRing size={400} borderColor="rgba(34, 211, 238, 0.04)" dotColor="#22D3EE" duration={25} className="bottom-0 -end-40 hidden lg:block" />

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <div className="container relative z-10 mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="section-label mb-6 inline-flex">
            {isAr ? '09 — تواصل معنا' : '09 — Get in Touch'}
          </span>
          <div className="w-20 h-[2px] mx-auto bg-gradient-to-r from-transparent via-[#F2CB05]/60 to-transparent rounded-full" />
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 max-w-6xl mx-auto">
          {/* Contact Info — Glass cards */}
          <motion.div
            initial={{ opacity: 0, x: isAr ? 30 : -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            <div className="mb-2">
              <h3 className="text-xl font-bold text-white mb-3">
                {isAr ? 'معلومات التواصل' : 'Contact Info'}
              </h3>
              <p className="text-white/40 text-sm leading-relaxed">
                {isAr
                  ? 'نحن هنا لمساعدتك. تواصل معنا وسنرد عليك في أقرب وقت.'
                  : "We're here to help. Reach out and we'll get back to you shortly."}
              </p>
            </div>

            <div className="space-y-4">
              {CONTACT_INFO.map((info) => {
                const Icon = info.icon
                return (
                  <a
                    key={info.labelEn}
                    href={info.href}
                    className="group flex items-center gap-4 p-4 rounded-xl glass glass-hover transition-all duration-500"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ring-1"
                      style={{
                        backgroundColor: `${info.color}12`,
                        color: info.color,
                        // @ts-expect-error - CSS custom prop
                        '--tw-ring-color': `${info.color}15`,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-white/30 mb-0.5">
                        {isAr ? info.labelAr : info.labelEn}
                      </p>
                      <p className="text-sm text-white/70 group-hover:text-white transition-colors">
                        {isAr ? info.valueAr : info.valueEn}
                      </p>
                    </div>
                  </a>
                )
              })}
            </div>
          </motion.div>

           
        </div>
      </div>
    </section>
  )
}
