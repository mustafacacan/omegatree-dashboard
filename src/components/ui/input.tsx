import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  wrapperClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, wrapperClassName, type, ...props }, ref) => {
    return (
      <div className={cn('space-y-1.5', wrapperClassName)}>
        {label && (
          <label className="block text-[13px] font-medium text-surface-700">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              'flex h-9 w-full rounded-xl border bg-white px-3 py-2',
              'text-sm text-surface-800 placeholder:text-surface-400',
              'transition-colors duration-150',
              'border-surface-200',
              'hover:border-surface-300',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-50',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error && 'border-danger focus:ring-danger/20 focus:border-danger',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
              {rightIcon}
            </div>
          )}
        </div>
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
Input.displayName = 'Input'

export { Input }
