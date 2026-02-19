import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-[13px] font-medium text-surface-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'flex min-h-[90px] w-full rounded-lg border bg-white px-3 py-2.5',
            'text-sm text-surface-800 placeholder:text-surface-400',
            'transition-colors duration-150',
            'border-surface-200',
            'hover:border-surface-300',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-50',
            'resize-none',
            error && 'border-danger focus:ring-danger/20 focus:border-danger',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-danger font-medium">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-surface-400">{hint}</p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
