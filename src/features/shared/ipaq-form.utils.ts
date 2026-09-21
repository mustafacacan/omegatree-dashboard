import type { CreateIpaqRecord, IpaqRecord } from '@/services/ipaq.service'

export type ActivityBlock = {
  days: string
  none: boolean
  hours: string
  minutes: string
  unknown: boolean
}

export type IpaqFormState = {
  vigorous: ActivityBlock
  moderate: ActivityBlock
  walk: ActivityBlock
  sitting: { hours: string; minutes: string; unknown: boolean }
}

const emptyActivity = (): ActivityBlock => ({
  days: '',
  none: false,
  hours: '',
  minutes: '',
  unknown: false,
})

export const EMPTY_IPAQ_FORM: IpaqFormState = {
  vigorous: emptyActivity(),
  moderate: emptyActivity(),
  walk: emptyActivity(),
  sitting: { hours: '', minutes: '', unknown: false },
}

export function recordToIpaqForm(record: IpaqRecord | null | undefined): IpaqFormState {
  return {
    vigorous: {
      days: record?.vigorousDays != null ? String(record.vigorousDays) : '',
      none: Boolean(record?.vigorousNone),
      hours: record?.vigorousHours != null ? String(record.vigorousHours) : '',
      minutes: record?.vigorousMinutes != null ? String(record.vigorousMinutes) : '',
      unknown: Boolean(record?.vigorousUnknown),
    },
    moderate: {
      days: record?.moderateDays != null ? String(record.moderateDays) : '',
      none: Boolean(record?.moderateNone),
      hours: record?.moderateHours != null ? String(record.moderateHours) : '',
      minutes: record?.moderateMinutes != null ? String(record.moderateMinutes) : '',
      unknown: Boolean(record?.moderateUnknown),
    },
    walk: {
      days: record?.walkDays != null ? String(record.walkDays) : '',
      none: Boolean(record?.walkNone),
      hours: record?.walkHours != null ? String(record.walkHours) : '',
      minutes: record?.walkMinutes != null ? String(record.walkMinutes) : '',
      unknown: Boolean(record?.walkUnknown),
    },
    sitting: {
      hours: record?.sittingHours != null ? String(record.sittingHours) : '',
      minutes: record?.sittingMinutes != null ? String(record.sittingMinutes) : '',
      unknown: Boolean(record?.sittingUnknown),
    },
  }
}

function toIntOrNull(v: string): number | null {
  if (!v.trim()) return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}

function activityHasInput(block: ActivityBlock): boolean {
  return block.none || block.unknown || block.days.trim() !== '' || block.hours.trim() !== '' || block.minutes.trim() !== ''
}

export function ipaqFormHasInput(form: IpaqFormState): boolean {
  return (
    activityHasInput(form.vigorous) ||
    activityHasInput(form.moderate) ||
    activityHasInput(form.walk) ||
    form.sitting.unknown ||
    form.sitting.hours.trim() !== '' ||
    form.sitting.minutes.trim() !== ''
  )
}

export function buildIpaqPayload(form: IpaqFormState, clientId?: number): CreateIpaqRecord {
  return {
    ...(clientId != null ? { clientId } : {}),
    vigorousDays: toIntOrNull(form.vigorous.days),
    vigorousNone: form.vigorous.none,
    vigorousHours: toIntOrNull(form.vigorous.hours),
    vigorousMinutes: toIntOrNull(form.vigorous.minutes),
    vigorousUnknown: form.vigorous.unknown,
    moderateDays: toIntOrNull(form.moderate.days),
    moderateNone: form.moderate.none,
    moderateHours: toIntOrNull(form.moderate.hours),
    moderateMinutes: toIntOrNull(form.moderate.minutes),
    moderateUnknown: form.moderate.unknown,
    walkDays: toIntOrNull(form.walk.days),
    walkNone: form.walk.none,
    walkHours: toIntOrNull(form.walk.hours),
    walkMinutes: toIntOrNull(form.walk.minutes),
    walkUnknown: form.walk.unknown,
    sittingHours: toIntOrNull(form.sitting.hours),
    sittingMinutes: toIntOrNull(form.sitting.minutes),
    sittingUnknown: form.sitting.unknown,
  }
}

export function validateIpaqForm(form: IpaqFormState): string | null {
  const checkActivity = (label: string, block: ActivityBlock): string | null => {
    if (block.none) return null
    const days = toIntOrNull(block.days)
    if (days == null || days < 0 || days > 7) return `${label}: haftalık gün sayısı 0–7 arasında olmalı.`
    if (block.unknown) return null
    const hours = toIntOrNull(block.hours)
    const minutes = toIntOrNull(block.minutes)
    if (hours == null && minutes == null) return `${label}: süre (saat/dakika) veya "bilmiyorum" seçin.`
    if (hours != null && (hours < 0 || hours > 24)) return `${label}: saat 0–24 arasında olmalı.`
    if (minutes != null && (minutes < 0 || minutes > 59)) return `${label}: dakika 0–59 arasında olmalı.`
    return null
  }

  if (!form.vigorous.none) {
    const err = checkActivity('Şiddetli aktivite', form.vigorous)
    if (err) return err
  }
  if (!form.moderate.none) {
    const err = checkActivity('Orta aktivite', form.moderate)
    if (err) return err
  }
  if (!form.walk.none) {
    const err = checkActivity('Yürüyüş', form.walk)
    if (err) return err
  }
  if (!form.sitting.unknown) {
    const hours = toIntOrNull(form.sitting.hours)
    const minutes = toIntOrNull(form.sitting.minutes)
    if (hours == null && minutes == null) return 'Oturma süresi: saat/dakika girin veya "bilmiyorum" seçin.'
  }
  return null
}
