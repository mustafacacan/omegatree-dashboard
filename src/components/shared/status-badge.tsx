import { Badge } from '@/components/ui'
import { KIT_STATUS_LABELS, type KitStatus } from '@/utils/constants'
import { cn } from '@/lib/utils'

const STATUS_VARIANT: Record<string, string> = {
  IN_STOCK: 'bg-surface-100 text-surface-600',
  ASSIGNED: 'bg-primary-50 text-primary-700',
  DELIVERED: 'bg-green-50 text-green-700',
  RETURN_REQUESTED: 'bg-amber-50 text-amber-700',
  DAMAGED: 'bg-red-50 text-red-700',
  SAMPLE_SENT: 'bg-violet-50 text-violet-700',
  LAB_PENDING: 'bg-amber-50 text-amber-700',
  REJECTED: 'bg-red-50 text-red-700',
  IN_ANALYSIS: 'bg-orange-50 text-orange-700',
  ANALYSIS_COMPLETE: 'bg-primary-50 text-primary-700',
  SPECIALIST_POOL: 'bg-violet-50 text-violet-700',
  REPORT_READY: 'bg-green-50 text-green-700',
  ADMIN_APPROVAL: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-green-50 text-green-700',
}

interface StatusBadgeProps {
  status: KitStatus
  size?: 'sm' | 'md'
  pulse?: boolean
}

export function StatusBadge({ status, size = 'md', pulse }: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        STATUS_VARIANT[status] || 'bg-surface-100 text-surface-600',
        size === 'sm' && 'text-[10px] px-1.5 py-0',
      )}
      dot
      pulse={pulse}
    >
      {KIT_STATUS_LABELS[status]}
    </Badge>
  )
}
