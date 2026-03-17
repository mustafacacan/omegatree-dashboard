import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Checkbox, Input } from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import { upsertMySleepQualityRecord } from '@/services/sleep-quality-records.service'

type FormState = {
  recordDate: string
  usualBedTime: string
  sleepLatencyMinutes: string
  usualWakeTime: string
  sleepHours: string
  cannotFallAsleepWithin30: string
  wakeToUseBathroom: string
  cannotBreatheComfortably: boolean
  coughOrSnoreLoudly: boolean
  feelTooCold: boolean
  feelTooHot: boolean
  badDreams: boolean
  pain: boolean
  subjectiveSleepQuality: string
  sleepMedicationFrequency: string
  daytimeSleepinessFrequency: string
  lackOfEnthusiasmProblem: string
  bedPartnerSituation: string
  notes: string
}

function toIsoDateTime(date: string): string {
  // Accepts YYYY-MM-DD and converts to ISO date-time.
  // Backend expects date-time but examples show date; ISO is safest.
  const d = date ? new Date(`${date}T00:00:00`) : new Date()
  return d.toISOString()
}

function toInt(v: string): number | null {
  if (!String(v).trim()) return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}

function toScore(v: string | boolean): number | null {
  if (typeof v === 'boolean') return v ? 1 : 0
  return toInt(v)
}

function toRequiredInt(v: string, label: string, min: number, max: number): number {
  const n = toInt(v)
  if (n == null || !inRange(n, min, max)) throw new Error(`${label} için ${min}-${max} arası değer girin.`)
  return n
}

