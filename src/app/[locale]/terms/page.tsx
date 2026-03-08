import { setRequestLocale } from 'next-intl/server'
import { Navbar, Footer } from '@/components/landing'
import { createClient } from '@/lib/supabase/server'
import { Calendar } from 'lucide-react'

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    const isAr = locale === 'ar'
    return {
        title: (isAr ? 'الشروط والأحكام' : 'Terms & Conditions') + ' - DEX',
        description: isAr ? 'الشروط والأحكام الخاصة باستخدام خدمات DEX' : 'Terms and conditions for using DEX services',
        alternates: {
            canonical: '/terms',
        },
    }
}

export default async function TermsPage(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    setRequestLocale(locale)
    const isAr = locale === 'ar'

    const supabase = await createClient()
    const { data: pageData } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', 'terms')
        .single()

    const data: any = pageData
    const content = isAr ? data?.content_ar : data?.content_en
    const title = isAr ? 'الشروط والأحكام' : 'Terms & Conditions'

    const pageContent = {
        title: content?.title || title,
        body: content?.content || (isAr
            ? 'يرجى قراءة الشروط والأحكام التالية بعناية قبل استخدام خدماتنا...\n\n(هذا المحتوى افتراضي، يرجى تحديثه من لوحة التحكم)'
            : 'Please read the following terms and conditions carefully before using our services...\n\n(This is default content, please update from admin panel)'),
        lastUpdated: content?.last_updated || new Date().getFullYear().toString()
    }

    return (
        <main className="min-h-screen bg-[#022026] font-sans">
            <Navbar />

            <div className="relative pt-32 pb-12 text-center text-white md:pt-36 md:pb-14">
                <div className="absolute inset-0 bg-gradient-to-b from-[#011118] via-[#022026] to-[#022026]" />
                <div className="container relative z-10 px-6">
                    <span className="inline-block text-[#F2CB05]/70 text-xs font-mono tracking-[0.3em] uppercase mb-4">
                        {isAr ? '— قانوني —' : '— Legal —'}
                    </span>
                    <h1 className="text-3xl md:text-5xl font-black mb-4 font-serif">
                        {pageContent.title}
                    </h1>
                    <div className="w-12 h-1 bg-[#F2CB05] mx-auto rounded-full mb-4" />
                    <div className="flex items-center justify-center gap-2 text-white/30 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{isAr ? 'آخر تحديث:' : 'Last Updated:'} {pageContent.lastUpdated}</span>
                    </div>
                </div>
            </div>

            <section className="bg-[#022026] py-14 md:py-16">
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="border border-white/5 bg-white/[0.02] rounded-2xl p-8 md:p-12">
                        <div className="max-w-none text-white/40 whitespace-pre-wrap leading-relaxed text-sm">
                            {pageContent.body}
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    )
}
