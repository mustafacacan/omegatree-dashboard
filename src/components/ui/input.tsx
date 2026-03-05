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
          <label className="block text-sm font-medium text-surface-700">
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
              'flex h-10 w-full rounded-xl border bg-white px-3.5 py-2',
              'text-sm text-surface-800 placeholder:text-surface-400',
              'transition-[border-color,box-shadow,background-color] duration-250 ease-out',
              'border-surface-200',
              'hover:border-surface-300 hover:bg-surface-50/30',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-50',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-danger border-l-2 focus:ring-danger/15 focus:border-danger',
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
          <p className="text-xs text-danger font-medium flex items-center gap-1">
            <span className="inline-block h-1 w-1 rounded-full bg-danger shrink-0" />
            {error}
          </p>
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