function toNumber(v: string): number | null {
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function inRange(n: number, min: number, max: number): boolean {
  return n >= min && n <= max
}

export function SleepQualityStep({ onSaved }: { onSaved: () => void | Promise<void> }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<FormState>({
    recordDate: today,
    usualBedTime: '23:30',
    sleepLatencyMinutes: '20',
    usualWakeTime: '07:30',
    sleepHours: '7.5',
    cannotFallAsleepWithin30: '0',
    wakeToUseBathroom: '0',
    cannotBreatheComfortably: false,
    coughOrSnoreLoudly: false,
    feelTooCold: false,
    feelTooHot: false,
    badDreams: false,
    pain: false,
    subjectiveSleepQuality: '0',
    sleepMedicationFrequency: '0',
    daytimeSleepinessFrequency: '0',
    lackOfEnthusiasmProblem: '0',
    bedPartnerSituation: '0',
    notes: '',
  })

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {}

    if (!form.recordDate.trim()) e.recordDate = 'Tarih zorunludur.'
    if (!form.usualBedTime.trim()) e.usualBedTime = 'Yatış saati zorunludur.'
    if (!form.usualWakeTime.trim()) e.usualWakeTime = 'Kalkış saati zorunludur.'

    const latency = toInt(form.sleepLatencyMinutes)
    if (latency == null || !inRange(latency, 0, 600)) e.sleepLatencyMinutes = 'Uykuya dalma süresi 0-600 dk olmalı.'

    const hours = toNumber(form.sleepHours)
    if (hours == null || !inRange(hours, 0, 24)) e.sleepHours = 'Uyku süresi 0-24 saat olmalı.'

    const scoreFields: Array<{ key: keyof FormState; label: string }> = [
      { key: 'cannotFallAsleepWithin30', label: '30 dk içinde uyuyamama' },
      { key: 'wakeToUseBathroom', label: 'Tuvalet için uyanma' },
      { key: 'cannotBreatheComfortably', label: 'Rahat nefes alamama' },
      { key: 'coughOrSnoreLoudly', label: 'Öksürme/horlama' },
      { key: 'feelTooCold', label: 'Üşüme' },
      { key: 'feelTooHot', label: 'Terleme/sıcak' },
      { key: 'badDreams', label: 'Kötü rüya' },
      { key: 'pain', label: 'Ağrı' },
      { key: 'subjectiveSleepQuality', label: 'Öznel uyku kalitesi' },
      { key: 'sleepMedicationFrequency', label: 'Uyku ilacı' },
      { key: 'daytimeSleepinessFrequency', label: 'Gündüz uykululuk' },
      { key: 'lackOfEnthusiasmProblem', label: 'İstek/enerji problemi' },
      { key: 'bedPartnerSituation', label: 'Eş/oda arkadaşı durumu' },
    ]

    for (const f of scoreFields) {
      const n = toScore(form[f.key])
      if (n == null || !inRange(n, 0, 3)) e[f.key] = `${f.label} için 0-3 arası değer girin.`
    }

    return e
  }, [form])

  const mutation = useMutation({
    mutationFn: async () => {
      const latency = toInt(form.sleepLatencyMinutes)
      const hours = toNumber(form.sleepHours)

      const scores = {
        cannotFallAsleepWithin30: toRequiredInt(form.cannotFallAsleepWithin30, '30 dk içinde uyuyamama', 0, 3),
        wakeToUseBathroom: toRequiredInt(form.wakeToUseBathroom, 'Tuvalet için uyanma', 0, 3),
        // UI: Evet/Hayır checkbox. API expects 0..3.
        // Map: Hayır=0 (Hiç), Evet=1 (1'den az) to stay within the allowed range.
        cannotBreatheComfortably: form.cannotBreatheComfortably ? 1 : 0,
        coughOrSnoreLoudly: form.coughOrSnoreLoudly ? 1 : 0,
        feelTooCold: form.feelTooCold ? 1 : 0,
        feelTooHot: form.feelTooHot ? 1 : 0,
        badDreams: form.badDreams ? 1 : 0,
        pain: form.pain ? 1 : 0,
        subjectiveSleepQuality: toRequiredInt(form.subjectiveSleepQuality, 'Öznel uyku kalitesi', 0, 3),
        sleepMedicationFrequency: toRequiredInt(form.sleepMedicationFrequency, 'Uyku ilacı', 0, 3),
        daytimeSleepinessFrequency: toRequiredInt(form.daytimeSleepinessFrequency, 'Gündüz uykululuk', 0, 3),
        lackOfEnthusiasmProblem: toRequiredInt(form.lackOfEnthusiasmProblem, 'İstek/enerji problemi', 0, 3),
        bedPartnerSituation: toRequiredInt(form.bedPartnerSituation, 'Eş/oda arkadaşı durumu', 0, 3),
      }

      if (latency == null || hours == null) throw new Error('Lütfen sayısal alanları kontrol edin.')

      return upsertMySleepQualityRecord({
        recordDate: toIsoDateTime(form.recordDate),
        usualBedTime: form.usualBedTime.trim(),
        sleepLatencyMinutes: latency,
        usualWakeTime: form.usualWakeTime.trim(),
        sleepHours: hours,
        ...scores,
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      })
    },
    onSuccess: async () => {
      toast.success('Uyku kaydı kaydedildi.')
      await onSaved()
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Uyku kaydı kaydedilemedi.' }))
    },
  })

  const hasErrors = Object.keys(errors).length > 0

  const scoreHint = '0: Hiç, 1: 1’den az, 2: 1-2 kez, 3: 3’ten çok'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Tarih *"
          type="date"
          value={form.recordDate}
          onChange={(e) => setForm((s) => ({ ...s, recordDate: e.target.value }))}
          error={errors.recordDate}
        />
        <Input
          label="1- Geçen ay geceleri genellikle ne zaman yattınız? *"
          type="time"
          value={form.usualBedTime}
          onChange={(e) => setForm((s) => ({ ...s, usualBedTime: e.target.value }))}
          error={errors.usualBedTime}
        />
        <Input
          label="2- Geçen ay geceleri uykuya dalmanıza genellikle ne kadar zaman (dakika) aldı? *"
          type="number"
          min={0}
          max={600}
          value={form.sleepLatencyMinutes}
          onChange={(e) => setForm((s) => ({ ...s, sleepLatencyMinutes: e.target.value }))}
          error={errors.sleepLatencyMinutes}
        />
        <Input
          label="3- Geçen ay sabahları genellikle ne zaman kalktınız? *"
          type="time"
          value={form.usualWakeTime}
          onChange={(e) => setForm((s) => ({ ...s, usualWakeTime: e.target.value }))}
          error={errors.usualWakeTime}
        />
        <Input
          label="4- Geçen ay geceleri kaç saat uyudunuz? *"
          type="number"
          min={0}
          max={24}
          step="0.1"
          value={form.sleepHours}
          onChange={(e) => setForm((s) => ({ ...s, sleepHours: e.target.value }))}
          error={errors.sleepHours}
        />
      </div>

      <p className="text-xs text-surface-500 pt-2">5- Geçen ay aşağıdaki durumlarda belirtilen uyku problemlerini ne sıklıkla yaşadınız? (0-3) ({scoreHint})</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="30 dakika içinde uykuya dalamadınız *" type="number" min={0} max={3} value={form.cannotFallAsleepWithin30} onChange={(e) => setForm((s) => ({ ...s, cannotFallAsleepWithin30: e.target.value }))} error={errors.cannotFallAsleepWithin30} />
        <Input label="Tuvalete gittiniz *" type="number" min={0} max={3} value={form.wakeToUseBathroom} onChange={(e) => setForm((s) => ({ ...s, wakeToUseBathroom: e.target.value }))} error={errors.wakeToUseBathroom} />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">Rahat bir şekilde nefes alıp veremediniz *</label>
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox
              checked={!form.cannotBreatheComfortably}
              onCheckedChange={(v) => {
                if (v) setForm((s) => ({ ...s, cannotBreatheComfortably: false }))
              }}
              label="Hayır"
            />
            <Checkbox
              checked={form.cannotBreatheComfortably}
              onCheckedChange={(v) => {
                if (v) setForm((s) => ({ ...s, cannotBreatheComfortably: true }))
              }}
              label="Evet"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">Öksürdünüz veya gürültülü bir şekilde horladınız *</label>
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox
              checked={!form.coughOrSnoreLoudly}
              onCheckedChange={(v) => {
                if (v) setForm((s) => ({ ...s, coughOrSnoreLoudly: false }))
              }}
              label="Hayır"
            />
            <Checkbox
              checked={form.coughOrSnoreLoudly}
              onCheckedChange={(v) => {
                if (v) setForm((s) => ({ ...s, coughOrSnoreLoudly: true }))
              }}
              label="Evet"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">Aşırı derecede üşüdünüz *</label>
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox
              checked={!form.feelTooCold}
              onCheckedChange={(v) => {
                if (v) setForm((s) => ({ ...s, feelTooCold: false }))
              }}
              label="Hayır"
            />
            <Checkbox
              checked={form.feelTooCold}
              onCheckedChange={(v) => {
                if (v) setForm((s) => ({ ...s, feelTooCold: true }))
              }}
              label="Evet"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">Aşırı derecede sıcaklık hissettiniz *</label>
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox
              checked={!form.feelTooHot}
              onCheckedChange={(v) => {
                if (v) setForm((s) => ({ ...s, feelTooHot: false }))
              }}
              label="Hayır"
            />
            <Checkbox
              checked={form.feelTooHot}
              onCheckedChange={(v) => {
                if (v) setForm((s) => ({ ...s, feelTooHot: true }))
              }}
              label="Evet"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">Kötü rüyalar gördünüz *</label>
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox
              checked={!form.badDreams}
              onCheckedChange={(v) => {
                if (v) setForm((s) => ({ ...s, badDreams: false }))
              }}
              label="Hayır"
            />
            <Checkbox
              checked={form.badDreams}
              onCheckedChange={(v) => {
                if (v) setForm((s) => ({ ...s, badDreams: true }))
              }}
              label="Evet"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">Ağrı duydunuz *</label>
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox
              checked={!form.pain}
              onCheckedChange={(v) => {
                if (v) setForm((s) => ({ ...s, pain: false }))
              }}
              label="Hayır"
            />
            <Checkbox
              checked={form.pain}
              onCheckedChange={(v) => {
                if (v) setForm((s) => ({ ...s, pain: true }))
              }}
              label="Evet"
            />
          </div>
        </div>

        <Input
          label="6- Uyku kalitenizi nasıl değerlendirirsiniz? (0-3) *"
          hint="0: Çok iyi • 1: Oldukça iyi • 2: Oldukça kötü • 3: Çok kötü"
          type="number"
          min={0}
          max={3}
          value={form.subjectiveSleepQuality}
          onChange={(e) => setForm((s) => ({ ...s, subjectiveSleepQuality: e.target.value }))}
          error={errors.subjectiveSleepQuality}
        />

        <Input
          label="7- Uyku ilacı alma sıklığı (0-3) *"
          hint={scoreHint}
          type="number"
          min={0}
          max={3}
          value={form.sleepMedicationFrequency}
          onChange={(e) => setForm((s) => ({ ...s, sleepMedicationFrequency: e.target.value }))}
          error={errors.sleepMedicationFrequency}
        />

        <Input
          label="8- Gündüz uyanık kalmakta zorlanma (0-3) *"
          hint={scoreHint}
          type="number"
          min={0}
          max={3}
          value={form.daytimeSleepinessFrequency}
          onChange={(e) => setForm((s) => ({ ...s, daytimeSleepinessFrequency: e.target.value }))}
          error={errors.daytimeSleepinessFrequency}
        />

        <Input
          label="9- İstekle iş yapmada problem (0-3) *"
          hint="0: Hiç problem oluşturmadı • 1: Çok az • 2: Bir dereceye kadar • 3: Çok büyük"
          type="number"
          min={0}
          max={3}
          value={form.lackOfEnthusiasmProblem}
          onChange={(e) => setForm((s) => ({ ...s, lackOfEnthusiasmProblem: e.target.value }))}
          error={errors.lackOfEnthusiasmProblem}
        />

        <Input
          label="10- Yatak partneri/oda arkadaşı durumu (0-3) *"
          hint="0: Yok • 1: Diğer odada • 2: Aynı odada farklı yatak • 3: Aynı yatak"
          type="number"
          min={0}
          max={3}
          value={form.bedPartnerSituation}
          onChange={(e) => setForm((s) => ({ ...s, bedPartnerSituation: e.target.value }))}
          error={errors.bedPartnerSituation}
        />

        <Input
          label="Diğer nedenler"
          value={form.notes}
          onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
          placeholder="Opsiyonel"
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
