'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// Input Validation Schemas
// ============================================

const createUserSchema = z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
    role: z.string().min(1, 'Role is required'),
    department: z.string().nullable().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password too long'),
})

const updateProfileSchema = z.object({
    userId: z.string().uuid('Invalid user ID'),
    name: z.string().min(2).max(100).optional(),
    phone: z.string().max(20).optional(),
    avatar_url: z.string().url().optional(),
})

const updatePasswordSchema = z.object({
    userId: z.string().uuid('Invalid user ID'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password too long'),
})

// ============================================
// Authorization Helpers
// ============================================

async function getCurrentUser() {
    const supabase = await createClient()

    // Get user ID from session cookie (no network call) to enable parallel requests
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null

    // Parallelize: server-side auth validation + profile lookup run simultaneously
    const [{ data: { user } }, { data: profile }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('users').select('role').eq('id', session.user.id).single()
    ])

    if (!user) return null
    return { id: user.id, role: (profile as any)?.role as string | undefined }
}

async function requireAdmin() {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
        throw new Error('Authentication required')
    }
    if (currentUser.role !== 'admin') {
        throw new Error('Admin access required')
    }
    return currentUser
}

async function requireSelfOrAdmin(targetUserId: string) {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
        throw new Error('Authentication required')
    }
    if (currentUser.id !== targetUserId && currentUser.role !== 'admin') {
        throw new Error('You can only modify your own account')
    }
    return currentUser
}

/** Roles that require a department to be set */
const DEPARTMENT_REQUIRED_ROLES = ['team_leader', 'creator', 'videographer', 'editor', 'photographer'] as const

/** Auto-assign department based on role if not explicitly provided */
function resolveDepartment(role: string, department?: string | null): string | null {
    if (department) return department
    if (['videographer', 'editor', 'photographer'].includes(role)) return 'photography'
    if (role === 'creator') return 'content'
    return null
}

export async function createUser(data: {
    email: string
    name: string
    role: string
    department?: string
    password: string
}) {
    try {
        // Authorization: Only admins can create users
        await requireAdmin()
    } catch (e: any) {
        return { success: false, error: e.message || 'Unauthorized' }
    }

    // Input validation
    const validation = createUserSchema.safeParse(data)
    if (!validation.success) {
        return { success: false, error: validation.error.issues[0]?.message || 'Invalid input' }
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { success: false, error: 'تكوين الخادم (Server Config) غير مكتمل. يرجى إضافة مفتاح الخدمة.' }
    }

    const department = resolveDepartment(data.role, data.department)

    // Validate: department-specific roles must have a department
    if (DEPARTMENT_REQUIRED_ROLES.includes(data.role as any) && !department) {
        return { success: false, error: 'هذا الدور يتطلب تحديد القسم (photography أو content)' }
    }

    const supabase = createAdminClient()

    // Create user in Supabase Auth
    const { data: user, error } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
            name: data.name,
            role: data.role,
            department,
        }
    })

    if (error) {
        console.error('Create User Error:', error)
        return { success: false, error: error.message }
    }

    if (user.user) {
        // Update public.users to ensure role & department are correct
        // department column added via migration_v2_departments
        const { error: updateError } = await (supabase
            .from('users') as any)
            .update({
                name: data.name,
                role: data.role,
                department,
            })
            .eq('id', user.user.id)

        if (updateError) console.error('Profile Update Error:', updateError)

        // Auto-create client record for client role
        if (data.role === 'client') {
            const { error: clientError } = await supabase
                .from('clients')
                .insert({
                    user_id: user.user.id,
                    name: data.name,
                    email: data.email,
                } as any)
            if (clientError) console.error('Client Record Create Error:', clientError)
        }
    }

    revalidatePath('/[locale]/(dashboard)/admin/users')
    return { success: true, user: user.user }
}

/**
 * Update current user profile (name, phone, avatar)
 */
