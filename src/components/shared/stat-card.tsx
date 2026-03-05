import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    label: string
  }
  icon: LucideIcon
  color: 'primary' | 'sky' | 'amber' | 'rose' | 'violet'
  className?: string
}

const colorConfig = {
  primary: {
    icon: 'text-brand-500',
    bgFrom: 'from-primary-50',
    bgTo: 'to-primary-100',
    accent: 'stat-accent-primary',
  },
  sky: {
    icon: 'text-accent-amber',
    bgFrom: 'from-orange-50',
    bgTo: 'to-orange-100',
    accent: 'stat-accent-sky',
  },
  amber: {
    icon: 'text-warning',
    bgFrom: 'from-amber-50',
    bgTo: 'to-amber-100',
    accent: 'stat-accent-amber',
  },
  rose: {
    icon: 'text-danger',
    bgFrom: 'from-red-50',
    bgTo: 'to-red-100',
    accent: 'stat-accent-rose',
  },
  violet: {
    icon: 'text-success',
    bgFrom: 'from-green-50',
    bgTo: 'to-green-100',
    accent: 'stat-accent-violet',
  },
}

export function StatCard({ title, value, change, icon: Icon, color, className }: StatCardProps) {
  const cfg = colorConfig[color]

  return (
    <div
      className={cn(
        'rounded-2xl bg-white border border-border p-6',
        'hover-lift cursor-default',
        cfg.accent,
        className
      )}
    >
      <div className="flex items-center gap-3.5">
        <div
          className={cn(
            'flex items-center justify-center h-12 w-12 rounded-full shrink-0',
            'bg-gradient-to-br',
            cfg.bgFrom,
            cfg.bgTo,
          )}
        >
          <Icon className={cn('h-5 w-5', cfg.icon)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            {title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xl font-bold text-text-primary">{value}</span>
            {change && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                  change.value >= 0
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700',
                )}
              >
                {change.value >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {change.value >= 0 ? '+' : ''}{change.value}%
              </span>
            )}
          </div>
        </div>
      </div>

      {change && (
        <p className="text-[10px] mt-2.5 pl-[60px] text-text-muted">{change.label}</p>
      )}
    </div>
  )
}
