import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Input } from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import { createAnamnez } from '@/services/anamnez.service'

type FormState = {
  chronic_illness: string
  medication_used: string
  food_allergy: string
  body_weight: string
  body_height: string
  waist_circumference: string
  hip_circumference: string
  profession: string
  education: string
}

function toNumber(v: string): number | null {
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function AnamnezStep({ onSaved }: { onSaved: () => void | Promise<void> }) {
  const [form, setForm] = useState<FormState>({
    chronic_illness: '',
    medication_used: '',
    food_allergy: '',
    body_weight: '',
    body_height: '',
    waist_circumference: '',
    hip_circumference: '',
    profession: '', 
    education: '',
  })

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {}
    const req = (key: keyof FormState, label: string) => {
      if (!form[key].trim()) e[key] = `${label} zorunludur.`
    }

    req('chronic_illness', 'Kronik hastalık')
    req('medication_used', 'Kullanılan ilaç')
    req('food_allergy', 'Gıda alerjisi')
    req('profession', 'Meslek')
    req('education', 'Eğitim')

    const numReq = (key: keyof FormState, label: string) => {
      const n = toNumber(form[key])
      if (n == null) e[key] = `${label} sayı olmalıdır.`
    }

    numReq('body_weight', 'Kilo (kg)')
    numReq('body_height', 'Boy (cm)')
    numReq('waist_circumference', 'Bel çevresi (cm)')
    numReq('hip_circumference', 'Kalça çevresi (cm)')

    return e
  }, [form])

  const mutation = useMutation({
    mutationFn: async () => {
      const bodyWeight = toNumber(form.body_weight)
      const bodyHeight = toNumber(form.body_height)
      const waist = toNumber(form.waist_circumference)
      const hip = toNumber(form.hip_circumference)

      if (bodyWeight == null || bodyHeight == null || waist == null || hip == null) {
        throw new Error('Lütfen ölçüm alanlarını kontrol edin.')
      }

      return createAnamnez({
        chronic_illness: form.chronic_illness.trim(),
        medication_used: form.medication_used.trim(),
        food_allergy: form.food_allergy.trim(),
        body_weight: bodyWeight,
        body_height: Math.round(bodyHeight),
        waist_circumference: waist,
        hip_circumference: hip,
        profession: form.profession.trim(),
        education: form.education.trim(),
      })
    },
    onSuccess: async () => {
      toast.success('Anamnez kaydedildi.')
      await onSaved()
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Anamnez kaydedilemedi.' }))
    },
  })

  const hasErrors = Object.keys(errors).length > 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Kronik hastalık *"
          value={form.chronic_illness}
          onChange={(e) => setForm((s) => ({ ...s, chronic_illness: e.target.value }))}
          placeholder="Örn: diyabet"
          error={errors.chronic_illness}
        />
        <Input
          label="Kullanılan ilaç *"
          value={form.medication_used}
          onChange={(e) => setForm((s) => ({ ...s, medication_used: e.target.value }))}
          placeholder="Örn: metformin"
          error={errors.medication_used}
        />
        <Input
          label="Gıda alerjisi *"
          value={form.food_allergy}
          onChange={(e) => setForm((s) => ({ ...s, food_allergy: e.target.value }))}
          placeholder="Örn: fıstık"
          error={errors.food_allergy}
        />
        <Input
          label="Meslek *"
          value={form.profession}
          onChange={(e) => setForm((s) => ({ ...s, profession: e.target.value }))}
          placeholder="Örn: yazılım geliştirici"
          error={errors.profession}
        />
        <Input
          label="Eğitim *"
          value={form.education}
          onChange={(e) => setForm((s) => ({ ...s, education: e.target.value }))}
          placeholder="Örn: lisans"
          error={errors.education}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Kilo (kg) *"
          type="number"
          inputMode="decimal"
          value={form.body_weight}
          onChange={(e) => setForm((s) => ({ ...s, body_weight: e.target.value }))}
          placeholder="70.5"
          error={errors.body_weight}
        />
        <Input
          label="Boy (cm) *"
          type="number"
          inputMode="numeric"
          value={form.body_height}
          onChange={(e) => setForm((s) => ({ ...s, body_height: e.target.value }))}
          placeholder="175"
          error={errors.body_height}
        />
        <Input
          label="Bel çevresi (cm) *"
          type="number"
          inputMode="decimal"
          value={form.waist_circumference}
          onChange={(e) => setForm((s) => ({ ...s, waist_circumference: e.target.value }))}
          placeholder="85.5"
          error={errors.waist_circumference}
        />
        <Input
          label="Kalça çevresi (cm) *"
          type="number"
          inputMode="decimal"
          value={form.hip_circumference}
          onChange={(e) => setForm((s) => ({ ...s, hip_circumference: e.target.value }))}
          placeholder="95.5"
          error={errors.hip_circumference}
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
