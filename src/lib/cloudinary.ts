// ============================================
// Cloudflare R2 Upload — Single Source of Truth
// ============================================
// Uploads through the Next.js server (/api/upload/file) which then
// writes to R2 directly.  This avoids CORS issues that arise when
// the browser tries to PUT to R2 using presigned URLs.

export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''

/**
 * Upload a file to Cloudflare R2 via the server-side proxy route.
 * @param file   - The File object to upload.
 * @param folder - Optional R2 key prefix (e.g. 'avatars', 'schedules').
 * @returns      The public URL of the uploaded file.
 */
export async function uploadToCloudinary(file: File, folder?: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    if (folder) formData.append('folder', folder)

    const res = await fetch('/api/upload/file', {
        method: 'POST',
        body: formData,
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const message = (err as { error?: string }).error || 'Failed to upload file'
        throw new Error(`فشل رفع الملف: ${message}`)
    }

    const { publicUrl } = await res.json() as { publicUrl: string }
    return publicUrl
}

// ─── Alias for callers that import the old name ───────────────
export const uploadFile = uploadToCloudinary
