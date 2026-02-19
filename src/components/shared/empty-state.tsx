import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="flex items-center justify-center h-16 w-16 rounded-xl bg-surface-100 mb-5">
        <Icon className="h-8 w-8 text-surface-400" />
      </div>
      <h3 className="text-base font-semibold text-surface-800 mb-1">{title}</h3>
      <p className="text-sm text-surface-500 max-w-sm mb-5">{description}</p>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
