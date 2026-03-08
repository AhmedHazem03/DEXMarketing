import { getTranslations } from 'next-intl/server'
import { setRequestLocale } from 'next-intl/server'
import { Navbar, Footer } from '@/components/landing'
import { Mail, Phone, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    const t = await getTranslations({ locale, namespace: 'common' })
    return {
        title: t('contact') + ' - DEX',
        alternates: {
            canonical: '/contact',
        },
    }
}

export default async function ContactPage(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    setRequestLocale(locale)
    const isAr = locale === 'ar'

    // Fetch dynamic content
    const supabase = await createClient()
    const { data: pageData } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', 'contact')
        .single()

    const data: any = pageData
    const content = isAr ? data?.content_ar : data?.content_en

    const contactInfo = {
        email: content?.email || 'info@dex-advertising.com',
        phone: content?.phone || '+20 123 456 7890',
        address: content?.address || (isAr ? 'القاهرة، التجمع الخامس، مصر' : 'Cairo, Fifth Settlement, Egypt'),
        whatsapp: content?.whatsapp
    }

    const CONTACT_ITEMS = [
        { icon: Phone, label: isAr ? 'الهاتف' : 'Phone', value: contactInfo.phone },
        { icon: Mail, label: isAr ? 'البريد الإلكتروني' : 'Email', value: contactInfo.email },
        { icon: MapPin, label: isAr ? 'العنوان' : 'Address', value: contactInfo.address },
    ]

    return (
        <main className="min-h-screen bg-[#022026] overflow-hidden font-sans">
            <Navbar />

            {/* Page Header */}
            <div className="relative pt-32 pb-14 text-center text-white md:pt-36 md:pb-16">
                <div className="absolute inset-0 bg-gradient-to-b from-[#011118] via-[#022026] to-[#022026]" />
                <div className="absolute top-0 right-1/4 w-[400px] h-[300px] bg-[#F2CB05]/[0.03] blur-[120px] rounded-full" />
                <div className="container relative z-10 px-6">
                    <span className="inline-block text-[#F2CB05]/70 text-xs font-mono tracking-[0.3em] uppercase mb-4">
                        {isAr ? '— تواصل معنا —' : '— Get in Touch —'}
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black mb-6 font-serif">
                        {isAr ? 'تواصل معنا' : 'Contact Us'}
                    </h1>
                    <div className="w-12 h-1 bg-[#F2CB05] mx-auto rounded-full mb-6" />
                    <p className="text-lg text-white/40 max-w-2xl mx-auto">
                        {isAr
                            ? 'نحن هنا للإجابة على جميع استفساراتك ومساعدتك في بدء مشروعك.'
                            : 'We are here to answer all your inquiries and help you start your project.'}
                    </p>
                </div>
            </div>

            <section className="bg-[#022026] py-16 md:py-20">
                <div className="container mx-auto px-6">
                    <div className="mx-auto grid max-w-6xl gap-10 md:gap-12 lg:grid-cols-2">

                        {/* Contact Info */}
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-4 font-serif">
                                    {isAr ? 'معلومات التواصل' : 'Get in Touch'}
                                </h2>
                                <p className="text-white/40 text-sm leading-relaxed">
                                    {isAr
                                        ? 'لديك فكرة مشروع؟ أو تريد تطوير علامتك التجارية؟ تواصل معنا الآن.'
                                        : 'Have a project idea? Or want to grow your brand? Contact us now.'}
                                </p>
                            </div>

                            <div className="space-y-5">
                                {CONTACT_ITEMS.map((item) => {
                                    const Icon = item.icon
                                    return (
                                        <div key={item.label} className="flex items-start gap-4 group">
                                            <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-[#F2CB05] shrink-0 group-hover:bg-[#F2CB05]/10 transition-colors">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-white/30 mb-0.5">{item.label}</p>
                                                <p className="text-sm text-white/70" dir={item.icon === Phone ? 'ltr' : undefined}>{item.value}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>



                    </div>
                </div>
            </section>

            <Footer />
        </main>
    )
}
