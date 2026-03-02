'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { format, formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
    Calendar, Clock, User, MessageSquare, Paperclip, Send,
    Trash2, Download, ExternalLink, MoreHorizontal, Loader2,
    Check, X, Edit2,
    AlertTriangle, Star, CheckCircle, RotateCcw, Forward
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { getFileIcon, formatFileSize } from '@/lib/file-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
    useTaskDetails,
    useAddComment,
    useDeleteComment,
    useDeleteTask,
    useDeleteAttachment,
    useMarkAttachmentFinal,
    useUpdateTask,
    useReturnTask,
} from '@/hooks/use-tasks'
import { useTasksRealtime } from '@/hooks/use-realtime'
import { FileUploadZone } from './file-upload-zone'
import { ReturnTaskDialog } from './return-task-dialog'
import { ForwardToDesignerDialog } from './forward-to-designer-dialog'
import { getPriorityConfig, getColumnConfig } from '@/types/task'
import type { TaskWithRelations, CommentWithUser } from '@/types/task'
import type { Attachment } from '@/types/database'

// ============================================
// Props
// ============================================

interface TaskDetailsProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    taskId: string | null
    currentUserId: string
    onEdit?: (task: TaskWithRelations) => void
    canSubmit?: boolean
    canReturn?: boolean
    canForward?: boolean
}

// ============================================
// Comment Item Component
// ============================================

interface CommentItemProps {
    comment: CommentWithUser
    currentUserId: string
    onDelete: () => void
    isDeleting: boolean
}

function CommentItem({ comment, currentUserId, onDelete, isDeleting }: CommentItemProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const isOwner = comment.user_id === currentUserId

    return (
        <div className="group flex gap-3 py-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={comment.user?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {(comment.user?.name ?? 'U').charAt(0)}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                        {comment.user?.name ?? (isAr ? 'مستخدم' : 'User')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                            locale: isAr ? ar : enUS,
                        })}
                    </span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                    {comment.content}
                </p>
            </div>

            {isOwner && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={onDelete}
                    disabled={isDeleting}
                >
                    {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <Trash2 className="h-3 w-3 text-destructive" />
                    )}
                </Button>
            )}
        </div>
    )
}

// ============================================
// Attachment Item Component
// ============================================

interface AttachmentItemProps {
    attachment: Attachment
    currentUserId: string
    onDelete: () => void
    onToggleFinal: () => void
    isDeleting: boolean
}

