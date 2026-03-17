import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui'
import type { DanisanOnboardingStep } from '../danisan-prereq-gate'
import { AnamnezStep } from './steps/anamnez-step'
import { FoodConsumptionStep } from './steps/food-consumption-step'
import { SleepQualityStep } from './steps/sleep-quality-step'

const steps: Array<{ key: DanisanOnboardingStep; title: string; subtitle: string }> = [
  { key: 'anamnez', title: 'Sağlık Bilgileri', subtitle: 'Anamnez formunu doldurun' },
  { key: 'food', title: 'Beslenme Alışkanlıkları', subtitle: 'Beslenme kaydını doldurun' },
  { key: 'sleep', title: 'Uyku Kalitesi', subtitle: 'Son uyku kaydınızı girin' },
]

export function DanisanOnboardingWizard({ missingSteps }: { missingSteps: DanisanOnboardingStep[] }) {
  const queryClient = useQueryClient()
  const sequence = useMemo(
    () => steps.filter((s) => missingSteps.includes(s.key)),
    [missingSteps]
  )

  const [overrideStep, setOverrideStep] = useState<DanisanOnboardingStep | null>(null)
  const activeStep: DanisanOnboardingStep =
    overrideStep && missingSteps.includes(overrideStep)
      ? overrideStep
      : (sequence[0]?.key ?? missingSteps[0] ?? 'anamnez')

  const activeIndex = useMemo(() => {
    const idx = sequence.findIndex((s) => s.key === activeStep)
    return idx >= 0 ? idx : 0
  }, [activeStep, sequence])

  const header = sequence[activeIndex] ?? sequence[0]

  const onSaved = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['anamnez', 'me'] }),
      queryClient.invalidateQueries({ queryKey: ['food-consumption-records', 'me'] }),
      queryClient.invalidateQueries({ queryKey: ['sleep-quality-records', 'me', 'latest'] }),
    ])

    const idx = sequence.findIndex((s) => s.key === activeStep)
    const next = idx >= 0 ? sequence[idx + 1]?.key : undefined
    setOverrideStep(next ?? null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[18px] font-bold text-surface-900">Panele devam etmeden önce</h1>
        <p className="text-[12px] mt-1 text-surface-500">
          Size özel değerlendirme için bazı bilgileri tamamlamanız gerekiyor.
        </p>
      </div>

      <Card className="border-surface-200">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-surface-500">Adım {activeIndex + 1}/{sequence.length}</p>
              <h2 className="text-base font-semibold text-surface-900">{header?.title}</h2>
              <p className="text-xs text-surface-500 mt-0.5">{header?.subtitle}</p>
            </div>
          </div>

          {activeStep === 'anamnez' ? (
            <AnamnezStep onSaved={onSaved} />
          ) : activeStep === 'food' ? (
            <FoodConsumptionStep onSaved={onSaved} />
          ) : (
            <SleepQualityStep onSaved={onSaved} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
