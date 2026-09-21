import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import { BeslenmeAnamneziFormFields } from '@/features/shared/beslenme-anamnezi-form-fields'
import {
  BESLENME_REQUIRED_ERROR,
  buildBeslenmeAnamneziPayload,
  type BeslenmeAnamneziFormState,
} from '@/features/shared/beslenme-anamnezi-form.utils'
import { upsertMyFoodConsumptionRecord } from '@/services/food-consumption-records.service'

function toInt(v: string): number | null {
  if (!String(v).trim()) return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}

function toNumber(v: string): number | null {
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function inRange(n: number, min: number, max: number): boolean {
  return n >= min && n <= max
}

const INITIAL: BeslenmeAnamneziFormState = {
  mainMealsPerDay: '3',
  snackMealsPerDay: '0',
  avoidedFoods: '',
  avoidedFoodsReason: '',
  foodAllergy: '',
  dailyWaterLiters: '2',
  fastFoodDaysPerWeek: '0',
  fastFoodMealsPerWeek: '0',
  defecationFrequency: '',
  bowelIssue: 'none',
  bowelIssueFrequency: '',
  gastrointestinalDisease: 'Yok',
  nightEatingHabit: false,
  eatingDisorderBehaviors: false,
  eatingDisorderBehaviorsNote: '',
  nutritionNotes: '',
}

export function FoodConsumptionStep({ onSaved }: { onSaved: () => void | Promise<void> }) {
  const [form, setForm] = useState<BeslenmeAnamneziFormState>(INITIAL)

  const errors = useMemo(() => {
    const e: Partial<Record<keyof BeslenmeAnamneziFormState, string>> = {}

    const main = toInt(form.mainMealsPerDay)
    const snack = toInt(form.snackMealsPerDay)
    if (main == null || !inRange(main, 0, 10)) e.mainMealsPerDay = 'Ana öğün sayısı 0–10 arasında olmalı.'
    if (snack == null || !inRange(snack, 0, 10)) e.snackMealsPerDay = 'Ara öğün sayısı 0–10 arasında olmalı.'

    const ffDays = toInt(form.fastFoodDaysPerWeek)
    const ffMeals = toInt(form.fastFoodMealsPerWeek)
    if (ffDays == null || !inRange(ffDays, 0, 7)) e.fastFoodDaysPerWeek = 'Haftalık dışarı gün sayısı 0–7 arasında olmalı.'
    if (ffMeals == null || !inRange(ffMeals, 0, 30)) e.fastFoodMealsPerWeek = 'Haftalık dışarı öğün sayısı 0–30 arasında olmalı.'

    const water = toNumber(form.dailyWaterLiters)
    if (water == null || !inRange(water, 0, 20)) e.dailyWaterLiters = 'Günlük su 0–20 L arasında olmalı.'

    if (!form.avoidedFoods.trim()) e.avoidedFoods = 'Kaçınılan besinler zorunludur.'
    if (!form.defecationFrequency) e.defecationFrequency = 'Tuvalet sıklığı zorunludur.'
    if (!form.gastrointestinalDisease.trim()) e.gastrointestinalDisease = 'GIS hastalığı zorunludur.'
    if (form.bowelIssue !== 'none' && !form.bowelIssueFrequency) {
      e.bowelIssueFrequency = 'Bağırsak sorunu sıklığı zorunludur.'
    }

    return e
  }, [form])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = buildBeslenmeAnamneziPayload(form)
      if (payload === 'error') throw new Error(BESLENME_REQUIRED_ERROR)
      if (!payload) throw new Error(BESLENME_REQUIRED_ERROR)
      return upsertMyFoodConsumptionRecord(payload)
    },
    onSuccess: async () => {
      toast.success('Beslenme anamnezi kaydedildi.')
      await onSaved()
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Beslenme anamnezi kaydedilemedi.' }))
    },
  })

  const hasErrors = Object.keys(errors).length > 0

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-surface-800">Beslenme Anamnezi</p>

      <BeslenmeAnamneziFormFields
        form={form}
        onChange={(patch) => setForm((s) => ({ ...s, ...patch }))}
        variant="onboarding"
        showNotes={false}
        errors={errors}
      />

      <div className="pt-2">
        <Button
          variant="primary"
          onClick={() => mutation.mutate()}
          disabled={hasErrors || mutation.isPending}
          loading={mutation.isPending}
        >
          Kaydet ve Devam Et
        </Button>
      </div>
    </div>
  )
}