export async function updateProfile(data: {
    userId: string
    name?: string
    phone?: string
    avatar_url?: string
}) {
    // Authorization: Users can only update their own profile, admins can update anyone
    try {
        await requireSelfOrAdmin(data.userId)
    } catch (e: any) {
        return { success: false, error: e.message || 'Unauthorized' }
    }

    // Input validation
    const validation = updateProfileSchema.safeParse(data)
    if (!validation.success) {
        return { success: false, error: validation.error.issues[0]?.message || 'Invalid input' }
    }

    const supabase = createAdminClient()

    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url

    const { data: updatedUser, error } = await supabase
        .from('users')
        // @ts-ignore - Supabase types don't match our schema yet
        .update(updateData)
        .eq('id', data.userId)
        .select()
        .single()

    if (error) {
        console.error('Update Profile Error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/[locale]/(dashboard)/account')
    revalidatePath('/[locale]/(dashboard)/profile')
    return { success: true, user: updatedUser }
}

/**
 * Update user email (DISABLED - Email changes are no longer allowed)
 */
export async function updateEmail(_userId: string, _newEmail: string) {
    return { success: false, error: 'Email changes have been disabled. Please contact an administrator.' }
}

/**
 * Update user fields (Admin only) — handles client record sync on role change
 */
export async function updateUserAdmin(userId: string, updates: { name?: string; role?: string; is_active?: boolean }) {
    try {
        await requireAdmin()
    } catch (e: any) {
        return { success: false, error: e.message || 'Unauthorized' }
    }

    const supabase = createAdminClient()

    // If role is being changed, sync the clients table
    if (updates.role !== undefined) {
        const { data: current } = await supabase
            .from('users')
            .select('role, name, email')
            .eq('id', userId)
            .single()

        const oldRole = (current as any)?.role
        const newRole = updates.role

        if (oldRole === 'client' && newRole !== 'client') {
            // Was client → remove client record
            const { error: delErr } = await supabase
                .from('clients')
                .delete()
                .eq('user_id', userId)
            if (delErr) console.error('Remove client record error:', delErr)
        } else if (oldRole !== 'client' && newRole === 'client') {
            // Became client → create client record if not exists
            const { data: existing } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle()
            if (!existing) {
                const { error: insErr } = await supabase
                    .from('clients')
                    .insert({
                        user_id: userId,
                        name: (current as any)?.name || '',
                        email: (current as any)?.email || '',
                    } as any)
                if (insErr) console.error('Create client record error:', insErr)
            }
        }
    }

    const { data: updatedUser, error } = await supabase
        .from('users')
        // @ts-ignore
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

    if (error) {
        console.error('Update User Error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/[locale]/(dashboard)/admin/users')
    return { success: true, user: updatedUser }
}

/**
 * Update user password (Admin only)
 */
export async function updatePassword(userId: string, newPassword: string) {
    // Authorization: Only admins can update passwords
    try {
        await requireAdmin()
    } catch (e: any) {
        return { success: false, error: e.message || 'Unauthorized' }
    }

    // Input validation
    const validation = updatePasswordSchema.safeParse({ userId, newPassword })
    if (!validation.success) {
        return { success: false, error: validation.error?.issues[0]?.message || 'Invalid input' }
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
    })

    if (error) {
        console.error('Update Password Error:', error)
        return { success: false, error: error?.message || 'Failed to update password' }
    }

    return { success: true }
}

/**
 * Delete user account
 */
export async function deleteAccount(userId: string) {
    // Authorization: Only admins can delete accounts
    try {
        await requireAdmin()
    } catch (e: any) {
        return { success: false, error: e.message || 'Unauthorized' }
    }

    const supabase = createAdminClient()

    // Delete from clients table if the user has role 'client'
    const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

    if (userProfile?.role === 'client') {
        const { error: clientDeleteError } = await supabase
            .from('clients')
            .delete()
            .eq('user_id', userId)

        if (clientDeleteError) {
            console.error('Delete Client Record Error:', clientDeleteError)
            return { success: false, error: 'Failed to delete client record: ' + clientDeleteError.message }
        }
    }

    // First, deactivate the user — check for errors before proceeding
    const { error: deactivateError } = await supabase
        .from('users')
        // @ts-ignore - Supabase types don't match our schema yet
        .update({ is_active: false })
        .eq('id', userId)

    if (deactivateError) {
        console.error('Deactivate User Error:', deactivateError)
        return { success: false, error: 'Failed to deactivate user: ' + deactivateError.message }
    }

    // Then delete from auth
    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) {
        console.error('Delete Account Error:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

/**
 * Ensure a client record exists for a user with role 'client'.
 * Useful for users created before the auto-create fix.
 */
export async function ensureClientRecord() {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated' }

    // Verify the user has the client role
    const { data: profile } = await (supabase.from('users') as any)
        .select('name, email, role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'client') {
        return { success: false, error: 'User is not a client' }
    }

    // Check if client record already exists
    const { data: existing } = await adminSupabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (existing) return { success: true, alreadyExists: true }

    // Create the missing client record
    const { error: insertError } = await adminSupabase
        .from('clients')
        .insert({
            user_id: user.id,
            name: profile.name || user.email?.split('@')[0] || 'Client',
            email: profile.email || user.email,
        } as any)

    if (insertError) {
        console.error('ensureClientRecord error:', insertError)
        return { success: false, error: insertError.message }
    }

    revalidatePath('/[locale]/(dashboard)/client')
    return { success: true, created: true }
}
