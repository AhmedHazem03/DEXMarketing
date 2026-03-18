import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

/** Map each role to its allowed URL prefix(es) */
const ROLE_PATH_MAP: Record<string, string[]> = {
    admin: ['/admin'],
    client: ['/client'],
    team_leader: ['/team-leader'],
    account_manager: ['/account-manager'],
    creator: ['/creator'],
    designer: ['/creator'],
    accountant: ['/accountant'],
    videographer: ['/videographer'],
    editor: ['/editor'],
    photographer: ['/photographer'],
}

/** The default landing path for each role */
const ROLE_HOME: Record<string, string> = {
    admin: '/admin',
    client: '/client',
    team_leader: '/team-leader',
    account_manager: '/account-manager',
    creator: '/creator',
    designer: '/creator',
    accountant: '/accountant',
    videographer: '/videographer',
    editor: '/editor',
    photographer: '/photographer',
}

export default async function DashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    let user: any = null
    let role = 'client'
    let department: any = null

    try {
        const supabase = await createClient()
        // Server Components MUST use getUser() — it verifies the JWT with
        // Supabase Auth. getSession() only reads cookies and is insecure here.
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
            redirect(`/${locale}/login`)
        }

        user = authUser

        // Fetch role, department, active status & avatar
        const { data: profile } = await supabase
            .from('users')
            .select('role, department, is_active, avatar_url')
            .eq('id', authUser.id)
            .single()

        // Block deactivated users
        const profileData = profile as { role?: string; department?: string; is_active?: boolean | null; avatar_url?: string | null } | null
        if (profileData && profileData.is_active === false) {
            redirect(`/${locale}/blocked`)
        }

        role = (profileData?.role || 'client') as string
        department = profileData?.department || null
        if (profileData?.avatar_url) {
            user = { ...authUser, db_avatar_url: profileData.avatar_url }
        }
    } catch (e: any) {
        // Re-throw redirect (Next.js uses a special error for redirect)
        if (e?.digest?.startsWith?.('NEXT_REDIRECT')) throw e
        // Supabase temporarily unreachable — render page without auth data.
        // Client-side hooks will handle auth state independently.
    }
    const normalizedRole = role.toLowerCase().trim()

    // Get current path for route protection
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') || ''

    // Strip locale prefix to get the logical path
    const logicalPath = pathname.replace(/^\/(en|ar)/, '') || '/'

    // Admin can access everything
    if (normalizedRole !== 'admin') {
        const allowedPrefixes = ROLE_PATH_MAP[normalizedRole] || []
        const isAllowed = allowedPrefixes.some(prefix => logicalPath.startsWith(prefix))

        if (!isAllowed) {
            redirect(`/${locale}${ROLE_HOME[normalizedRole] || '/client'}`)
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar role={role} department={department} />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header user={user} role={role} department={department} avatarUrl={user?.db_avatar_url || user?.user_metadata?.avatar_url} />
                <main className="flex-1 overflow-y-auto p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
