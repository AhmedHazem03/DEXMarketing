import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@/lib/supabase/server'

// ─── R2 client (S3-compatible) ────────────────────────────────
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
})

// ─── Allowed types / sizes ────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/octet-stream', // .psd / .ai / generic binaries
])

const MAX_IMAGE_SIZE = 10 * 1024 * 1024    // 10 MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024   // 200 MB
const MAX_DOC_SIZE   = 50  * 1024 * 1024   // 50  MB

function getSizeLimit(mimeType: string): number {
    if (mimeType.startsWith('video/')) return MAX_VIDEO_SIZE
    if (mimeType.startsWith('image/')) return MAX_IMAGE_SIZE
    return MAX_DOC_SIZE
}

// ─── Route handler ────────────────────────────────────────────
export async function POST(req: NextRequest) {
    // 1. Authenticate — only logged-in users may upload
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse & validate body
    let body: { fileName: string; fileType: string; fileSize: number; folder?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { fileName, fileType, fileSize, folder } = body

    if (!fileName || !fileType || typeof fileSize !== 'number') {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.has(fileType)) {
        return NextResponse.json({ error: `File type "${fileType}" is not allowed` }, { status: 400 })
    }

    const sizeLimit = getSizeLimit(fileType)
    if (fileSize > sizeLimit) {
        return NextResponse.json(
            { error: `File too large. Max ${sizeLimit / (1024 * 1024)} MB` },
            { status: 400 }
        )
    }

    // 3. Sanitize folder to prevent path traversal
    const safeFolder = folder
        ? folder.replace(/[^a-zA-Z0-9\-_/]/g, '').replace(/\.{2,}/g, '').replace(/^\/+|\/+$/g, '')
        : null

    // 4. Build a unique object key
    const ext = fileName.split('.').pop()?.replace(/[^a-z0-9]/gi, '') ?? 'bin'
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const key = safeFolder ? `${safeFolder}/${uniqueName}` : uniqueName

    // 5. Generate presigned PUT URL (5-minute expiry)
    const command = new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Key: key,
        ContentType: fileType,
        ContentLength: fileSize,
    })

    const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 300 })
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`

    return NextResponse.json({ presignedUrl, publicUrl })
}
