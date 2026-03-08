'use client'

import { useMemo, useState } from 'react'
import {
    Clock, MapPin, Building2,
    Edit2, Trash2, CheckCircle2,
    Users, AlertTriangle, X, Link2, FileText, Image as ImageIcon, PlayCircle
} from 'lucide-react'

import { cn, formatTime12h } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Tooltip, TooltipContent, TooltipTrigger
} from '@/components/ui/tooltip'

import {
    SCHEDULE_STATUS_CONFIG, getScheduleStatusConfig,
    isScheduleOverdue, OVERDUE_CONFIG,
    APPROVAL_STATUS_CONFIG
} from '@/types/schedule'
import type { ScheduleWithRelations, ScheduleStatus } from '@/types/schedule'
import type { User, ScheduleLink } from '@/types/database'
import { getRoleLabel } from '@/hooks/use-users'
import { getStatusDot, getStatusBadgeClasses, getCardBorderClass } from './schedule-helpers'

export interface ScheduleCardProps {
    schedule: ScheduleWithRelations
    isAr: boolean
    memberMap: Map<string, Pick<User, 'id' | 'name' | 'avatar_url' | 'role'>>
    onEdit: () => void
    onDelete: (id: string) => void
    onStatusChange: (status: ScheduleStatus) => void
    isAccountManager?: boolean
    onApproval?: (id: string, status: 'approved' | 'rejected', note?: string) => void
}

