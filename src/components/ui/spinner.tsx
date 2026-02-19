import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
  }

  return (
    <Loader2
      className={cn('animate-spin text-primary-500', sizeClasses[size], className)}
    />
  )
}

interface FullPageSpinnerProps {
  message?: string
}

export function FullPageSpinner({ message }: FullPageSpinnerProps) {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        {message && <p className="text-sm text-surface-500">{message}</p>}
      </div>
    </div>
  )
}
