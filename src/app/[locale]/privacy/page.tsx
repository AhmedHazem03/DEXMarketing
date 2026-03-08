import { setRequestLocale } from 'next-intl/server'
import { Navbar, Footer } from '@/components/landing'
import { createClient } from '@/lib/supabase/server'
import { ShieldCheck, Calendar } from 'lucide-react'

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    const isAr = locale === 'ar'
    return {
        title: (isAr ? 'سياسة الخصوصية' : 'Privacy Policy') + ' - DEX',
        description: isAr ? 'سياسة الخصوصية وكيفية تعاملنا مع بياناتك في DEX' : 'Privacy Policy and how we handle your data at DEX',
        alternates: {
            canonical: '/privacy',
        },
    }
}

export default async function PrivacyPage(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    setRequestLocale(locale)
    const isAr = locale === 'ar'

    const supabase = await createClient()
    const { data: pageData } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', 'privacy')
        .single()

    const data: any = pageData
    const content = isAr ? data?.content_ar : data?.content_en
    const title = isAr ? 'سياسة الخصوصية' : 'Privacy Policy'

    const pageContent = {
        title: content?.title || title,
        body: content?.content || (isAr
            ? 'خصوصيتك مهمة جداً بالنسبة لنا. توضح هذه السياسة كيفية جمع واستخدام وحماية بياناتك...\n\n(هذا المحتوى افتراضي، يرجى تحديثه من لوحة التحكم)'
            : 'Your privacy is critically important to us. This policy explains how we collect, use, and protect your data...\n\n(This is default content, please update from admin panel)'),
        lastUpdated: content?.last_updated || new Date().getFullYear().toString()
    }

    return (
        <main className="min-h-screen bg-[#022026] font-sans">
            <Navbar />

            <div className="relative pt-32 pb-12 text-center text-white md:pt-36 md:pb-14">
                <div className="absolute inset-0 bg-gradient-to-b from-[#011118] via-[#022026] to-[#022026]" />
                <div className="container relative z-10 px-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#F2CB05]/10 text-[#F2CB05] flex items-center justify-center mx-auto mb-6 border border-[#F2CB05]/20">
                        <ShieldCheck className="w-7 h-7" />
                    </div>
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
