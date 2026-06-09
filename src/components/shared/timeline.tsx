import { cn } from '@/lib/utils'
import { Check, Clock, AlertCircle, Zap } from 'lucide-react'

interface TimelineStep {
  label: string
  description?: string
  date?: string
  status: 'completed' | 'current' | 'upcoming' | 'error'
}

interface TimelineProps {
  steps: TimelineStep[]
  className?: string
}

export function Timeline({ steps, className }: TimelineProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-7 w-7 rounded-full shrink-0 items-center justify-center',
                step.status === 'completed' && 'bg-primary-600 text-white',
                step.status === 'current' && 'bg-panel border-2 border-primary-500 text-primary-600',
                step.status === 'error' && 'bg-danger text-white',
                step.status === 'upcoming' && 'bg-surface-200 text-surface-500',
              )}
            >
              {step.status === 'completed' && <Check className="h-3.5 w-3.5" />}
              {step.status === 'current' && <Zap className="h-3 w-3" />}
              {step.status === 'upcoming' && <Clock className="h-3 w-3" />}
              {step.status === 'error' && <AlertCircle className="h-3.5 w-3.5" />}
            </div>
            {index < steps.length - 1 && (
              <div className="relative w-px h-8 mt-1">
                <div className="absolute inset-0 bg-surface-200" />
                {step.status === 'completed' && (
                  <div className="absolute inset-0 bg-primary-600" />
                )}
              </div>
            )}
          </div>
          <div className="pb-5 pt-0.5">
            <p
              className={cn(
                'text-[13px] font-medium',
                step.status === 'completed' && 'text-text-primary',
                step.status === 'current' && 'text-primary-600 dark:text-primary-400 font-semibold',
                step.status === 'error' && 'text-danger font-semibold',
                step.status === 'upcoming' && 'text-text-secondary',
              )}
            >
              {step.label}
            </p>
            {step.description && (
              <p className="text-[11px] mt-0.5 text-text-secondary">{step.description}</p>
            )}
            {step.date && (
              <p className="text-[11px] mt-0.5 font-mono text-text-secondary">{step.date}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
