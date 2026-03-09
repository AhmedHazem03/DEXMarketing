'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Save, Phone, Mail, MapPin, Globe, Loader2 } from 'lucide-react'
import { useSiteSettings } from '@/hooks/use-cms'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { saveSiteSettingsAction } from '@/lib/actions/save-settings'
import { useQueryClient } from '@tanstack/react-query'

const CONTACT_KEYS = [
    'contact_phone', 'contact_email', 'contact_address_ar', 'contact_address_en',
    'social_facebook', 'social_instagram', 'social_twitter', 'social_tiktok',
] as const

type ContactKey = typeof CONTACT_KEYS[number]
type ContactSettingsData = Record<ContactKey, string>

const EMPTY_SETTINGS: ContactSettingsData = {
    contact_phone: '',
    contact_email: '',
    contact_address_ar: '',
    contact_address_en: '',
    social_facebook: '',
    social_instagram: '',
    social_twitter: '',
    social_tiktok: '',
}

export function ContactSettings() {
    const t = useTranslations('contactSettings')
    const { data: allSettings, isLoading } = useSiteSettings()
    const queryClient = useQueryClient()

    const [isSaving, setIsSaving] = useState(false)

    const [settings, setSettings] = useState<ContactSettingsData>(EMPTY_SETTINGS)

    // Sync local state from server data
    useEffect(() => {
        if (allSettings) {
            const loaded: Partial<ContactSettingsData> = {}
            for (const key of CONTACT_KEYS) {
                if (allSettings[key]) {
                    loaded[key] = String(allSettings[key])
                }
            }
            setSettings(prev => ({ ...prev, ...loaded }))
        }
    }, [allSettings])

    async function saveSettings() {
        // Validate email format
        if (settings.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contact_email)) {
            toast.error(t('invalidEmail') ?? 'Invalid email format')
            return
        }

        // Validate social media URLs
        const urlPattern = /^https?:\/\/.+/i
        const socialFields = [
            { key: 'social_facebook' as const, label: 'Facebook' },
            { key: 'social_instagram' as const, label: 'Instagram' },
            { key: 'social_twitter' as const, label: 'Twitter' },
            { key: 'social_tiktok' as const, label: 'TikTok' },
        ]
        for (const { key, label } of socialFields) {
            if (settings[key] && !urlPattern.test(settings[key])) {
                toast.error(t('invalidUrl') ?? `Invalid URL for ${label}`)
                return
            }
        }

        try {
            setIsSaving(true)
            const result = await saveSiteSettingsAction(settings)
            if (result.error) throw new Error(result.error)
            // Refresh local React Query cache
            queryClient.invalidateQueries({ queryKey: ['site-settings'] })
            toast.success(t('saveSuccess'))
        } catch (error) {
            const msg = error instanceof Error ? error.message : ''
            if (msg.includes('Failed to save')) {
                const count = msg.match(/\d+/)?.[0] || '?'
                toast.error(t('savePartialError', { count }))
            } else {
                toast.error(t('saveError'))
            }
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* بيانات التواصل الأساسية */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        {t('contactInfo')}
                    </CardTitle>
                    <CardDescription>
                        {t('contactInfoDesc')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">{t('phone')}</Label>
                            <Input
                                id="phone"
                                value={settings.contact_phone}
                                onChange={(e) => setSettings(prev => ({ ...prev, contact_phone: e.target.value }))}
                                placeholder="+20 123 456 7890"
                                dir="ltr"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">{t('email')}</Label>
                            <Input
                                id="email"
                                type="email"
                                value={settings.contact_email}
                                onChange={(e) => setSettings(prev => ({ ...prev, contact_email: e.target.value }))}
                                placeholder="info@company.com"
                                dir="ltr"
                            />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="address_ar">{t('addressAr')}</Label>
                            <Input
                                id="address_ar"
                                value={settings.contact_address_ar}
                                onChange={(e) => setSettings(prev => ({ ...prev, contact_address_ar: e.target.value }))}
                                placeholder="القاهرة، مصر"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address_en">{t('addressEn')}</Label>
                            <Input
                                id="address_en"
                                value={settings.contact_address_en}
                                onChange={(e) => setSettings(prev => ({ ...prev, contact_address_en: e.target.value }))}
                                placeholder="Cairo, Egypt"
                                dir="ltr"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* روابط السوشيال ميديا */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        {t('socialMedia')}
                    </CardTitle>
                    <CardDescription>
                        {t('socialMediaDesc')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="facebook">Facebook</Label>
                            <Input
                                id="facebook"
                                value={settings.social_facebook}
                                onChange={(e) => setSettings(prev => ({ ...prev, social_facebook: e.target.value }))}
                                placeholder="https://facebook.com/..."
                                dir="ltr"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="instagram">Instagram</Label>
                            <Input
                                id="instagram"
                                value={settings.social_instagram}
                                onChange={(e) => setSettings(prev => ({ ...prev, social_instagram: e.target.value }))}
                                placeholder="https://instagram.com/..."
                                dir="ltr"
                            />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="twitter">Twitter / X</Label>
                            <Input
                                id="twitter"
                                value={settings.social_twitter}
                                onChange={(e) => setSettings(prev => ({ ...prev, social_twitter: e.target.value }))}
                                placeholder="https://twitter.com/..."
                                dir="ltr"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tiktok">TikTok</Label>
                            <Input
                                id="tiktok"
                                value={settings.social_tiktok}
                                onChange={(e) => setSettings(prev => ({ ...prev, social_tiktok: e.target.value }))}
                                placeholder="https://tiktok.com/@..."
                                dir="ltr"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* زر الحفظ */}
            <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={isSaving} size="lg">
                    {isSaving ? (
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="me-2 h-4 w-4" />
                    )}
                    {t('saveSettings')}
                </Button>
            </div>
        </div>
    )
}
