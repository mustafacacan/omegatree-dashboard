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

const W = {
  olive: '#8B9A4B',
  oliveLight: '#EEF2DE',
  orange: '#E8913A',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
  creamDark: '#F0EDE7',
  warmBorder: '#E8E4DE',
}

export function Timeline({ steps, className }: TimelineProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className="flex items-center justify-center h-7 w-7 rounded-full shrink-0"
              style={
                step.status === 'completed'
                  ? { background: W.olive, color: '#fff' }
                  : step.status === 'current'
                    ? { background: '#fff', border: `2px solid ${W.olive}`, color: W.olive }
                    : step.status === 'error'
                      ? { background: '#D97070', color: '#fff' }
                      : { background: W.creamDark, color: W.textLight }
              }
            >
              {step.status === 'completed' && <Check className="h-3.5 w-3.5" />}
              {step.status === 'current' && <Zap className="h-3 w-3" />}
              {step.status === 'upcoming' && <Clock className="h-3 w-3" />}
              {step.status === 'error' && <AlertCircle className="h-3.5 w-3.5" />}
            </div>
            {index < steps.length - 1 && (
              <div className="relative w-px h-8 mt-1">
                <div className="absolute inset-0" style={{ background: W.warmBorder }} />
                {step.status === 'completed' && (
                  <div className="absolute inset-0" style={{ background: W.olive }} />
                )}
              </div>
            )}
          </div>
          <div className="pb-5 pt-0.5">
            <p
              className="text-[13px] font-medium"
              style={{
                color:
                  step.status === 'completed' ? W.text
                    : step.status === 'current' ? W.olive
                      : step.status === 'error' ? '#D97070'
                        : W.textLight,
                fontWeight: step.status === 'current' || step.status === 'error' ? 600 : 500,
              }}
            >
              {step.label}
            </p>
            {step.description && (
              <p className="text-[11px] mt-0.5" style={{ color: W.textLight }}>{step.description}</p>
            )}
            {step.date && (
              <p className="text-[11px] mt-0.5 font-mono" style={{ color: W.textLight }}>{step.date}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