export function ScheduleCard({ schedule, isAr, memberMap, onEdit, onDelete, onStatusChange, isAccountManager, onApproval }: ScheduleCardProps) {
    const overdue = isScheduleOverdue(schedule)
    const hasMissingItems = !!(schedule.missing_items?.trim()) && schedule.missing_items_status !== 'resolved'
    const statusCfg = overdue ? OVERDUE_CONFIG : getScheduleStatusConfig(schedule.status)
    const [showRejectInput, setShowRejectInput] = useState(false)
    const [rejectNote, setRejectNote] = useState('')

    const members = useMemo(() => 
        (schedule.assigned_members || [])
            .map(id => memberMap.get(id))
            .filter(Boolean) as Pick<User, 'id' | 'name' | 'avatar_url' | 'role'>[],
        [schedule.assigned_members, memberMap]
    )

    // Filter once to avoid double iteration in JSX
    const filteredLinks = useMemo(() =>
        (schedule.links as ScheduleLink[] | undefined)?.filter(l => l.url?.trim()) ?? [],
        [schedule.links]
    )

    return (
        <div className={cn(
            'group relative rounded-xl glass-dashboard p-4 transition-all duration-300 hover:translate-y-[-1px]',
            getCardBorderClass(schedule.status, overdue, hasMissingItems),
            overdue && '!border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.1)]',
            schedule.status === 'completed' && '!border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]',
            hasMissingItems && !overdue && schedule.status !== 'completed' && 'shadow-[0_0_12px_rgba(249,115,22,0.1)]',
        )}>
            {/* Status accent line */}
            <div className={cn(
                'absolute top-0 start-0 w-1 h-full rounded-s-xl',
                getStatusDot(schedule.status, overdue, hasMissingItems)
            )} />

            <div className="ps-3">
                {/* Top row: title + actions */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm truncate">{schedule.title}</h4>
                            <Badge
                                variant="outline"
                                className={cn('shrink-0 text-[10px] px-2 py-0 h-5 rounded-md border', getStatusBadgeClasses(schedule.status, overdue))}
                            >
                                {overdue
                                    ? (isAr ? 'متأخر' : 'Overdue')
                                    : (isAr ? statusCfg?.labelAr : statusCfg?.label)}
                            </Badge>
                        </div>

                        {schedule.schedule_type && (
                            <div className="mb-1.5">
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'text-[10px] px-2 py-0 h-5 rounded-md border font-semibold',
                                        schedule.schedule_type === 'reels'
                                            ? 'bg-violet-500/10 text-violet-500 border-violet-500/30'
                                            : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                                    )}
                                >
                                    {schedule.schedule_type === 'reels'
                                        ? (isAr ? '📹 ريلز' : '📹 Reel')
                                        : (isAr ? '📝 بوست' : '📝 Post')}
                                </Badge>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {!isAccountManager && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg hover:bg-muted"
                                    onClick={onEdit}
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isAr ? 'تعديل' : 'Edit'}</TooltipContent>
                        </Tooltip>
                        )}
                        {!isAccountManager && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-destructive"
                                    onClick={() => onDelete(schedule.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isAr ? 'حذف' : 'Delete'}</TooltipContent>
                        </Tooltip>
                        )}
                    </div>
                </div>

                {/* Info chips: time + location */}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                    {schedule.start_time && (
                        <div className="flex items-center gap-1 text-xs bg-muted/30 text-muted-foreground px-2 py-1 rounded-lg">
                            <Clock className="h-3 w-3" />
                            {formatTime12h(schedule.start_time)}
                            {schedule.end_time && (
                                <span className="text-muted-foreground/60">
                                    → {formatTime12h(schedule.end_time)}
                                </span>
                            )}
                        </div>
                    )}
                    {schedule.location && (
                        <div className="flex items-center gap-1 text-xs bg-muted/30 text-muted-foreground px-2 py-1 rounded-lg">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{schedule.location}</span>
                        </div>
                    )}
                </div>

                {/* Client chip – own row */}
                {schedule.client && (
                    <div className="flex items-center gap-1 text-xs bg-primary/5 text-primary px-2 py-1 rounded-lg mt-1.5 w-fit max-w-full">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{schedule.client?.name}</span>
                    </div>
                )}

                {/* Assigned Members */}
                {members.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                        <Users className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        <div className="flex -space-x-1.5">
                            {members.slice(0, 6).map(member => (
                                <Tooltip key={member.id}>
                                    <TooltipTrigger asChild>
                                            <Avatar className="h-7 w-7 border-2 border-card ring-0">
                                                <AvatarImage src={member.avatar_url || ''} />
                                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                                                    {member.name?.charAt(0) || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs">
                                            <p className="font-semibold">{member.name}</p>
                                            <p className="text-muted-foreground">
                                                {getRoleLabel(member.role, isAr)}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                        </div>
                        {members.length > 6 && (
                            <span className="text-[10px] text-muted-foreground ms-1">
                                +{members.length - 6}
                            </span>
                        )}
                    </div>
                )}

                {/* Description */}
                {schedule.description && (
                    <div className="mt-2 pt-2 border-t border-border/20">
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            <FileText className="h-3 w-3" />
                            {isAr ? 'الوصف' : 'Description'}
                        </div>
                        <p className="text-xs text-foreground/80 whitespace-pre-wrap break-words">
                            {schedule.description}
                        </p>
                    </div>
                )}

                {/* Notes */}
                {schedule.notes && (
                    <div className="mt-2">
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            {isAr ? '📌 ملاحظات' : '📌 Notes'}
                        </div>
                        <p className="text-xs text-muted-foreground/80 italic whitespace-pre-wrap break-words">
                            {schedule.notes}
                        </p>
                    </div>
                )}

                {/* Links */}
                {filteredLinks.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/20">
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                            <Link2 className="h-3 w-3" />
                            {isAr ? 'الروابط' : 'Links'}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {filteredLinks.map((link, i) => (
                                <div key={i} className="flex flex-col gap-0.5">
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary underline underline-offset-2 truncate hover:text-primary/80 transition-colors"
                                    >
                                        {link.url}
                                    </a>
                                    {link.comment?.trim() && (
                                        <span className="text-[10px] text-muted-foreground/70 ps-1 italic">
                                            {link.comment}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Images & Videos */}
                {schedule.images && (schedule.images as string[]).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/20">
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                            <ImageIcon className="h-3 w-3" />
                            {isAr ? 'الصور والفيديوهات' : 'Images & Videos'}
                            <span className="text-primary bg-primary/10 px-1.5 rounded-full ms-1">
                                {(schedule.images as string[]).length}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                            {(schedule.images as string[]).map((url, i) => {
                                const isVideo = /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(url) || url.includes('video')
                                return isVideo ? (
                                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted/40 group/media">
                                        <video
                                            src={url}
                                            className="w-full h-full object-cover"
                                            preload="metadata"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/media:bg-black/50 transition-colors">
                                            <PlayCircle className="h-7 w-7 text-white drop-shadow" />
                                        </div>
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute inset-0"
                                            aria-label={isAr ? 'فتح الفيديو' : 'Open video'}
                                        />
                                    </div>
                                ) : (
                                    <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative aspect-square rounded-lg overflow-hidden bg-muted/40 block hover:opacity-90 transition-opacity"
                                    >
                                        <img
                                            src={url}
                                            alt={`media-${i}`}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </a>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Approval Status & Missing Items */}
                {(schedule.approval_status || schedule.missing_items) && (
                    <div className="mt-2 pt-2 border-t border-border/20">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {schedule.approval_status && (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'text-[10px] px-2 py-0 h-5 rounded-md border',
                                        schedule.approval_status === 'approved' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
                                        schedule.approval_status === 'rejected' && 'bg-red-500/10 text-red-600 border-red-500/30',
                                        schedule.approval_status === 'pending' && 'bg-amber-500/10 text-amber-600 border-amber-500/30',
                                    )}
                                >
                                    {isAr
                                        ? APPROVAL_STATUS_CONFIG.find(c => c.id === schedule.approval_status)?.labelAr
                                        : APPROVAL_STATUS_CONFIG.find(c => c.id === schedule.approval_status)?.label}
                                </Badge>
                            )}
                        </div>
                        {schedule.missing_items && (
                            <div className={cn(
                                'mt-2 px-2.5 py-2 rounded-lg border text-xs',
                                schedule.missing_items_status === 'pending' && 'bg-orange-500/8 text-orange-700 border-orange-500/30 dark:text-orange-400',
                                schedule.missing_items_status === 'resolved' && 'bg-green-500/8 text-green-700 border-green-500/30 dark:text-green-400',
                                schedule.missing_items_status === 'not_applicable' && 'bg-gray-400/8 text-gray-600 border-gray-400/30 dark:text-gray-400',
                            )}>
                                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider mb-0.5 opacity-75">
                                    <AlertTriangle className="h-3 w-3" />
                                    {isAr ? 'النواقص' : 'Missing Items'}
                                </div>
                                <p className="whitespace-pre-wrap break-words">{schedule.missing_items}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Manager Notes / Rejection reason */}
                {schedule.manager_notes && (
                    <div className={cn(
                        'mt-2 px-2.5 py-1.5 rounded-lg border',
                        schedule.approval_status === 'rejected'
                            ? 'bg-red-500/5 border-red-500/30'
                            : 'bg-blue-500/5 border-blue-500/20'
                    )}>
                        <p className={cn(
                            'text-[10px] font-semibold mb-0.5 flex items-center gap-1',
                            schedule.approval_status === 'rejected' ? 'text-red-600' : 'text-blue-600'
                        )}>
                            {schedule.approval_status === 'rejected' && '❌'}
                            {isAr
                                ? (schedule.approval_status === 'rejected' ? 'سبب الرفض' : 'ملاحظات المدير')
                                : (schedule.approval_status === 'rejected' ? 'Rejection Reason' : 'Manager Notes')}
                        </p>
                        <p className={cn(
                            'text-xs',
                            schedule.approval_status === 'rejected' ? 'text-red-600/80' : 'text-blue-600/80'
                        )}>
                            {schedule.manager_notes}
                        </p>
                    </div>
                )}

                {/* Account Manager Approval Controls */}
                {isAccountManager && onApproval && schedule.approval_status !== 'approved' && (
                    <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                        {/* Approve + Reject buttons */}
                        {!showRejectInput && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-7 text-xs rounded-lg bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                                    onClick={() => onApproval(schedule.id, 'approved')}
                                >
                                    <CheckCircle2 className="h-3 w-3 me-1" />
                                    {isAr ? 'موافقة' : 'Approve'}
                                </Button>
                                {schedule.approval_status !== 'rejected' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-7 text-xs rounded-lg bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20"
                                        onClick={() => { setShowRejectInput(true); setRejectNote('') }}
                                    >
                                        <X className="h-3 w-3 me-1" />
                                        {isAr ? 'رفض' : 'Reject'}
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Inline rejection note form */}
                        {showRejectInput && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">
                                    {isAr ? '⚠️ سبب الرفض (مطلوب)' : '⚠️ Rejection reason (required)'}
                                </p>
                                <textarea
                                    value={rejectNote}
                                    onChange={e => setRejectNote(e.target.value)}
                                    placeholder={isAr ? 'أدخل سبب الرفض...' : 'Enter rejection reason...'}
                                    rows={3}
                                    className="w-full text-xs rounded-lg border border-red-500/30 bg-red-500/5 px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-red-500/40 placeholder:text-muted-foreground/50"
                                />
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-7 text-xs rounded-lg bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20 disabled:opacity-40"
                                        disabled={!rejectNote.trim()}
                                        onClick={() => {
                                            if (!rejectNote.trim()) return
                                            onApproval(schedule.id, 'rejected', rejectNote.trim())
                                            setShowRejectInput(false)
                                            setRejectNote('')
                                        }}
                                    >
                                        <X className="h-3 w-3 me-1" />
                                        {isAr ? 'تأكيد الرفض' : 'Confirm Reject'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs rounded-lg"
                                        onClick={() => { setShowRejectInput(false); setRejectNote('') }}
                                    >
                                        {isAr ? 'إلغاء' : 'Cancel'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Status Change Dropdown */}
                <div className="mt-3 pt-3 border-t border-border/20">
                    <Select value={schedule.status} onValueChange={(v) => onStatusChange(v as ScheduleStatus)}>
                        <SelectTrigger className="h-8 rounded-lg text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SCHEDULE_STATUS_CONFIG.map(cfg => (
                                <SelectItem key={cfg.id} value={cfg.id}>
                                    <span className="text-xs">{isAr ? cfg.labelAr : cfg.label}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    )
}
