import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'text-sm font-medium rounded-xl',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'cursor-pointer select-none',
    'active:scale-[0.98]',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-surface-900 text-white hover:bg-surface-800 hover:shadow-md shadow-[0_1px_2px_rgba(42,47,39,0.12)]',
        primary:
          'bg-primary-500 text-white hover:bg-primary-600 hover:shadow-[0_4px_12px_rgba(139,154,75,0.35)] shadow-[0_1px_2px_rgba(58,79,27,0.2)]',
        gradient:
          'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm hover:from-primary-600 hover:to-primary-700 hover:shadow-[0_4px_12px_rgba(139,154,75,0.3)]',
        outline:
          'border border-surface-200 bg-panel text-surface-700 hover:bg-surface-100 hover:text-surface-900 hover:border-surface-300',
        ghost:
          'text-surface-600 hover:bg-surface-100 hover:text-surface-800',
        destructive:
          'bg-danger text-white hover:bg-red-600 shadow-sm hover:shadow-md',
        link:
          'text-primary-600 hover:text-primary-700 underline-offset-4 hover:underline p-0 h-auto active:scale-100',
        success:
          'bg-success text-white hover:opacity-90 hover:shadow-md shadow-sm',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded-lg gap-1',
        sm: 'h-8 px-3 text-xs gap-1.5',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-5 text-sm',
        xl: 'h-11 px-6 text-base',
        'icon-xs': 'h-7 w-7 p-0 rounded-md',
        'icon-sm': 'h-8 w-8 p-0',
        'icon': 'h-9 w-9 p-0',
        'icon-lg': 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : leftIcon ? (
          leftIcon
        ) : null}
        {children}
        {rightIcon && !loading && rightIcon}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
