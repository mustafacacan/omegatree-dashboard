import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Checkbox, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import { upsertMyFoodConsumptionRecord } from '@/services/food-consumption-records.service'

type AlcoholSmoking = 'never' | 'rarely' | 'sometimes' | 'often' | 'daily'
type BowelIssue = 'none' | 'diarrhea' | 'constipation' | 'both'

type FormState = {
  mealsPerDay: string
  alcoholFrequency: AlcoholSmoking
  smokingFrequency: AlcoholSmoking
  avoidedFoods: string
  dailyWaterLiters: string
  fastFoodMealsPerDay: string
  defecationFrequency: string
  discomfortFoods: string
  bowelIssue: BowelIssue
  gastrointestinalDisease: string
  nightEatingHabit: boolean
  eatingDisorderBehaviors: boolean
}

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

export function FoodConsumptionStep({ onSaved }: { onSaved: () => void | Promise<void> }) {
  const [form, setForm] = useState<FormState>({
    mealsPerDay: '3',
    alcoholFrequency: 'never',
    smokingFrequency: 'never',
    avoidedFoods: '',
    dailyWaterLiters: '2',
    fastFoodMealsPerDay: '0',
    defecationFrequency: '',
    discomfortFoods: '',
    bowelIssue: 'none',
    gastrointestinalDisease: 'Yok',
    nightEatingHabit: false,
    eatingDisorderBehaviors: false,
  })

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {}

    const meals = toInt(form.mealsPerDay)
    if (meals == null || !inRange(meals, 1, 10)) e.mealsPerDay = 'Günlük öğün sayısı 1-10 arasında olmalı.'

    const ff = toInt(form.fastFoodMealsPerDay)
    if (ff == null || !inRange(ff, 0, 10)) e.fastFoodMealsPerDay = 'Fastfood/ dışarı öğün sayısı 0-10 arasında olmalı.'

    const water = toNumber(form.dailyWaterLiters)
    if (water == null || !inRange(water, 0, 20)) e.dailyWaterLiters = 'Günlük su 0-20 L arasında olmalı.'

    if (!form.avoidedFoods.trim()) e.avoidedFoods = 'Kaçınılan besinler zorunludur.'
    if (!form.defecationFrequency.trim()) e.defecationFrequency = 'Dışkılama sıklığı zorunludur.'
    if (!form.discomfortFoods.trim()) e.discomfortFoods = 'Rahatsız eden besinler zorunludur.'
    if (!form.gastrointestinalDisease.trim()) e.gastrointestinalDisease = 'GIS hastalığı zorunludur.'

    return e
  }, [form])

  const mutation = useMutation({
    mutationFn: async () => {
      const meals = toInt(form.mealsPerDay)
      const ff = toInt(form.fastFoodMealsPerDay)
      const water = toNumber(form.dailyWaterLiters)
      if (meals == null || ff == null || water == null) throw new Error('Lütfen sayısal alanları kontrol edin.')

      return upsertMyFoodConsumptionRecord({
        mealsPerDay: meals,
        alcoholFrequency: form.alcoholFrequency,
        smokingFrequency: form.smokingFrequency,
        avoidedFoods: form.avoidedFoods.trim(),
        dailyWaterLiters: water,
        fastFoodMealsPerDay: ff,
        defecationFrequency: form.defecationFrequency.trim(),
        discomfortFoods: form.discomfortFoods.trim(),
        bowelIssue: form.bowelIssue,
        gastrointestinalDisease: form.gastrointestinalDisease.trim(),
        nightEatingHabit: Boolean(form.nightEatingHabit),
        eatingDisorderBehaviors: Boolean(form.eatingDisorderBehaviors),
      })
    },
    onSuccess: async () => {
      toast.success('Beslenme kaydı kaydedildi.')
      await onSaved()
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Beslenme kaydı kaydedilemedi.' }))
    },
  })

  const hasErrors = Object.keys(errors).length > 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Günde kaç öğün besleniyorsunuz? *"
          type="number"
          min={1}
          max={10}
          value={form.mealsPerDay}
          onChange={(e) => setForm((s) => ({ ...s, mealsPerDay: e.target.value }))}
          error={errors.mealsPerDay}
        />

        <Input
          label="Günlük kaç öğün dışarıdan (fastfood) besleniyorsunuz? *"
          type="number"
          min={0}
          max={10}
          value={form.fastFoodMealsPerDay}
          onChange={(e) => setForm((s) => ({ ...s, fastFoodMealsPerDay: e.target.value }))}
          error={errors.fastFoodMealsPerDay}
        />

        <Input
          label="Günlük su tüketiminiz ne kadar? (L) *"
          type="number"
          min={0}
          max={20}
          step="0.1"
          value={form.dailyWaterLiters}
          onChange={(e) => setForm((s) => ({ ...s, dailyWaterLiters: e.target.value }))}
          error={errors.dailyWaterLiters}
        />

        <div className="sm:col-span-2 space-y-2">
          <label className="block text-sm font-medium text-surface-700">Alkol ve Sigara tüketim sıklığınız nedir? *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-surface-500">Alkol</label>
              <Select
                value={form.alcoholFrequency}
                onValueChange={(v) => setForm((s) => ({ ...s, alcoholFrequency: v as AlcoholSmoking }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Hiç</SelectItem>
                  <SelectItem value="rarely">Nadiren</SelectItem>
                  <SelectItem value="sometimes">Bazen</SelectItem>
                  <SelectItem value="often">Sık</SelectItem>
                  <SelectItem value="daily">Her gün</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-surface-500">Sigara</label>
              <Select
                value={form.smokingFrequency}
                onValueChange={(v) => setForm((s) => ({ ...s, smokingFrequency: v as AlcoholSmoking }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Hiç</SelectItem>
                  <SelectItem value="rarely">Nadiren</SelectItem>
                  <SelectItem value="sometimes">Bazen</SelectItem>
                  <SelectItem value="often">Sık</SelectItem>
                  <SelectItem value="daily">Her gün</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">Diyare veya konstipasyon sorununuz var mı? *</label>
          <Select value={form.bowelIssue} onValueChange={(v) => setForm((s) => ({ ...s, bowelIssue: v as BowelIssue }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Yok</SelectItem>
              <SelectItem value="diarrhea">İshal</SelectItem>
              <SelectItem value="constipation">Kabızlık</SelectItem>
              <SelectItem value="both">Her ikisi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Input
          label="Tüketmekten kaçındığınız besinler nelerdir? *"
          value={form.avoidedFoods}
          onChange={(e) => setForm((s) => ({ ...s, avoidedFoods: e.target.value }))}
          placeholder="Örn: gluten, laktoz"
          error={errors.avoidedFoods}
        />

        <Input
          label="Ne sıklıkta defekasyon yapıyorsunuz? *"
          value={form.defecationFrequency}
          onChange={(e) => setForm((s) => ({ ...s, defecationFrequency: e.target.value }))}
          placeholder="Örn: günlük / gün aşırı"
          error={errors.defecationFrequency}
        />

        <Input
          label="Tüketimi sizi rahatsız eden besinler nelerdir? *"
          value={form.discomfortFoods}
          onChange={(e) => setForm((s) => ({ ...s, discomfortFoods: e.target.value }))}
          placeholder="Örn: süt"
          error={errors.discomfortFoods}
        />

        <Input
          label="Gastrointestinal sistem hastalığınız var mı? *"
          value={form.gastrointestinalDisease}
          onChange={(e) => setForm((s) => ({ ...s, gastrointestinalDisease: e.target.value }))}
          placeholder="Yoksa 'Yok' yazın, varsa belirtin"
          error={errors.gastrointestinalDisease}
        />
      </div>

      <div className="flex flex-wrap gap-4 pt-1">
        <Checkbox
          checked={form.nightEatingHabit}
          onCheckedChange={(v) => setForm((s) => ({ ...s, nightEatingHabit: Boolean(v) }))}
          label="Gece yemek yeme alışkanlığınız var mı?"
        />
        <Checkbox
          checked={form.eatingDisorderBehaviors}
          onCheckedChange={(v) => setForm((s) => ({ ...s, eatingDisorderBehaviors: Boolean(v) }))}
          label="Yeme bozukluğu davranışlarına sahip misiniz?"
        />
      </div>

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
