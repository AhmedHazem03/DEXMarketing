'use client'

import { cn } from '@/lib/utils'
import { colorMap } from './schedule-helpers'

export interface StatsCardProps {
    icon: React.ReactNode
    label: string
    value: number
    color: 'primary' | 'sky' | 'amber' | 'emerald' | 'red' | 'orange'
    active: boolean
    onClick: () => void
    pulse?: boolean
}

export function StatsCard({ icon, label, value, color, active, onClick, pulse }: StatsCardProps) {
    const colors = colorMap[color]

    return (
        <button
            onClick={onClick}
            className={cn(
                'relative flex items-center gap-3 p-3 sm:p-4 rounded-2xl transition-all duration-300',
                'glass-dashboard hover:shadow-lg hover:translate-y-[-2px]',
                colors.border,
                active && `ring-2 ${colors.ring} ${colors.bg}`,
            )}
        >
            <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm',
                colors.bg
            )}>
                <span className={colors.icon}>
                    {icon}
                </span>
            </div>
            <div className="text-start">
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className={cn('text-xl font-bold', colors.value)}>{value}</p>
            </div>
            {pulse && value > 0 && (
                <span className="absolute top-2 end-2 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
            )}
        </button>
    )
}
