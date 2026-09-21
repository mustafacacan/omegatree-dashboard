import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ROUTES } from '@/utils/routes'
import { getAnamnezForms, type AnamnezForm } from '@/services/anamnez.service'
import { getMyFoodConsumptionRecord, type FoodConsumptionRecord } from '@/services/food-consumption-records.service'
import { getMyLatestSleepQualityRecord, type SleepQualityRecord } from '@/services/sleep-quality-records.service'
import {
  anamnezDisplayFields,
  foodDisplayFields,
} from '@/features/shared/client-health-display'
import { IpaqPanel } from '@/features/dietitian/clients/components/ipaq-panel'
import { FoodFrequencyPanel } from '@/features/dietitian/clients/components/food-frequency-panel'
import { Info, Loader2 } from 'lucide-react'

function pickLatestAnamnez(list: AnamnezForm[] | undefined): AnamnezForm | null {
  if (!list || list.length === 0) return null
  const sorted = [...list].sort((a, b) => {
    const aT = new Date(a.updatedAt || a.createdAt || 0).getTime()
    const bT = new Date(b.updatedAt || b.createdAt || 0).getTime()
    return bT - aT
  })
  return sorted[0] ?? null
}

function SectionCard({
  title,
  description,
  loading,
  error,
  children,
}: {
  title: string
  description: string
  loading: boolean
  error: boolean
  children: React.ReactNode
}) {
  return (
    <Card className="border-surface-200">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
            <Info className="h-6 w-6 text-surface-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-surface-900 mb-1">{title}</h3>
            <p className="text-sm text-surface-600 mb-4">{description}</p>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-surface-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Yukleniyor...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
                Veri yuklenemedi.
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fields.map((f) => (
        <div key={f.label} className="rounded-xl border border-surface-200 bg-panel p-3">
          <dt className="text-xs font-medium text-surface-500">{f.label}</dt>
          <dd className="text-sm text-surface-900 mt-1 break-words">{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function DanisanBilgilerimPage() {
  const anamnezQuery = useQuery({
    queryKey: ['anamnez', 'me', 'bilgilerim'],
    queryFn: getAnamnezForms,
    retry: 1,
    staleTime: 30_000,
  })

  const foodQuery = useQuery({
    queryKey: ['food-consumption-records', 'me', 'bilgilerim'],
    queryFn: getMyFoodConsumptionRecord,
    retry: 1,
    staleTime: 30_000,
  })

  const sleepQuery = useQuery({
    queryKey: ['sleep-quality-records', 'me', 'latest', 'bilgilerim'],
    queryFn: getMyLatestSleepQualityRecord,
    retry: 1,
    staleTime: 30_000,
  })

  const latestAnamnez = useMemo(() => pickLatestAnamnez(anamnezQuery.data), [anamnezQuery.data])
  const food = foodQuery.data
  const sleep = sleepQuery.data

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Bilgilerim"
        description="Anamnez, beslenme, IPAQ ve besin sıklığı kayıtlarınızı buradan görebilirsiniz."
        breadcrumbs={[
          { label: 'Panelim', href: ROUTES.DANISAN },
          { label: 'Bilgilerim' },
        ]}
      />

      <SectionCard
        title="Anamnez"
        description="Kayıtlı anamnez bilgileriniz"
        loading={anamnezQuery.isLoading}
        error={anamnezQuery.isError}
      >
        {!latestAnamnez ? (
          <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
            Kayit bulunamadi.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-surface-500">
              Son guncelleme: {latestAnamnez.updatedAt || latestAnamnez.createdAt ? formatDateTime(latestAnamnez.updatedAt || latestAnamnez.createdAt) : '—'}
            </div>
            <FieldGrid fields={anamnezDisplayFields(latestAnamnez)} />
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Beslenme Anamnezi"
        description="Kayıtlı beslenme alışkanlıklarınız"
        loading={foodQuery.isLoading}
        error={foodQuery.isError}
      >
        {!food ? (
          <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
            Kayit bulunamadi.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-surface-500">
              Tarih: {formatDate((food as FoodConsumptionRecord).updatedAt ?? (food as FoodConsumptionRecord).createdAt)}
            </div>
            <FieldGrid fields={foodDisplayFields(food as FoodConsumptionRecord)} />
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="IPAQ (Fiziksel Aktivite)"
        description="IPAQ kısa form yanıtlarınızı görüntüleyin ve güncelleyin"
        loading={false}
        error={false}
      >
        <IpaqPanel clientId="me" />
      </SectionCard>

      <SectionCard
        title="Besin Tüketim Sıklığı"
        description="Besin tüketim sıklığı formunuzu doldurun veya güncelleyin"
        loading={false}
        error={false}
      >
        <FoodFrequencyPanel clientId="me" />
      </SectionCard>

      <SectionCard
        title="Uyku Kalitesi"
        description="Kayitli son uyku kaydiniz"
        loading={sleepQuery.isLoading}
        error={sleepQuery.isError}
      >
        {!sleep ? (
          <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
            Kayit bulunamadi.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-surface-500">
              Tarih: {formatDate((sleep as SleepQualityRecord).recordDate ?? (sleep as SleepQualityRecord).updatedAt ?? (sleep as SleepQualityRecord).createdAt)}
            </div>
            <FieldGrid
              fields={[
                { label: 'Yatis saati', value: String((sleep as SleepQualityRecord).usualBedTime ?? '—') },
                { label: 'Kalkis saati', value: String((sleep as SleepQualityRecord).usualWakeTime ?? '—') },
                { label: 'Uykuya dalma (dk)', value: String((sleep as SleepQualityRecord).sleepLatencyMinutes ?? '—') },
                { label: 'Uyku suresi (saat)', value: String((sleep as SleepQualityRecord).sleepHours ?? '—') },
                { label: 'Notlar', value: String((sleep as SleepQualityRecord).notes ?? '—') },
              ]}
            />
          </div>
        )}
      </SectionCard>
    </div>
  )
}
