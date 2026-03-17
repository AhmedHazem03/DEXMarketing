import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@/lib/supabase/server'

// ─── R2 client (S3-compatible) ────────────────────────────────
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
    // Disable automatic checksums so the SDK doesn't add CRC32 headers
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
})

// ─── Allowed types / sizes ────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/octet-stream',
])

const MAX_IMAGE_SIZE = 10 * 1024 * 1024    // 10 MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024   // 200 MB
const MAX_DOC_SIZE   = 50  * 1024 * 1024   // 50  MB

function getSizeLimit(mimeType: string): number {
    if (mimeType.startsWith('video/')) return MAX_VIDEO_SIZE
    if (mimeType.startsWith('image/')) return MAX_IMAGE_SIZE
    return MAX_DOC_SIZE
}

export async function POST(req: NextRequest) {
    // 1. Authenticate — only logged-in users may upload
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse multipart form data
    let formData: FormData
    try {
        formData = await req.formData()
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    const folder = formData.get('folder') as string | null

    if (!file || typeof file.name !== 'string') {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 3. Validate file type
    const fileType = file.type || 'application/octet-stream'
    if (!ALLOWED_MIME_TYPES.has(fileType)) {
        return NextResponse.json({ error: `File type "${fileType}" is not allowed` }, { status: 400 })
    }

    // 4. Validate file size
    const sizeLimit = getSizeLimit(fileType)
    if (file.size > sizeLimit) {
        return NextResponse.json(
            { error: `File too large. Max ${sizeLimit / (1024 * 1024)} MB` },
            { status: 400 }
        )
    }

    // 5. Sanitize folder to prevent path traversal
    const safeFolder = folder
        ? folder.replace(/[^a-zA-Z0-9\-_/]/g, '').replace(/\.{2,}/g, '').replace(/^\/+|\/+$/g, '')
        : null

    // 6. Build a unique object key
    const ext = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') ?? 'bin'
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const key = safeFolder ? `${safeFolder}/${uniqueName}` : uniqueName

    // 7. Upload directly to R2 (server-side — no CORS issues)
    const buffer = Buffer.from(await file.arrayBuffer())

    await r2.send(new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: fileType,
        ContentLength: buffer.byteLength,
    }))

    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
    return NextResponse.json({ publicUrl })
}
