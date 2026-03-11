// ============================================
// Cloudflare R2 Upload — Single Source of Truth
// ============================================
// Uses a server-side API route (/api/upload/presign) to generate a
// presigned PUT URL, then uploads the file directly from the browser
// to R2.  The server validates auth + file type/size before signing.

export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''

/**
 * Upload a file to Cloudflare R2.
 * @param file   - The File object to upload.
 * @param folder - Optional R2 key prefix (e.g. 'avatars', 'schedules').
 * @returns      The public URL of the uploaded file.
 */
export async function uploadToCloudinary(file: File, folder?: string): Promise<string> {
    // 1. Request a presigned PUT URL from our API route
    const res = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            folder,
        }),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const message = (err as { error?: string }).error || 'Failed to get upload URL'
        throw new Error(`فشل رفع الملف: ${message}`)
    }

    const { presignedUrl, publicUrl } = await res.json() as {
        presignedUrl: string
        publicUrl: string
    }

    // 2. PUT the file directly to R2
    const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
    })

    if (!uploadRes.ok) {
        throw new Error('فشل رفع الملف إلى R2')
    }

    return publicUrl
}

// ─── Alias for callers that import the old name ───────────────
export const uploadFile = uploadToCloudinary
