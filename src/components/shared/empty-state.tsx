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
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in rounded-2xl border border-surface-200 bg-panel shadow-card max-w-md mx-auto">
      <div className="flex items-center justify-center h-14 w-14 rounded-xl mb-4 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-surface-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
