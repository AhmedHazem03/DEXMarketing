import { getTranslations } from 'next-intl/server'
import { setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Target, Eye, BookOpen } from 'lucide-react'

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    const t = await getTranslations({ locale, namespace: 'common' })
    return {
        title: (locale === 'ar' ? 'من نحن' : 'About Us') + ' - DEX',
        alternates: {
            canonical: '/about',
        },
    }
}

export default async function AboutPage(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    setRequestLocale(locale)
    const isAr = locale === 'ar'

    // Fetch dynamic content
    const supabase = await createClient()
    const { data: pageData } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', 'about')
        .single()

    const data: any = pageData
    const content = isAr ? data?.content_ar : data?.content_en

    // Default Fallbacks
    const aboutContent = {
        mission: content?.mission || (isAr ? 'نحن نسعى لتقديم أفضل الحلول التسويقية الرقمية التي تحقق نتائج حقيقية وقابلة للقياس لعملائنا.' : 'We strive to deliver the best digital marketing solutions that achieve real, measurable results for our clients.'),
        vision: content?.vision || (isAr ? 'أن نكون الوكالة الرائدة في مجال التسويق الرقمي في المنطقة.' : 'To be the leading digital marketing agency in the region.'),
        story: content?.story || (isAr ? 'بدأت رحلتنا بشغف للإبداع الرقمي وطموح لبناء علامات تجارية مميزة. اليوم نخدم أكثر من 150 عميل بفريق من 30 خبير متخصص.' : 'Our journey started with a passion for digital creativity and an ambition to build remarkable brands. Today we serve over 150 clients with a team of 30 specialized experts.'),
    }

    return (
        <>
            {/* Page Header */}
            <div className="relative pt-32 pb-14 text-center text-white md:pt-36 md:pb-16">
                <div className="absolute inset-0 bg-gradient-to-b from-[#011118] via-[#022026] to-[#022026]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#F2CB05]/[0.03] blur-[120px] rounded-full" />
                <div className="container relative z-10 px-6">
                    <span className="inline-block text-[#F2CB05]/70 text-xs font-mono tracking-[0.3em] uppercase mb-4">
                        {isAr ? '— من نحن —' : '— About Us —'}
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black mb-6 font-serif">
                        {isAr ? 'من نحن' : 'About Us'}
                    </h1>
                    <div className="w-12 h-1 bg-[#F2CB05] mx-auto rounded-full mb-6" />
                    <p className="text-lg text-white/40 max-w-2xl mx-auto">
                        {isAr
                            ? 'تعرف على قصتنا ورؤيتنا للمستقبل.'
                            : 'Learn about our story and our vision for the future.'}
                    </p>
                </div>
            </div>

            <section className="bg-[#022026] py-16 md:py-20">
                <div className="container mx-auto px-6">
                    <div className="space-y-16 md:space-y-20">

                        {/* Our Story */}
                        <div className="grid items-center gap-10 md:gap-12 lg:grid-cols-2">
                            <div className="order-2 lg:order-1 space-y-6">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F2CB05]/10 text-[#F2CB05] text-sm font-bold">
                                    <BookOpen className="w-4 h-4" />
                                    {isAr ? 'قصتنا' : 'Our Story'}
                                </div>
                                <h2 className="text-3xl font-bold text-white leading-tight font-serif">
                                    {isAr ? 'سنوات من الخبرة والابتكار' : 'Years of Experience & Innovation'}
                                </h2>
                                <p className="text-base text-white/40 leading-relaxed whitespace-pre-wrap">
                                    {aboutContent.story}
                                </p>
                            </div>
                            <div className="order-1 lg:order-2 bg-gradient-to-br from-[#F2CB05]/10 to-cyan-500/10 rounded-3xl h-[400px] flex items-center justify-center relative overflow-hidden border border-white/5">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(242,203,5,0.05),transparent_70%)]" />
                                <div className="text-9xl font-black opacity-10 text-white select-none font-serif">DEX</div>
                            </div>
                        </div>

                        {/* Mission & Vision */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-[#F2CB05]/20 transition-colors">
                                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6">
                                    <Target className="w-7 h-7" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4 font-serif">{isAr ? 'مهمتنا' : 'Our Mission'}</h3>
                                <p className="text-white/40 leading-relaxed whitespace-pre-wrap">
                                    {aboutContent.mission}
                                </p>
                            </div>

                            <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-[#F2CB05]/20 transition-colors">
                                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6">
                                    <Eye className="w-7 h-7" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4 font-serif">{isAr ? 'رؤيتنا' : 'Our Vision'}</h3>
                                <p className="text-white/40 leading-relaxed whitespace-pre-wrap">
                                    {aboutContent.vision}
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>
        </>
    )
}
