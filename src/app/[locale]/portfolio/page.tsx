import { getTranslations } from 'next-intl/server'
import { setRequestLocale } from 'next-intl/server'
import { Navbar, Footer } from '@/components/landing'
import { PortfolioSection } from '@/components/landing/portfolio-section'
import { CTASection } from '@/components/landing/cta-section'

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    const t = await getTranslations({ locale, namespace: 'common' })
    return {
        title: t('portfolio') + ' - DEX',
        alternates: {
            canonical: '/portfolio',
        },
    }
}

export default async function PortfolioPage(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    setRequestLocale(locale)
    const isAr = locale === 'ar'

    return (
        <main className="min-h-screen bg-[#022026] overflow-hidden font-sans">
            <Navbar />

            {/* Page Header */}
            <div className="relative pt-32 pb-14 text-center text-white md:pt-36 md:pb-16">
                <div className="absolute inset-0 bg-gradient-to-b from-[#011118] via-[#022026] to-[#022026]" />
                <div className="absolute top-0 left-0 w-[400px] h-[300px] bg-cyan-500/[0.03] blur-[120px] rounded-full" />
                <div className="container relative z-10 px-6">
                    <span className="inline-block text-[#F2CB05]/70 text-xs font-mono tracking-[0.3em] uppercase mb-4">
                        {isAr ? '— أعمالنا —' : '— Our Work —'}
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black mb-6 font-serif">
                        {isAr ? 'معرض الأعمال' : 'Our Portfolio'}
                    </h1>
                    <div className="w-12 h-1 bg-[#F2CB05] mx-auto rounded-full mb-6" />
                    <p className="text-lg text-white/40 max-w-2xl mx-auto">
                        {isAr
                            ? 'تشكيلة مختارة من المشاريع التي قمنا بتنفيذها لشركاء النجاح.'
                            : 'A curated selection of projects we delivered for our success partners.'}
                    </p>
                </div>
            </div>

            <PortfolioSection />

            <div className="bg-[#022026] py-10 text-center md:py-12">
                <div className="container mx-auto px-6">
                    <p className="text-white/30 text-sm">
                        {isAr ? 'هل تريد رؤية المزيد؟ تواصل معنا لعرض ملف أعمالنا الكامل.' : 'Want to see more? Contact us for our full portfolio deck.'}
                    </p>
                </div>
            </div>

            <CTASection />
            <Footer />
        </main>
    )
}