function AttachmentItem({
    attachment,
    currentUserId,
    onDelete,
    onToggleFinal,
    isDeleting
}: AttachmentItemProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const isOwner = attachment.uploaded_by === currentUserId
    const FileIcon = getFileIcon(attachment.file_type)

    return (
        <div className={cn(
            'group flex items-center gap-3 p-3 rounded-lg border bg-card/50 transition-colors',
            attachment.is_final && 'border-green-500/50 bg-green-500/5'
        )}>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileIcon className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                        {attachment.file_name}
                    </span>
                    {attachment.is_final && (
                        <Badge variant="secondary" className="text-green-600 bg-green-500/10">
                            <Star className="h-3 w-3 me-1" />
                            {isAr ? 'نهائي' : 'Final'}
                        </Badge>
                    )}
                </div>
                <span className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                </span>
            </div>

            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                >
                    <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <a href={attachment.file_url} download>
                                <Download className="h-4 w-4 me-2" />
                                {isAr ? 'تحميل' : 'Download'}
                            </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onToggleFinal}>
                            <Star className="h-4 w-4 me-2" />
                            {attachment.is_final
                                ? (isAr ? 'إلغاء كـ نهائي' : 'Unmark as Final')
                                : (isAr ? 'تحديد كـ نهائي' : 'Mark as Final')
                            }
                        </DropdownMenuItem>
                        {isOwner && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={onDelete}
                                    className="text-destructive"
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="h-4 w-4 me-2" />
                                    {isAr ? 'حذف' : 'Delete'}
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}

// ============================================
// Main Task Details Component
// ============================================

export function TaskDetails({
    open,
    onOpenChange,
    taskId,
    currentUserId,
    onEdit,
    canSubmit = false,
    canReturn = false,
    canForward = false,
}: TaskDetailsProps) {
    const locale = useLocale()
    const isAr = locale === 'ar'

    const [newComment, setNewComment] = useState('')
    const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
    const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null)
    const [returnDialogOpen, setReturnDialogOpen] = useState(false)
    const [forwardDialogOpen, setForwardDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Ref for auto-scroll to latest comment
    const commentsEndRef = useRef<HTMLDivElement>(null)

    // Real-time subscription for live task/comments/attachments updates
    useTasksRealtime()

    // Hooks
    const { data: task, isLoading } = useTaskDetails(taskId ?? '')
    const addComment = useAddComment()
    const deleteComment = useDeleteComment()
    const deleteTask = useDeleteTask()
    const deleteAttachment = useDeleteAttachment()
    const markFinal = useMarkAttachmentFinal()
    const updateTask = useUpdateTask()
    const returnTask = useReturnTask()

    // Auto-scroll to bottom when comments change
    useEffect(() => {
        if (task?.comments && commentsEndRef.current) {
            commentsEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [task?.comments?.length])

    if (!taskId) return null

    // Configs
    const priorityConfig = task ? getPriorityConfig(task.priority) : null
    const statusConfig = task ? getColumnConfig(task.status) : null

    // Handlers
    const handleAddComment = async () => {
        if (!newComment.trim() || !task) return
        try {
            await addComment.mutateAsync({
                task_id: task.id,
                user_id: currentUserId,
                content: newComment.trim(),
            })
            setNewComment('')
        } catch (e: any) {
            console.error('Failed to add comment:', e.message || e)
        }
    }

    const handleDeleteComment = async (commentId: string) => {
        if (!task) return
        setDeletingCommentId(commentId)
        try {
            await deleteComment.mutateAsync({ commentId, taskId: task.id })
        } finally {
            setDeletingCommentId(null)
        }
    }

    const handleDeleteAttachment = async (attachmentId: string) => {
        if (!task) return
        setDeletingAttachmentId(attachmentId)
        try {
            await deleteAttachment.mutateAsync({ attachmentId, taskId: task.id })
        } finally {
            setDeletingAttachmentId(null)
        }
    }

    const handleToggleFinal = async (attachment: Attachment) => {
        if (!task) return
        await markFinal.mutateAsync({
            attachmentId: attachment.id,
            taskId: task.id,
            isFinal: !attachment.is_final,
        })
    }

    const handleDeleteTask = async () => {
        if (!task) return
        await deleteTask.mutateAsync(task.id)
        onOpenChange(false)
    }

    const handleSubmitTask = async () => {
        if (!task) return
        setIsSubmitting(true)
        try {
            await updateTask.mutateAsync({
                id: task.id,
                status: 'review',
            })
            toast.success(isAr ? 'تم تسليم المهمة بنجاح' : 'Task submitted successfully')
        } catch (error) {
            toast.error(isAr ? 'حدث خطأ أثناء تسليم المهمة' : 'Failed to submit task')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleApproveTask = async () => {
        if (!task) return
        try {
            await updateTask.mutateAsync({
                id: task.id,
                status: 'approved',
            })
            toast.success(isAr ? 'تم قبول المهمة بنجاح' : 'Task approved successfully')
        } catch (error) {
            toast.error(isAr ? 'حدث خطأ أثناء قبول المهمة' : 'Failed to approve task')
        }
    }

    // Deadline status
    const deadline = task?.deadline ? new Date(task.deadline) : null
    const isOverdue = deadline && deadline < new Date() && task?.status !== 'approved'

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side={isAr ? 'left' : 'right'}
                className="w-full sm:max-w-xl p-0 flex flex-col overflow-hidden h-full"
            >
                {/* Accessibility: Always render a hidden title if visible title is missing */}
                <SheetTitle className="sr-only">
                    {task?.title ?? (isAr ? 'تفاصيل المهمة' : 'Task Details')}
                </SheetTitle>
                <SheetDescription className="sr-only">
                    {isAr ? 'عرض تفاصيل المهمة وإدارتها' : 'View and manage task details'}
                </SheetDescription>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : task ? (
                    <>
                        {/* Header */}
                        <SheetHeader className="p-6 pb-0">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge
                                            className={cn(
                                                statusConfig?.bgColor,
                                                statusConfig?.color
                                            )}
                                        >
                                            {isAr ? statusConfig?.titleAr : statusConfig?.title}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                priorityConfig?.color,
                                                priorityConfig?.bgColor
                                            )}
                                        >
                                            {isAr ? priorityConfig?.labelAr : priorityConfig?.label}
                                        </Badge>
                                    </div>
                                    <SheetTitle className="text-xl leading-tight">
                                        {task.title}
                                    </SheetTitle>
                                </div>

                                <div className="flex items-center gap-1">
                                    {onEdit && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onEdit?.(task)}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {onEdit && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>
                                                    {isAr ? 'حذف المهمة؟' : 'Delete Task?'}
                                                </AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    {isAr
                                                        ? 'سيتم حذف المهمة وجميع التعليقات والمرفقات بشكل نهائي.'
                                                        : 'This will permanently delete the task and all its comments and attachments.'
                                                    }
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>
                                                    {isAr ? 'إلغاء' : 'Cancel'}
                                                </AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleDeleteTask}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    {isAr ? 'حذف' : 'Delete'}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    )}
                                </div>
                            </div>
                        </SheetHeader>

                        {/* Meta Info */}
                        <div className="px-6 py-4 space-y-3">
                            {/* Assignee */}
                            <div className="flex items-center gap-3 text-sm">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                    {isAr ? 'معين إلى:' : 'Assigned to:'}
                                </span>
                                {task.assigned_user ? (
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={task.assigned_user.avatar_url ?? undefined} />
                                            <AvatarFallback className="text-xs">
                                                {(task.assigned_user.name ?? 'U').charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{task.assigned_user.name}</span>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground italic">
                                        {isAr ? 'غير معين' : 'Unassigned'}
                                    </span>
                                )}
                            </div>

                            {/* Client */}
                            {task.client && (
                                <div className="flex items-center gap-3 text-sm">
                                    <User className="h-4 w-4 text-indigo-500" />
                                    <span className="text-muted-foreground">
                                        {isAr ? 'العميل:' : 'Client:'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-medium text-indigo-500">
                                            {task.client.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium">{task.client.name}</span>
                                    </div>
                                </div>
                            )}

                            {/* Client Feedback */}
                            {task.status === 'revision' && task.client_feedback && (
                                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                        <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                                            {isAr ? 'ملاحظات العميل:' : 'Client Feedback:'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {task.client_feedback}
                                    </p>
                                </div>
                            )}

                            {/* Deadline */}
                            {deadline && (
                                <div className={cn(
                                    'flex items-center gap-3 text-sm',
                                    isOverdue && 'text-red-500'
                                )}>
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-muted-foreground">
                                        {isAr ? 'الموعد النهائي:' : 'Deadline:'}
                                    </span>
                                    <span className={cn('font-medium', isOverdue && 'text-red-500')}>
                                        {format(deadline, 'PPP', { locale: isAr ? ar : enUS })}
                                        {isOverdue && (
                                            <span className="ms-2 text-xs">
                                                <AlertTriangle className="h-3 w-3 inline me-1" />
                                                {isAr ? 'متأخر!' : 'Overdue!'}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}

                            {/* Created */}
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{isAr ? 'أنشئ:' : 'Created:'}</span>
                                <span>
                                    {formatDistanceToNow(new Date(task.created_at), {
                                        addSuffix: true,
                                        locale: isAr ? ar : enUS,
                                    })}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {(canSubmit || canReturn || (canForward && task.status === 'approved')) && (
                            <div className="px-6 pb-4">
                                <div className="flex items-center gap-2">
                                    {canSubmit && ['in_progress', 'revision'].includes(task.status) && (
                                        <Button
                                            onClick={handleSubmitTask}
                                            disabled={isSubmitting}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                                    {isAr ? 'جاري التسليم...' : 'Submitting...'}
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="h-4 w-4 me-2" />
                                                    {isAr ? 'تسليم للمراجعة' : 'Submit for Review'}
                                                </>
                                            )}
                                        </Button>
                                    )}
                                    {canForward && task.status === 'approved' && (
                                        <Button
                                            onClick={() => setForwardDialogOpen(true)}
                                            variant="outline"
                                            className="flex-1 border-primary text-primary hover:bg-primary/5"
                                        >
                                            <Forward className="h-4 w-4 me-2" />
                                            {isAr ? 'تحويل للمصمم' : 'Forward to Designer'}
                                        </Button>
                                    )}
                                    {canReturn && task.status === 'review' && (
                                        <>
                                            <Button
                                                onClick={handleApproveTask}
                                                disabled={updateTask.isPending}
                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                            >
                                                {updateTask.isPending ? (
                                                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle className="h-4 w-4 me-2" />
                                                        {isAr ? 'قبول' : 'Approve'}
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={() => setReturnDialogOpen(true)}
                                                disabled={updateTask.isPending}
                                                variant="outline"
                                                className="flex-1 border-orange-600 text-orange-600 hover:bg-orange-50"
                                            >
                                                <RotateCcw className="h-4 w-4 me-2" />
                                                {isAr ? 'إرجاع للتعديل' : 'Return for Revision'}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* Tabs: Description, Comments, Attachments */}
                        <Tabs defaultValue="description" className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <TabsList className="mx-6 mt-4 justify-start w-auto">
                                <TabsTrigger value="description">
                                    {isAr ? 'الوصف' : 'Description'}
                                </TabsTrigger>
                                <TabsTrigger value="comments" className="gap-1">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    {isAr ? 'التعليقات' : 'Comments'}
                                    {(task.comments?.length ?? 0) > 0 && (
                                        <Badge variant="secondary" className="h-5 px-1.5">
                                            {task.comments?.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="attachments" className="gap-1">
                                    <Paperclip className="h-3.5 w-3.5" />
                                    {isAr ? 'المرفقات' : 'Files'}
                                    {(task.attachments?.length ?? 0) > 0 && (
                                        <Badge variant="secondary" className="h-5 px-1.5">
                                            {task.attachments?.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            </TabsList>

                            {/* Description Tab */}
                            <TabsContent value="description" className="flex-1 px-6 py-4 overflow-y-auto">
                                {task.description ? (
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                        {task.description}
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                        {isAr ? 'لا يوجد وصف' : 'No description provided'}
                                    </p>
                                )}

                                {/* Client Feedback */}
                                {task.client_feedback && (
                                    <div className="mt-6 p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                                        <h4 className="font-semibold text-sm text-orange-600 mb-2">
                                            {isAr ? 'ملاحظات العميل' : 'Client Feedback'}
                                        </h4>
                                        <p className="text-sm whitespace-pre-wrap">
                                            {task.client_feedback}
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Comments Tab */}
                            <TabsContent value="comments" className="flex-1 flex flex-col min-h-0 overflow-hidden px-6 pb-4">
                                <ScrollArea className="flex-1 -mx-6 px-6 min-h-0">
                                    <div className="divide-y">
                                        {task.comments?.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-8">
                                                {isAr ? 'لا توجد تعليقات' : 'No comments yet'}
                                            </p>
                                        ) : (
                                            task.comments?.map((comment) => (
                                                <CommentItem
                                                    key={comment.id}
                                                    comment={comment}
                                                    currentUserId={currentUserId}
                                                    onDelete={() => handleDeleteComment(comment.id)}
                                                    isDeleting={deletingCommentId === comment.id}
                                                />
                                            ))
                                        )}
                                        {/* Auto-scroll anchor */}
                                        <div ref={commentsEndRef} />
                                    </div>
                                </ScrollArea>

                                {/* Add Comment */}
                                <div className="flex gap-2 pt-4 mt-auto border-t">
                                    <Input
                                        placeholder={isAr ? 'أضف تعليق...' : 'Add a comment...'}
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault()
                                                handleAddComment()
                                            }
                                        }}
                                    />
                                    <Button
                                        size="icon"
                                        onClick={handleAddComment}
                                        disabled={!newComment.trim() || addComment.isPending}
                                    >
                                        {addComment.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </TabsContent>

                            {/* Attachments Tab */}
                            <TabsContent value="attachments" className="flex-1 px-6 pb-4 overflow-y-auto min-h-0">
                                <div className="space-y-2">
                                    {task.attachments?.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-8">
                                            {isAr ? 'لا توجد مرفقات' : 'No attachments'}
                                        </p>
                                    ) : (
                                        task.attachments?.map((attachment) => (
                                            <AttachmentItem
                                                key={attachment.id}
                                                attachment={attachment}
                                                currentUserId={currentUserId}
                                                onDelete={() => handleDeleteAttachment(attachment.id)}
                                                onToggleFinal={() => handleToggleFinal(attachment)}
                                                isDeleting={deletingAttachmentId === attachment.id}
                                            />
                                        ))
                                    )}
                                </div>
                                <div className="mt-4 pt-4 border-t">
                                    <FileUploadZone
                                        taskId={task.id}
                                        userId={currentUserId}
                                        onUploadComplete={() => {
                                            // Optional: Show toast or refresh (realtime handles refresh)
                                        }}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        {isAr ? 'المهمة غير موجودة' : 'Task not found'}
                    </div>
                )}
            </SheetContent>

            {/* Return Task Dialog */}
            <ReturnTaskDialog
                open={returnDialogOpen}
                onOpenChange={setReturnDialogOpen}
                taskId={task?.id ?? null}
                taskTitle={task?.title}
                workflowStage={task?.workflow_stage}
            />

            {/* Forward to Designer Dialog */}
            {canForward && task && (
                <ForwardToDesignerDialog
                    open={forwardDialogOpen}
                    onOpenChange={setForwardDialogOpen}
                    task={task}
                    accountManagerId={currentUserId}
                />
            )}
        </Sheet>
    )
}

export default TaskDetails
