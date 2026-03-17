import {
  HeroSection,
  PartnersOrbit,
  AboutSection,
  ServicesSection,
  StatsSection,
  PortfolioSection,
  TestimonialsSection,
  CTASection,
  Navbar,
  Footer,
} from '@/components/landing'


import { SiteSettingsProvider } from '@/components/providers/site-settings-provider'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { getSiteSettings } from '@/lib/actions/get-site-settings'
import { locales } from '@/i18n/config'
import { setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'

export const revalidate = 3600 // ISR: revalidate landing page every hour

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const isAr = locale === 'ar'

  return {
    title: isAr ? 'DEX - وكالة التسويق الرقمي' : 'DEX - Digital Marketing Agency',
    description: isAr
      ? 'مركز القيادة الرقمية لوكالات التسويق. خدمات التسويق الرقمي والتصميم والفيديو والتصوير.'
      : 'Digital Command Center for Marketing Agencies. Digital marketing, design, video, and photography services.',
    keywords: isAr
      ? ['تسويق رقمي', 'وكالة تسويق', 'تصميم', 'فيديو', 'تصوير', 'DEX']
      : ['digital marketing', 'marketing agency', 'design', 'video', 'photography', 'DEX'],
    openGraph: {
      title: isAr ? 'DEX - وكالة التسويق الرقمي' : 'DEX - Digital Marketing Agency',
      description: isAr
        ? 'مركز القيادة الرقمية لوكالات التسويق'
        : 'Digital Command Center for Marketing Agencies',
      type: 'website',
      locale: isAr ? 'ar_EG' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: isAr ? 'DEX - وكالة التسويق الرقمي' : 'DEX - Digital Marketing Agency',
      description: isAr
        ? 'مركز القيادة الرقمية لوكالات التسويق'
        : 'Digital Command Center for Marketing Agencies',
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const settings = await getSiteSettings()

  return (
    <SiteSettingsProvider settings={settings}>
      <main className="relative min-h-screen bg-transparent text-white overflow-x-hidden">
        <Navbar />
        <ErrorBoundary>
          <HeroSection />
        </ErrorBoundary>
        <ErrorBoundary>
          <div className="cv-auto">
            <PartnersOrbit />
          </div>
        </ErrorBoundary>
        <ErrorBoundary>
          <div className="cv-auto">
            <StatsSection />
          </div>
        </ErrorBoundary>
        <ErrorBoundary>
          <div className="cv-auto">
            <ServicesSection />
          </div>
        </ErrorBoundary>
        <ErrorBoundary>
          <div className="cv-auto">
            <PortfolioSection />
          </div>
        </ErrorBoundary>
        <ErrorBoundary>
          <div className="cv-auto">
            <AboutSection />
          </div>
        </ErrorBoundary>
        <ErrorBoundary>
          <div className="cv-auto">
            <TestimonialsSection />
          </div>
        </ErrorBoundary>
        <ErrorBoundary>
          <div className="cv-auto">
            <CTASection />
          </div>
        </ErrorBoundary>
        <Footer />
      </main>
    </SiteSettingsProvider>
  )
}
