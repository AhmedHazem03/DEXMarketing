import type { ScheduleStatus } from '@/types/schedule'

export function getStatusDot(status: ScheduleStatus, overdue: boolean, hasMissingItems = false): string {
    if (overdue) return 'bg-red-500'
    switch (status) {
        case 'completed': return 'bg-emerald-500'
        case 'in_progress': return 'bg-amber-400'
        case 'cancelled': return 'bg-gray-400'
        default: return hasMissingItems ? 'bg-orange-500' : 'bg-sky-400'
    }
}

export function getStatusBadgeClasses(status: ScheduleStatus, overdue: boolean): string {
    if (overdue) return 'bg-red-500/15 text-red-400 border-red-500/30'
    switch (status) {
        case 'completed': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        case 'in_progress': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
        case 'cancelled': return 'bg-gray-500/15 text-gray-400 border-gray-500/30'
        default: return 'bg-sky-500/15 text-sky-400 border-sky-500/30'
    }
}

export function getCardBorderClass(status: ScheduleStatus, overdue: boolean, hasMissingItems = false): string {
    if (overdue) return 'border-red-500/40 hover:border-red-500/60'
    switch (status) {
        case 'completed': return 'border-emerald-500/30 hover:border-emerald-500/50'
        case 'in_progress': return 'border-amber-500/30 hover:border-amber-500/50'
        default: return hasMissingItems
            ? 'border-orange-500/40 hover:border-orange-500/60'
            : 'border-border hover:border-primary/30'
    }
}

export const colorMap = {
    primary: {
        bg: 'bg-primary/10',
        icon: 'text-primary',
        value: 'text-primary',
        ring: 'ring-primary/30',
        border: 'border-primary/20',
    },
    sky: {
        bg: 'bg-sky-500/10',
        icon: 'text-sky-400',
        value: 'text-sky-400',
        ring: 'ring-sky-500/30',
        border: 'border-sky-500/20',
    },
    amber: {
        bg: 'bg-amber-500/10',
        icon: 'text-amber-400',
        value: 'text-amber-400',
        ring: 'ring-amber-500/30',
        border: 'border-amber-500/20',
    },
    emerald: {
        bg: 'bg-emerald-500/10',
        icon: 'text-emerald-400',
        value: 'text-emerald-400',
        ring: 'ring-emerald-500/30',
        border: 'border-emerald-500/20',
    },
    red: {
        bg: 'bg-red-500/10',
        icon: 'text-red-400',
        value: 'text-red-400',
        ring: 'ring-red-500/30',
        border: 'border-red-500/20',
    },
    orange: {
        bg: 'bg-orange-500/10',
        icon: 'text-orange-400',
        value: 'text-orange-400',
        ring: 'ring-orange-500/30',
        border: 'border-orange-500/20',
    },
} as const
