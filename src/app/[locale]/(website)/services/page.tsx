import { getTranslations } from 'next-intl/server'
import { setRequestLocale } from 'next-intl/server'
import { ServicesSection } from '@/components/landing/services-section'
import { CTASection } from '@/components/landing/cta-section'
import { Check } from 'lucide-react'

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    const t = await getTranslations({ locale, namespace: 'common' })
    return {
        title: t('services') + ' - DEX',
        alternates: {
            canonical: '/services',
        },
    }
}

export default async function ServicesPage(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    setRequestLocale(locale)
    const isAr = locale === 'ar'

    const features = [
        { title: isAr ? 'تحليل السوق' : 'Market Analysis', desc: isAr ? 'ندرس منافسيك وجمهورك المستهدف بدقة.' : 'We analyze your competitors and target audience.' },
        { title: isAr ? 'استراتيجية مخصصة' : 'Custom Strategy', desc: isAr ? 'نصمم خطة عمل تناسب أهدافك وميزانيتك.' : 'We tailor a plan to fit your goals and budget.' },
        { title: isAr ? 'تنفيذ احترافي' : 'Pro Execution', desc: isAr ? 'فريق من الخبراء ينفذ كل خطوة بإتقان.' : 'Expert team executing every step flawlessly.' },
        { title: isAr ? 'قياس النتائج' : 'Result Tracking', desc: isAr ? 'تقارير دورية وشفافة عن الأداء.' : 'Regular transparent performance reports.' },
    ]

    return (
        <>
            {/* Page Header */}
            <div className="relative pt-32 pb-14 text-center text-white md:pt-36 md:pb-16">
                <div className="absolute inset-0 bg-gradient-to-b from-[#011118] via-[#022026] to-[#011a1f]" />
                <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-[#F2CB05]/[0.03] blur-[120px] rounded-full" />
                <div className="container relative z-10 px-6">
                    <span className="inline-block text-[#F2CB05]/70 text-xs font-serif tracking-[0.3em] uppercase mb-4">
                        {isAr ? '— ما نقدمه —' : '— What We Offer —'}
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black mb-6 font-serif">
                        {isAr ? 'خدماتنا' : 'Our Services'}
                    </h1>
                    <div className="w-12 h-1 bg-[#F2CB05] mx-auto rounded-full mb-6" />
                    <p className="text-lg text-white/40 max-w-2xl mx-auto">
                        {isAr
                            ? 'نقدم مجموعة متكاملة من الحلول الرقمية لمساعدة عملك على النمو والتوسع.'
                            : 'We provide a comprehensive suite of digital solutions to help your business grow and scale.'}
                    </p>
                </div>
            </div>

            <ServicesSection />

            {/* Why Choose Us */}
            <section className="bg-[#022026] py-16 md:py-20">
                <div className="container mx-auto px-6">
                    <div className="mb-10 text-center md:mb-12">
                        <span className="text-xs font-serif text-[#F2CB05]/70 uppercase tracking-[0.3em] mb-4 block">
                            {isAr ? '— لماذا نحن —' : '— Why Us —'}
                        </span>
                        <h2 className="text-3xl font-bold text-white mb-4 font-serif">
                            {isAr ? 'لماذا تختار DEX؟' : 'Why Choose DEX?'}
                        </h2>
                        <div className="w-12 h-1 bg-[#F2CB05] mx-auto rounded-full" />
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feat, i) => (
                            <div key={i} className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-[#F2CB05]/20 transition-colors">
                                <div className="w-11 h-11 rounded-xl bg-[#F2CB05]/10 flex items-center justify-center mb-4 text-[#F2CB05]">
                                    <Check className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                                <p className="text-sm text-white/40">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <CTASection />
        </>
    )
}
