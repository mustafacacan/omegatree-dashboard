import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolbarSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
}

export function ToolbarSearch({
  value,
  onChange,
  placeholder = 'Ara...',
  className,
  inputClassName,
}: ToolbarSearchProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full sm:w-56 md:w-64 rounded-xl border border-surface-200 bg-surface-50 py-2 pl-9 pr-3 text-sm text-surface-900 outline-none',
          'focus:border-primary-500 focus:ring-1 focus:ring-primary-200',
          inputClassName
        )}
      />
    </div>
  )
}
