import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-surface-100 text-surface-600 dark:bg-surface-200 dark:text-surface-700',
        primary: 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
        success: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        info: 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
        outline: 'bg-transparent text-surface-600 border border-surface-200 dark:text-surface-400 dark:border-surface-400',
        gradient: 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0.5',
        md: 'text-[11px] px-2 py-0.5',
        lg: 'text-xs px-2.5 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  pulse?: boolean
}

function Badge({ className, variant, size, dot, pulse, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />
          )}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
