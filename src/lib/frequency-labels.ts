/** Turkish labels for frequency / enum values used across forms and read-only views. */

export type FrequencyValue = 'never' | 'rarely' | 'sometimes' | 'often' | 'daily'

export const FREQUENCY_OPTIONS: Array<{ value: FrequencyValue; label: string }> = [
  { value: 'never', label: 'Hiç' },
  { value: 'rarely', label: 'Nadiren' },
  { value: 'sometimes', label: 'Bazen' },
  { value: 'often', label: 'Sık' },
  { value: 'daily', label: 'Her gün' },
]

export const FREQUENCY_LABELS: Record<FrequencyValue, string> = {
  never: 'Hiç',
  rarely: 'Nadiren',
  sometimes: 'Bazen',
  often: 'Sık',
  daily: 'Her gün',
}

export type BowelIssueValue = 'none' | 'diarrhea' | 'constipation' | 'both'

export const BOWEL_ISSUE_OPTIONS: Array<{ value: BowelIssueValue; label: string }> = [
  { value: 'none', label: 'Yok' },
  { value: 'diarrhea', label: 'İshal' },
  { value: 'constipation', label: 'Konstipasyon (kabızlık)' },
  { value: 'both', label: 'Her ikisi' },
]

export const BOWEL_ISSUE_LABELS: Record<BowelIssueValue, string> = {
  none: 'Yok',
  diarrhea: 'İshal',
  constipation: 'Konstipasyon (kabızlık)',
  both: 'Her ikisi',
}

export type DefecationFrequencyValue =
  | 'every_day'
  | 'every_other_day'
  | 'every_2_3_days'
  | 'weekly_1_2'
  | 'irregular'

export const DEFECATION_OPTIONS: Array<{ value: DefecationFrequencyValue; label: string }> = [
  { value: 'every_day', label: 'Her gün' },
  { value: 'every_other_day', label: 'Gün aşırı' },
  { value: 'every_2_3_days', label: '2–3 günde bir' },
  { value: 'weekly_1_2', label: 'Haftada 1–2 kez' },
  { value: 'irregular', label: 'Düzensiz' },
]

export const DEFECATION_LABELS: Record<DefecationFrequencyValue, string> = {
  every_day: 'Her gün',
  every_other_day: 'Gün aşırı',
  every_2_3_days: '2–3 günde bir',
  weekly_1_2: 'Haftada 1–2 kez',
  irregular: 'Düzensiz',
}

export type FfqFrequencyValue =
  | 'every_meal'
  | 'every_day'
  | 'week_3_4'
  | 'week_1_2'
  | 'biweekly'
  | 'monthly'
  | 'never'

export const FFQ_FREQUENCY_OPTIONS: Array<{ value: FfqFrequencyValue; label: string }> = [
  { value: 'every_meal', label: 'Her öğün' },
  { value: 'every_day', label: 'Her gün' },
  { value: 'week_3_4', label: 'Haftada 3–4' },
  { value: 'week_1_2', label: 'Haftada 1–2' },
  { value: 'biweekly', label: '15 günde 1' },
  { value: 'monthly', label: 'Ayda 1' },
  { value: 'never', label: 'Tüketmiyor' },
]

export const FFQ_FREQUENCY_LABELS: Record<FfqFrequencyValue, string> = {
  every_meal: 'Her öğün',
  every_day: 'Her gün',
  week_3_4: 'Haftada 3–4',
  week_1_2: 'Haftada 1–2',
  biweekly: '15 günde 1',
  monthly: 'Ayda 1',
  never: 'Tüketmiyor',
}

export function labelFrequency(value: unknown): string {
  if (value == null || value === '') return '—'
  const key = String(value) as FrequencyValue
  return FREQUENCY_LABELS[key] ?? String(value)
}

export function labelBowelIssue(value: unknown): string {
  if (value == null || value === '') return '—'
  const key = String(value) as BowelIssueValue
  return BOWEL_ISSUE_LABELS[key] ?? String(value)
}

export function labelDefecation(value: unknown): string {
  if (value == null || value === '') return '—'
  const key = String(value) as DefecationFrequencyValue
  return DEFECATION_LABELS[key] ?? String(value)
}

export function labelFfqFrequency(value: unknown): string {
  if (value == null || value === '') return '—'
  const key = String(value) as FfqFrequencyValue
  return FFQ_FREQUENCY_LABELS[key] ?? String(value)
}
