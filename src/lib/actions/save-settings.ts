'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/** Saves site settings to DB then revalidates all public pages */
export async function saveSiteSettingsAction(
    settings: Record<string, string>
): Promise<{ error?: string }> {
    try {
        const supabase = await createClient()

        const rows = Object.entries(settings).map(([key, value]) => ({
            key,
            value,
            updated_at: new Date().toISOString(),
        }))

        const { error } = await supabase
            .from('site_settings')
            // @ts-ignore
            .upsert(rows, { onConflict: 'key' })

        if (error) return { error: error.message }

        revalidatePath('/', 'layout')
        return {}
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
