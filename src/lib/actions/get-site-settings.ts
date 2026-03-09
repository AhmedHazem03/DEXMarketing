export interface SiteSettings {
    theme?: {
        primary: string
        background: string
        accent: string
    }
    site_name?: string
    site_logo?: string
    contact_phone?: string
    contact_email?: string
    contact_address_ar?: string
    contact_address_en?: string
    social_facebook?: string
    social_instagram?: string
    social_twitter?: string
    social_tiktok?: string
}

// Default settings as fallback
const defaultSettings: SiteSettings = {
    site_name: 'DEX Advertising',
    contact_phone: '+20 123 456 7890',
    contact_email: 'info@dex-advertising.com',
    contact_address_ar: 'القاهرة، مصر',
    contact_address_en: 'Cairo, Egypt',
    social_facebook: 'https://facebook.com/dexadvertising',
    social_instagram: 'https://instagram.com/dexadvertising',
    social_twitter: 'https://twitter.com/dexadvertising',
    social_tiktok: 'https://tiktok.com/@dexadvertising',
    theme: {
        primary: '#FFD700',
        background: '#0A1628',
        accent: '#00D4FF'
    }
}

export async function getSiteSettings(): Promise<SiteSettings> {
    try {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('site_settings')
            .select('key, value')

        if (error || !data || data.length === 0) {
            return defaultSettings
        }

        const fromDb: Record<string, string> = {}
        for (const row of data as { key: string; value: string }[]) {
            fromDb[row.key] = row.value
        }

        return {
            site_name: fromDb['site_name'] || defaultSettings.site_name,
            site_logo: fromDb['site_logo'] || defaultSettings.site_logo,
            contact_phone: fromDb['contact_phone'] || defaultSettings.contact_phone,
            contact_email: fromDb['contact_email'] || defaultSettings.contact_email,
            contact_address_ar: fromDb['contact_address_ar'] || defaultSettings.contact_address_ar,
            contact_address_en: fromDb['contact_address_en'] || defaultSettings.contact_address_en,
            social_facebook: fromDb['social_facebook'] || defaultSettings.social_facebook,
            social_instagram: fromDb['social_instagram'] || defaultSettings.social_instagram,
            social_twitter: fromDb['social_twitter'] || defaultSettings.social_twitter,
            social_tiktok: fromDb['social_tiktok'] || defaultSettings.social_tiktok,
            theme: defaultSettings.theme,
        }
    } catch {
        return defaultSettings
    }
}

// Export defaults for components that need immediate access
export { defaultSettings }
