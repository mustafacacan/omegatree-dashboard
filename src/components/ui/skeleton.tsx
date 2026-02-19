import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-md bg-surface-100 animate-pulse',
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
