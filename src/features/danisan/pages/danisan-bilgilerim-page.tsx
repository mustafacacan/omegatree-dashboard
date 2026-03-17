import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ROUTES } from '@/utils/routes'
import { getAnamnezForms, type AnamnezForm } from '@/services/anamnez.service'
import { getMyFoodConsumptionRecord, type FoodConsumptionRecord } from '@/services/food-consumption-records.service'
import { getMyLatestSleepQualityRecord, type SleepQualityRecord } from '@/services/sleep-quality-records.service'
import { Info, Loader2 } from 'lucide-react'

function valueOrDash(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string') return v.trim() ? v : '—'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '—'
  if (typeof v === 'boolean') return v ? 'Evet' : 'Hayır'
  return String(v)
}

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

function FieldGrid({ fields }: { fields: Array<{ label: string; value: unknown }> }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fields.map((f) => (
        <div key={f.label} className="rounded-xl border border-surface-200 bg-panel p-3">
          <dt className="text-xs font-medium text-surface-500">{f.label}</dt>
          <dd className="text-sm text-surface-900 mt-1 break-words">{valueOrDash(f.value)}</dd>
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
        description="Anamnez, beslenme ve uyku kayitlarinizi buradan gorebilirsiniz."
        breadcrumbs={[
          { label: 'Panelim', href: ROUTES.DANISAN },
          { label: 'Bilgilerim' },
        ]}
      />

      <SectionCard
        title="Anamnez"
        description="Kayitli anamnez bilgileriniz"
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
            <FieldGrid
              fields={[
                { label: 'Kronik hastalik', value: latestAnamnez.chronicIllness },
                { label: 'Kullanilan ilaclar', value: latestAnamnez.medicationUsed },
                { label: 'Besin alerjisi', value: latestAnamnez.foodAllergy },
                { label: 'Kilo (kg)', value: latestAnamnez.bodyWeight },
                { label: 'Boy (cm)', value: latestAnamnez.bodyHeight },
                { label: 'Bel cevresi (cm)', value: latestAnamnez.waistCircumference },
                { label: 'Kalca cevresi (cm)', value: latestAnamnez.hipCircumference },
                { label: 'Meslek', value: latestAnamnez.profession },
                { label: 'Egitim', value: latestAnamnez.education },
              ]}
            />
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Besin Tuketim Kaydi"
        description="Kayitli beslenme aliskanliklariniz"
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
            <FieldGrid
              fields={[
                { label: 'Gunluk ogun sayisi', value: (food as FoodConsumptionRecord).mealsPerDay },
                { label: 'Alkol sikligi', value: (food as FoodConsumptionRecord).alcoholFrequency },
                { label: 'Sigara sikligi', value: (food as FoodConsumptionRecord).smokingFrequency },
                { label: 'Kacinilan besinler', value: (food as FoodConsumptionRecord).avoidedFoods },
                { label: 'Gunluk su (L)', value: (food as FoodConsumptionRecord).dailyWaterLiters },
                { label: 'Fastfood/disari ogun', value: (food as FoodConsumptionRecord).fastFoodMealsPerDay },
                { label: 'Defekasyon sikligi', value: (food as FoodConsumptionRecord).defecationFrequency },
                { label: 'Rahatsiz eden besinler', value: (food as FoodConsumptionRecord).discomfortFoods },
                { label: 'Diyare/konstipasyon', value: (food as FoodConsumptionRecord).bowelIssue },
                { label: 'GIS hastaligi', value: (food as FoodConsumptionRecord).gastrointestinalDisease },
                { label: 'Gece yeme aliskanligi', value: (food as FoodConsumptionRecord).nightEatingHabit },
                { label: 'Yeme bozuklugu davranisi', value: (food as FoodConsumptionRecord).eatingDisorderBehaviors },
              ]}
            />
          </div>
        )}
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
                { label: 'Yatis saati', value: (sleep as SleepQualityRecord).usualBedTime },
                { label: 'Kalkis saati', value: (sleep as SleepQualityRecord).usualWakeTime },
                { label: 'Uykuya dalma (dk)', value: (sleep as SleepQualityRecord).sleepLatencyMinutes },
                { label: 'Uyku suresi (saat)', value: (sleep as SleepQualityRecord).sleepHours },
                { label: '30 dk icinde uyuyamama (0-3)', value: (sleep as SleepQualityRecord).cannotFallAsleepWithin30 },
                { label: 'Tuvalet icin uyanma (0-3)', value: (sleep as SleepQualityRecord).wakeToUseBathroom },
                { label: 'Rahat nefes alamama (0-3)', value: (sleep as SleepQualityRecord).cannotBreatheComfortably },
                { label: 'Oksurme/horlama (0-3)', value: (sleep as SleepQualityRecord).coughOrSnoreLoudly },
                { label: 'Usume (0-3)', value: (sleep as SleepQualityRecord).feelTooCold },
                { label: 'Sicaklik/terleme (0-3)', value: (sleep as SleepQualityRecord).feelTooHot },
                { label: 'Kotu ruya (0-3)', value: (sleep as SleepQualityRecord).badDreams },
                { label: 'Agri (0-3)', value: (sleep as SleepQualityRecord).pain },
                { label: 'Oznel uyku kalitesi (0-3)', value: (sleep as SleepQualityRecord).subjectiveSleepQuality },
                { label: 'Uyku ilaci (0-3)', value: (sleep as SleepQualityRecord).sleepMedicationFrequency },
                { label: 'Gunduz uykululuk (0-3)', value: (sleep as SleepQualityRecord).daytimeSleepinessFrequency },
                { label: 'Istek/enerji problemi (0-3)', value: (sleep as SleepQualityRecord).lackOfEnthusiasmProblem },
                { label: 'Es/oda arkadasi (0-3)', value: (sleep as SleepQualityRecord).bedPartnerSituation },
                { label: 'Notlar', value: (sleep as SleepQualityRecord).notes },
              ]}
            />
          </div>
        )}
      </SectionCard>
    </div>
  )
}
