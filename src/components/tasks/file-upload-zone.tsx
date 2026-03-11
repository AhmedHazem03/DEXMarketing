'use client'

import { useState, useCallback, useRef } from 'react'
import { useLocale } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Upload, X,
    Loader2, CheckCircle, AlertCircle, Cloud
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAddAttachment } from '@/hooks/use-tasks'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { getFileIcon, formatFileSize } from '@/lib/file-utils'

// ============================================
// Types
// ============================================

interface UploadedFile {
    id: string
    file: File
    progress: number
    status: 'pending' | 'uploading' | 'success' | 'error'
    url?: string
    error?: string
}

interface FileUploadZoneProps {
    taskId?: string
    userId: string
    folder?: string
    onUploadComplete?: (attachment: { file_url: string; file_name: string; file_type: string; file_size: number }) => void
    maxFileSize?: number // MB
    acceptedTypes?: string[]
    multiple?: boolean
    className?: string
}

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
    return Math.random().toString(36).substring(2, 9)
}

// ============================================
// File Item Component
// ============================================

interface FileItemProps {
    file: UploadedFile
    onRemove: () => void
}

function FileItem({ file, onRemove }: FileItemProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const FileIcon = getFileIcon(file.file.type)

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className={cn(
                'flex items-center gap-3 p-3 rounded-lg border bg-card/50',
                file.status === 'error' && 'border-red-500/50 bg-red-500/5',
                file.status === 'success' && 'border-green-500/50 bg-green-500/5'
            )}
        >
            {/* Icon */}
            <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                file.status === 'error' ? 'bg-red-500/10' :
                    file.status === 'success' ? 'bg-green-500/10' :
                        'bg-primary/10'
            )}>
                <FileIcon className={cn(
                    'h-5 w-5',
                    file.status === 'error' ? 'text-red-500' :
                        file.status === 'success' ? 'text-green-500' :
                            'text-primary'
                )} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file.name}</p>
                <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file.size)}
                </p>

                {/* Progress bar for uploading */}
                {file.status === 'uploading' && (
                    <Progress value={file.progress} className="h-1 mt-2" />
                )}

                {/* Error message */}
                {file.status === 'error' && file.error && (
                    <p className="text-xs text-red-500 mt-1">{file.error}</p>
                )}
            </div>

            {/* Status / Remove */}
            <div className="flex-shrink-0">
                {file.status === 'uploading' && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
                {file.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {file.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                {(file.status === 'pending' || file.status === 'error') && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onRemove}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </motion.div>
    )
}

// ============================================
// Main Component
// ============================================

export function FileUploadZone({
    taskId,
    userId,
    folder,
    onUploadComplete,
    maxFileSize = 10, // 10 MB default
    acceptedTypes = ['image/*', 'video/*', 'application/pdf', '.doc', '.docx', '.psd', '.ai', '.zip'],
    multiple = true,
    className,
}: FileUploadZoneProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'

    const [files, setFiles] = useState<UploadedFile[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const addAttachment = useAddAttachment()

    // Validate file
    const validateFile = (file: File): string | null => {
        const maxBytes = maxFileSize * 1024 * 1024
        if (file.size > maxBytes) {
            return isAr
                ? `الحجم الأقصى ${maxFileSize} MB`
                : `Max file size is ${maxFileSize} MB`
        }
        return null
    }

    // Upload single file to R2
    const uploadFile = async (uploadFile: UploadedFile): Promise<void> => {
        const targetFolder = folder || (taskId ? `dex-erp/tasks/${taskId}` : 'dex-erp/client-requests')

        try {
            // Update status to uploading
            setFiles(prev => prev.map(f =>
                f.id === uploadFile.id ? { ...f, status: 'uploading' as const } : f
            ))

            const fileUrl = await uploadToCloudinary(uploadFile.file, targetFolder)

            // Only save to database if taskId is provided
            if (taskId) {
                await addAttachment.mutateAsync({
                    task_id: taskId,
                    file_url: fileUrl,
                    file_name: uploadFile.file.name,
                    file_type: uploadFile.file.type,
                    file_size: uploadFile.file.size,
                    uploaded_by: userId,
                    is_final: false,
                })
            }

            // Update status to success
            setFiles(prev => prev.map(f =>
                f.id === uploadFile.id
                    ? { ...f, status: 'success' as const, url: fileUrl, progress: 100 }
                    : f
            ))

            onUploadComplete?.({
                file_url: fileUrl,
                file_name: uploadFile.file.name,
                file_type: uploadFile.file.type,
                file_size: uploadFile.file.size,
            })

            // Remove from list after delay
            setTimeout(() => {
                setFiles(prev => prev.filter(f => f.id !== uploadFile.id))
            }, 2000)

        } catch (error) {
            console.error('Upload error:', error)
            setFiles(prev => prev.map(f =>
                f.id === uploadFile.id
                    ? {
                        ...f,
                        status: 'error' as const,
                        error: isAr ? 'فشل الرفع' : 'Upload failed'
                    }
                    : f
            ))
        }
    }

    // Handle file selection
    const handleFiles = useCallback((fileList: FileList | null) => {
        if (!fileList) return

        const newFiles: UploadedFile[] = []

        Array.from(fileList).forEach(file => {
            const error = validateFile(file)
            const pendingFile: UploadedFile = {
                id: generateId(),
                file,
                progress: 0,
                status: error ? 'error' : 'pending',
                error: error ?? undefined,
            }
            newFiles.push(pendingFile)
        })

        setFiles(prev => [...prev, ...newFiles])

        // Start uploading valid files
        newFiles
            .filter(f => f.status === 'pending')
            .forEach(f => uploadFile(f))
    }, [taskId, userId])

    // Drag handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
        handleFiles(e.dataTransfer.files)
    }

    // Remove file from list
    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id))
    }

    return (
        <div className={cn('space-y-4', className)}>
            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                    'relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer',
                    'flex flex-col items-center justify-center text-center',
                    'hover:border-primary/50 hover:bg-primary/5',
                    isDragOver
                        ? 'border-primary bg-primary/10 scale-[1.02]'
                        : 'border-border bg-muted/30'
                )}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={acceptedTypes.join(',')}
                    multiple={multiple}
                    onChange={(e) => handleFiles(e.target.files)}
                    className="hidden"
                    aria-label={isAr ? 'اختر ملفات للرفع' : 'Choose files to upload'}
                />

                <motion.div
                    animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
                    className="mb-4"
                >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Cloud className="h-8 w-8 text-primary" />
                    </div>
                </motion.div>

                <h4 className="font-semibold mb-1">
                    {isDragOver
                        ? (isAr ? 'أفلت الملفات هنا' : 'Drop files here')
                        : (isAr ? 'اسحب وأفلت الملفات' : 'Drag & drop files')
                    }
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                    {isAr
                        ? `أو انقر للاختيار • الحد الأقصى ${maxFileSize} MB`
                        : `or click to browse • Max ${maxFileSize} MB`
                    }
                </p>

                <Button variant="outline" size="sm" className="pointer-events-none">
                    <Upload className="h-4 w-4 me-2" />
                    {isAr ? 'اختر ملفات' : 'Select Files'}
                </Button>
            </div>

            {/* Files List */}
            <AnimatePresence mode="popLayout">
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                    >
                        {files.map(file => (
                            <FileItem
                                key={file.id}
                                file={file}
                                onRemove={() => removeFile(file.id)}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default FileUploadZone
