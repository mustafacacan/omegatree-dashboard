import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import { FREQUENCY_OPTIONS, type FrequencyValue } from '@/lib/frequency-labels'
import { createAnamnez } from '@/services/anamnez.service'

type FormState = {
  age: string
  chronic_illness: string
  family_chronic_illness: string
  medication_used: string
  body_weight: string
  body_height: string
  waist_circumference: string
  hip_circumference: string
  neck_circumference: string
  smokingFrequency: FrequencyValue
  alcoholFrequency: FrequencyValue
  alcoholType: string
  profession: string
  education: string
}

function toNumber(v: string): number | null {
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function AnamnezStep({ onSaved }: { onSaved: () => void | Promise<void> }) {
  const [form, setForm] = useState<FormState>({
    age: '',
    chronic_illness: '',
    family_chronic_illness: '',
    medication_used: '',
    body_weight: '',
    body_height: '',
    waist_circumference: '',
    hip_circumference: '',
    neck_circumference: '',
    smokingFrequency: 'never',
    alcoholFrequency: 'never',
    alcoholType: '',
    profession: '',
    education: '',
  })

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {}
    const req = (key: keyof FormState, label: string) => {
      if (!form[key].trim()) e[key] = `${label} zorunludur.`
    }

    req('chronic_illness', 'Kronik hastalık')
    req('family_chronic_illness', 'Ailede kronik hastalık')
    req('medication_used', 'Kullanılan ilaç')
    req('profession', 'Meslek')
    req('education', 'Eğitim')

    const age = toNumber(form.age)
    if (age == null || age < 1 || age > 120) e.age = 'Yaş 1–120 arasında olmalıdır.'

    const numReq = (key: keyof FormState, label: string) => {
      const n = toNumber(form[key])
      if (n == null) e[key] = `${label} sayı olmalıdır.`
    }

    numReq('body_weight', 'Kilo (kg)')
    numReq('body_height', 'Boy (cm)')
    numReq('waist_circumference', 'Bel çevresi (cm)')
    numReq('hip_circumference', 'Kalça çevresi (cm)')
    numReq('neck_circumference', 'Boyun çevresi (cm)')

    return e
  }, [form])

  const mutation = useMutation({
    mutationFn: async () => {
      const bodyWeight = toNumber(form.body_weight)
      const bodyHeight = toNumber(form.body_height)
      const waist = toNumber(form.waist_circumference)
      const hip = toNumber(form.hip_circumference)
      const neck = toNumber(form.neck_circumference)
      const age = toNumber(form.age)

      if (bodyWeight == null || bodyHeight == null || waist == null || hip == null || neck == null || age == null) {
        throw new Error('Lütfen ölçüm alanlarını kontrol edin.')
      }

      return createAnamnez({
        age: Math.round(age),
        chronic_illness: form.chronic_illness.trim(),
        family_chronic_illness: form.family_chronic_illness.trim(),
        medication_used: form.medication_used.trim(),
        body_weight: bodyWeight,
        body_height: Math.round(bodyHeight),
        waist_circumference: waist,
        hip_circumference: hip,
        neck_circumference: neck,
        smokingFrequency: form.smokingFrequency,
        alcoholFrequency: form.alcoholFrequency,
        alcoholType: form.alcoholType.trim() || undefined,
        profession: form.profession.trim(),
        education: form.education.trim(),
      } as Parameters<typeof createAnamnez>[0])
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
          label="Yaş *"
          type="number"
          min={1}
          max={120}
          value={form.age}
          onChange={(e) => setForm((s) => ({ ...s, age: e.target.value }))}
          placeholder="35"
          error={errors.age}
        />
        <Input
          label="Kronik hastalık *"
          value={form.chronic_illness}
          onChange={(e) => setForm((s) => ({ ...s, chronic_illness: e.target.value }))}
          placeholder="Yoksa 'Yok' yazın"
          error={errors.chronic_illness}
        />
        <Input
          label="Ailede kronik hastalık *"
          value={form.family_chronic_illness}
          onChange={(e) => setForm((s) => ({ ...s, family_chronic_illness: e.target.value }))}
          placeholder="Yoksa 'Yok' yazın"
          error={errors.family_chronic_illness}
        />
        <Input
          label="Kullanılan ilaç *"
          value={form.medication_used}
          onChange={(e) => setForm((s) => ({ ...s, medication_used: e.target.value }))}
          placeholder="Yoksa 'Yok' yazın"
          error={errors.medication_used}
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
        <Input
          label="Boyun çevresi (cm) *"
          type="number"
          inputMode="decimal"
          value={form.neck_circumference}
          onChange={(e) => setForm((s) => ({ ...s, neck_circumference: e.target.value }))}
          placeholder="38"
          error={errors.neck_circumference}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">Sigara tüketim sıklığı *</label>
          <Select
            value={form.smokingFrequency}
            onValueChange={(v) => setForm((s) => ({ ...s, smokingFrequency: v as FrequencyValue }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">Alkol tüketim sıklığı *</label>
          <Select
            value={form.alcoholFrequency}
            onValueChange={(v) => setForm((s) => ({ ...s, alcoholFrequency: v as FrequencyValue }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          label="Tüketilen alkol türü"
          value={form.alcoholType}
          onChange={(e) => setForm((s) => ({ ...s, alcoholType: e.target.value }))}
          placeholder="Örn: şarap, bira"
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
