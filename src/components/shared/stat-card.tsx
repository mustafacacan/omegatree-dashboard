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
  primary: { icon: '#8B9A4B', bg: '#EEF2DE' },
  sky: { icon: '#E8913A', bg: '#FDF0E2' },
  amber: { icon: '#F5C842', bg: '#FDF8E8' },
  rose: { icon: '#D97070', bg: '#FDE8E8' },
  violet: { icon: '#6ABF69', bg: '#E8F5E8' },
}

export function StatCard({ title, value, change, icon: Icon, color, className }: StatCardProps) {
  const cfg = colorConfig[color]

  return (
    <div
      className={cn(
        'rounded-2xl p-5 transition-shadow hover:shadow-md cursor-default',
        className
      )}
      style={{ background: '#fff', border: '1px solid #E8E4DE' }}
    >
      <div className="flex items-center gap-3.5">
        <div
          className="flex items-center justify-center h-12 w-12 rounded-full shrink-0"
          style={{ background: cfg.bg }}
        >
          <Icon className="h-5 w-5" style={{ color: cfg.icon }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#9C968D' }}>
            {title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xl font-bold" style={{ color: '#2D2A26' }}>{value}</span>
            {change && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{
                  background: change.value >= 0 ? '#E8F5E8' : '#FDE8E8',
                  color: change.value >= 0 ? '#3D8B3D' : '#C53030',
                }}
              >
                {change.value >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {change.value >= 0 ? '+' : ''}{change.value}%
              </span>
            )}
          </div>
        </div>
      </div>

      {change && (
        <p className="text-[10px] mt-2 pl-[60px]" style={{ color: '#B5AFA5' }}>{change.label}</p>
      )}
    </div>
  )
}
