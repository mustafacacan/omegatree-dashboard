import { Outlet } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import { getAnamnezForms } from '@/services/anamnez.service'
import { getMyFoodConsumptionRecord } from '@/services/food-consumption-records.service'
import { getMyLatestSleepQualityRecord } from '@/services/sleep-quality-records.service'
import { DanisanOnboardingWizard } from './onboarding/danisan-onboarding-wizard'

export type DanisanOnboardingStep = 'anamnez' | 'food' | 'sleep'

function getHttpStatus(err: unknown): number | undefined {
  const e = err as { response?: { status?: unknown } }
  return typeof e?.response?.status === 'number' ? e.response.status : undefined
}

export function DanisanPrereqGate() {
  const anamnezQuery = useQuery({
    queryKey: ['anamnez', 'me'],
    queryFn: async () => {
      try {
        return await getAnamnezForms()
      } catch (err: unknown) {
        const status = getHttpStatus(err)
        if (status === 404) return []
        throw err
      }
    },
    staleTime: 30_000,
    retry: 1,
    placeholderData: keepPreviousData,
  })

  const foodQuery = useQuery({
    queryKey: ['food-consumption-records', 'me'],
    queryFn: () => getMyFoodConsumptionRecord(),
    staleTime: 30_000,
    retry: 1,
    placeholderData: keepPreviousData,
  })

  const sleepQuery = useQuery({
    queryKey: ['sleep-quality-records', 'me', 'latest'],
    queryFn: () => getMyLatestSleepQualityRecord(),
    staleTime: 30_000,
    retry: 1,
    placeholderData: keepPreviousData,
  })

  const isLoading =
    anamnezQuery.isLoading ||
    foodQuery.isLoading ||
    sleepQuery.isLoading ||
    anamnezQuery.isFetching ||
    foodQuery.isFetching ||
    sleepQuery.isFetching
  if (isLoading) {
    return (
      <div className="py-14 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
        <p className="text-sm text-surface-500">Bilgileriniz kontrol ediliyor...</p>
      </div>
    )
  }

  const hasError = anamnezQuery.isError || foodQuery.isError || sleepQuery.isError
  if (hasError) {
    const err = anamnezQuery.error ?? foodQuery.error ?? sleepQuery.error
    return (
      <Card className="border-surface-200" interactive={false}>
        <CardContent className="p-6">
          <p className="text-sm font-medium text-surface-700">Gerekli bilgiler kontrol edilemedi</p>
          <p className="text-xs text-surface-500 mt-1">{getApiErrorMessage(err, { fallback: 'Lütfen tekrar deneyin.' })}</p>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                anamnezQuery.refetch()
                foodQuery.refetch()
                sleepQuery.refetch()
              }}
            >
              Yeniden Dene
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasAnamnez = (anamnezQuery.data ?? []).length > 0
  const hasFood = foodQuery.data != null
  const hasSleep = sleepQuery.data != null

  const missingSteps: DanisanOnboardingStep[] = [
    ...(hasAnamnez ? [] : (['anamnez'] as const)),
    ...(hasFood ? [] : (['food'] as const)),
    ...(hasSleep ? [] : (['sleep'] as const)),
  ]

  if (missingSteps.length > 0) {
    return <DanisanOnboardingWizard missingSteps={missingSteps} />
  }

  return <Outlet />
}
