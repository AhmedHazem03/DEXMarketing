'use client'

import { useState, useCallback, useRef, type DragEvent } from 'react'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2, Image as ImageIcon, Video as VideoIcon } from 'lucide-react'
import { uploadToCloudinary } from '@/lib/cloudinary'

// ─── Types ───────────────────────────────────────────────────

interface MediaUploadProps {
    value?: string
    onChange: (url: string) => void
    folder?: string
    accept?: 'image' | 'video' | 'both'
    maxSizeMB?: number
    className?: string
    placeholder?: string
}

// ─── Component ───────────────────────────────────────────────

export function MediaUpload({
    value,
    onChange,
    folder = 'dex-erp/cms',
    accept = 'both',
    maxSizeMB = 10,
    className,
    placeholder,
}: MediaUploadProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const inputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const acceptStr = accept === 'image'
        ? 'image/*'
        : accept === 'video'
            ? 'video/*'
            : 'image/*,video/*'

    const isVideo = value?.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) ||
        value?.includes('/video/')

    const handleUpload = useCallback(async (file: File) => {
        setError(null)

        // Validate size
        if (file.size > maxSizeMB * 1024 * 1024) {
            setError(isAr ? `الحد الأقصى ${maxSizeMB} MB` : `Max size ${maxSizeMB} MB`)
            return
        }

        // Validate type
        if (accept === 'image' && !file.type.startsWith('image/')) {
            setError(isAr ? 'يرجى اختيار صورة فقط' : 'Images only')
            return
        }
        if (accept === 'video' && !file.type.startsWith('video/')) {
            setError(isAr ? 'يرجى اختيار فيديو فقط' : 'Videos only')
            return
        }

        setIsUploading(true)

        try {
            const url = await uploadToCloudinary(file, folder)
            onChange(url)
        } catch {
            setError(isAr ? 'فشل الرفع، حاول مرة أخرى' : 'Upload failed, try again')
        } finally {
            setIsUploading(false)
        }
    }, [accept, folder, isAr, maxSizeMB, onChange])

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleUpload(file)
        // Reset input so same file can be selected again
        if (inputRef.current) inputRef.current.value = ''
    }, [handleUpload])

    const handleRemove = useCallback(() => {
        onChange('')
        setError(null)
    }, [onChange])

    const handleDragOver = useCallback((e: DragEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: DragEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: DragEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file) handleUpload(file)
    }, [handleUpload])

    return (
        <div className={cn('space-y-2', className)}>
            <input
                ref={inputRef}
                type="file"
                accept={acceptStr}
                onChange={handleFileChange}
                className="hidden"
                aria-label={isAr ? 'اختر ملفاً للرفع' : 'Choose file to upload'}
            />

            {value ? (
                // ── Preview ──
                <div className="relative group rounded-lg overflow-hidden border bg-muted/30">
                    {isVideo ? (
                        <video
                            src={value}
                            className="w-full h-40 object-cover"
                            muted
                            playsInline
                        />
                    ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={value}
                            alt="Preview"
                            className="w-full h-40 object-cover"
                        />
                    )}

                    {/* Overlay actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => inputRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4 me-1" />
                            )}
                            {isAr ? 'تغيير' : 'Change'}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleRemove}
                        >
                            <X className="h-4 w-4 me-1" />
                            {isAr ? 'حذف' : 'Remove'}
                        </Button>
                    </div>
                </div>
            ) : (
                // ── Upload Area ──
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    disabled={isUploading}
                    className={cn(
                        'w-full h-32 rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary',
                        isUploading && 'opacity-60 cursor-wait',
                        isDragging && 'border-primary bg-primary/5 text-primary'
                    )}
                >
                    {isUploading ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                    ) : accept === 'video' ? (
                        <VideoIcon className="h-8 w-8" />
                    ) : accept === 'image' ? (
                        <ImageIcon className="h-8 w-8" />
                    ) : (
                        <Upload className="h-8 w-8" />
                    )}
                    <span className="text-xs">
                        {placeholder || (isAr ? 'اضغط لرفع ملف' : 'Click to upload')}
                    </span>
                </button>
            )}

            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}
        </div>
    )
}
