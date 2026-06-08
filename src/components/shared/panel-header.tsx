import { cn } from '@/lib/utils'

interface PanelHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PanelHeader({ title, description, actions, className }: PanelHeaderProps) {
  return (
    <div
      className={cn(
        'p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-200',
        className
      )}
    >
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-surface-900 truncate">{title}</h3>
        {description && (
          <p className="text-[12px] mt-0.5 text-surface-500 truncate">{description}</p>
        )}
      </div>

      {actions && <div className="flex w-full flex-wrap items-center gap-2 justify-start sm:w-auto sm:justify-end">{actions}</div>}
    </div>
  )
}
