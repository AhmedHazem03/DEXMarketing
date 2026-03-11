'use client'

import { useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { Plus, X, Loader2, ImageIcon, Film, Clapperboard } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { toast } from 'sonner'

const MAX_IMAGE_SIZE_MB = 10
const MAX_VIDEO_SIZE_MB = 200
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024

interface MediaUploaderProps {
    value: string[]
    onChange: (value: string[]) => void
    maxFiles?: number
    folder?: string
    className?: string
    label?: string
    labelAr?: string
    accept?: string
}

function isVideoUrl(url: string): boolean {
    return (
        url.includes('/video/upload/') ||
        /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url)
    )
}

function getFileTypeLabel(file: File, isAr: boolean): string {
    if (file.type.startsWith('video/')) {
        return isAr ? 'فيديو' : 'Video'
    }
    return isAr ? 'صورة' : 'Image'
}

function validateFileSize(file: File, isAr: boolean): string | null {
    const isVideo = file.type.startsWith('video/')
    const maxBytes = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES
    const maxMB = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB
    const typeLabel = isVideo ? (isAr ? 'الفيديو' : 'Video') : (isAr ? 'الصورة' : 'Image')

    if (file.size > maxBytes) {
        return isAr
            ? `${file.name}: حجم ${typeLabel} يتجاوز ${maxMB} ميجا`
            : `${file.name}: ${typeLabel} exceeds ${maxMB}MB limit`
    }
    return null
}

export function MediaUploader({
    value,
    onChange,
    maxFiles = 20,
    folder = 'schedules',
    className,
    label,
    labelAr,
    accept = 'image/*,video/*',
}: MediaUploaderProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<string>('')

    const removeFile = (index: number) => {
        onChange(value.filter((_, i) => i !== index))
    }

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        const remaining = maxFiles - value.length
        if (remaining <= 0) {
            toast.error(isAr ? `الحد الأقصى ${maxFiles} ملفات` : `Maximum ${maxFiles} files allowed`)
            return
        }

        const toUpload = files.slice(0, remaining)

        // Validate file sizes before uploading
        const sizeErrors: string[] = []
        const validFiles: File[] = []
        for (const file of toUpload) {
            const error = validateFileSize(file, isAr)
            if (error) {
                sizeErrors.push(error)
            } else {
                validFiles.push(file)
            }
        }

        if (sizeErrors.length > 0) {
            toast.error(sizeErrors.join('\n'))
        }

        if (validFiles.length === 0) {
            e.target.value = ''
            return
        }

        setUploading(true)

        const uploaded: string[] = []
        const failed: string[] = []

        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i]
            const typeLabel = getFileTypeLabel(file, isAr)
            setUploadProgress(
                isAr
                    ? `جاري رفع ${typeLabel} ${i + 1} من ${validFiles.length}...`
                    : `Uploading ${typeLabel} ${i + 1} of ${validFiles.length}...`
            )
            try {
                const url = await uploadToCloudinary(file, folder)
                uploaded.push(url)
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err)
                failed.push(`${file.name}: ${msg}`)
                console.error('Upload error:', msg)
            }
        }

        setUploading(false)
        setUploadProgress('')

        if (uploaded.length > 0) {
            onChange([...value, ...uploaded])
            toast.success(
                isAr
                    ? `تم رفع ${uploaded.length} ملف بنجاح`
                    : `${uploaded.length} file(s) uploaded successfully`
            )
        }

        if (failed.length > 0) {
            toast.error(
                isAr
                    ? `فشل رفع ${failed.length} ملف`
                    : `Failed to upload ${failed.length} file(s)`
            )
        }

        // Reset input
        e.target.value = ''
    }, [value, maxFiles, onChange, isAr, folder])

    const displayLabel = isAr ? (labelAr || 'الوسائط') : (label || 'Media')

    return (
        <div className={cn('space-y-2', className)}>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Film className="size-3.5" />
                {displayLabel}
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {value.length}/{maxFiles}
                </span>
            </Label>

            {/* Upload hint */}
            <p className="text-[11px] text-muted-foreground">
                {isAr
                    ? `يمكنك رفع صور، فيديوهات، وريلز (حتى ${MAX_VIDEO_SIZE_MB} ميجا للفيديو، ${MAX_IMAGE_SIZE_MB} ميجا للصور)`
                    : `Upload images, videos & reels (up to ${MAX_VIDEO_SIZE_MB}MB for video, ${MAX_IMAGE_SIZE_MB}MB for images)`}
            </p>

            {/* Upload progress */}
            {uploading && uploadProgress && (
                <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 px-3 py-2 rounded-xl border border-primary/20">
                    <Loader2 className="size-3.5 animate-spin shrink-0" />
                    <span>{uploadProgress}</span>
                </div>
            )}

            {/* Grid preview */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {value.map((url, i) => {
                    const isVideo = isVideoUrl(url)
                    return (
                        <div key={url} className="relative group rounded-xl overflow-hidden border border-border bg-muted/20">
                            {isVideo ? (
                                <>
                                    <video
                                        src={url}
                                        className="w-full aspect-video object-cover"
                                        muted
                                        preload="metadata"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors pointer-events-none">
                                        <div className="bg-white/90 rounded-full p-1.5 shadow">
                                            <Clapperboard className="size-4 text-gray-800" />
                                        </div>
                                    </div>
                                    {/* Type badge */}
                                    <div className="absolute bottom-1 start-1">
                                        <span className="text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded-full font-medium">
                                            {isAr ? 'فيديو' : 'Video'}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <img
                                    src={url}
                                    alt={`media-${i + 1}`}
                                    className="w-full aspect-square object-cover"
                                />
                            )}
                            <button
                                type="button"
                                onClick={() => removeFile(i)}
                                aria-label={isAr ? 'حذف الملف' : 'Remove file'}
                                className="absolute top-1 end-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                            >
                                <X className="size-3 text-white" />
                            </button>
                        </div>
                    )
                })}

                {value.length < maxFiles && (
                    <label className={cn(
                        'border-2 border-dashed rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer transition-colors',
                        uploading
                            ? 'border-primary/50 bg-primary/5 pointer-events-none'
                            : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
                    )}>
                        <input
                            type="file"
                            accept={accept}
                            multiple
                            hidden
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        {uploading ? (
                            <Loader2 className="size-5 text-primary animate-spin" />
                        ) : (
                            <>
                                <Plus className="size-5 text-muted-foreground" />
                                <ImageIcon className="size-3 text-muted-foreground mt-0.5 opacity-60" />
                                <span className="text-[9px] text-muted-foreground mt-1 text-center leading-tight px-1">
                                    {isAr ? 'صور\nفيديو' : 'Photo\nVideo'}
                                </span>
                            </>
                        )}
                    </label>
                )}
            </div>
        </div>
    )
}
