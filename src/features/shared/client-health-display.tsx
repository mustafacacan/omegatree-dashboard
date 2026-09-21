import {
  labelBowelIssue,
  labelDefecation,
  labelFrequency,
  labelFfqFrequency,
} from '@/lib/frequency-labels'
import { labelFfqFood } from '@/lib/ffq-food-keys'
import type { ClientDetail } from '@/services/clients.service'
import type { AnamnezForm } from '@/services/anamnez.service'
import type { FoodConsumptionRecord } from '@/services/food-consumption-records.service'
import type { FoodFrequencyRecord } from '@/services/food-frequency.service'
import type { IpaqRecord } from '@/services/ipaq.service'

function dash(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string') return v.trim() ? v : '—'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '—'
  if (typeof v === 'boolean') return v ? 'Evet' : 'Hayır'
  return String(v)
}

export function anamnezDisplayFields(source: AnamnezForm | ClientDetail['anamnezForm'] | undefined) {
  if (!source) return []
  return [
    { label: 'Yaş', value: 'age' in source ? source.age : undefined },
    { label: 'Kronik hastalık', value: 'chronicIllness' in source ? source.chronicIllness : (source as { chronic_illness?: string }).chronic_illness },
    { label: 'Ailede kronik hastalık', value: 'familyChronicIllness' in source ? source.familyChronicIllness : (source as { family_chronic_illness?: string }).family_chronic_illness },
    { label: 'Kullanılan ilaçlar', value: 'medicationUsed' in source ? source.medicationUsed : (source as { medication_used?: string }).medication_used },
    { label: 'Kilo (kg)', value: 'bodyWeight' in source ? source.bodyWeight : (source as { body_weight?: unknown }).body_weight },
    { label: 'Boy (cm)', value: 'bodyHeight' in source ? source.bodyHeight : (source as { body_height?: unknown }).body_height },
    { label: 'Bel çevresi (cm)', value: 'waistCircumference' in source ? source.waistCircumference : (source as { waist_circumference?: unknown }).waist_circumference },
    { label: 'Kalça çevresi (cm)', value: 'hipCircumference' in source ? source.hipCircumference : (source as { hip_circumference?: unknown }).hip_circumference },
    { label: 'Boyun çevresi (cm)', value: 'neckCircumference' in source ? source.neckCircumference : (source as { neck_circumference?: unknown }).neck_circumference },
    { label: 'Sigara sıklığı', value: labelFrequency('smokingFrequency' in source ? source.smokingFrequency : (source as { smokingFrequency?: string }).smokingFrequency) },
    { label: 'Alkol sıklığı', value: labelFrequency('alcoholFrequency' in source ? source.alcoholFrequency : (source as { alcoholFrequency?: string }).alcoholFrequency) },
    { label: 'Alkol türü', value: 'alcoholType' in source ? source.alcoholType : (source as { alcoholType?: string }).alcoholType },
    { label: 'Meslek', value: 'profession' in source ? source.profession : undefined },
    { label: 'Eğitim', value: 'education' in source ? source.education : undefined },
  ].map((f) => ({ ...f, value: dash(f.value) }))
}

export function foodDisplayFields(source: FoodConsumptionRecord | ClientDetail['foodConsumptionRecord'] | undefined) {
  if (!source) return []
  const rec = source as Record<string, unknown>
  return [
    { label: 'Ana öğün / gün', value: rec.mainMealsPerDay ?? rec.main_meals_per_day },
    { label: 'Ara öğün / gün', value: rec.snackMealsPerDay ?? rec.snack_meals_per_day },
    { label: 'Toplam öğün / gün', value: rec.mealsPerDay ?? rec.meals_per_day },
    { label: 'Kaçınılan besinler', value: rec.avoidedFoods ?? rec.avoided_foods },
    { label: 'Kaçınma sebebi', value: rec.avoidedFoodsReason ?? rec.avoided_foods_reason },
    { label: 'Gıda alerjisi', value: rec.foodAllergy ?? rec.food_allergy },
    { label: 'Günlük su (L)', value: rec.dailyWaterLiters ?? rec.daily_water_liters },
    { label: 'Dışarı gün / hafta', value: rec.fastFoodDaysPerWeek ?? rec.fast_food_days_per_week },
    { label: 'Dışarı öğün / hafta', value: rec.fastFoodMealsPerWeek ?? rec.fast_food_meals_per_week },
    { label: 'Tuvalet sıklığı', value: labelDefecation(rec.defecationFrequency ?? rec.defecation_frequency) },
    { label: 'Diyare / konstipasyon', value: labelBowelIssue(rec.bowelIssue ?? rec.bowel_issue) },
    { label: 'Bağırsak sorunu sıklığı', value: labelFrequency(rec.bowelIssueFrequency ?? rec.bowel_issue_frequency) },
    { label: 'GIS hastalığı', value: rec.gastrointestinalDisease ?? rec.gastrointestinal_disease },
    { label: 'Gece yeme alışkanlığı', value: rec.nightEatingHabit ?? rec.night_eating_habit },
    { label: 'Aşırı yeme / suçluluk', value: rec.eatingDisorderBehaviors ?? rec.eating_disorder_behaviors },
    { label: 'Ayrıntı', value: rec.eatingDisorderBehaviorsNote ?? rec.eating_disorder_behaviors_note },
    { label: 'Notlar', value: rec.notes },
  ].map((f) => ({ ...f, value: dash(f.value) }))
}

export function ipaqDisplayFields(record: IpaqRecord | null | undefined) {
  if (!record) return []
  const dur = (h?: number | null, m?: number | null, unknown?: boolean) =>
    unknown ? 'Bilmiyorum' : `${h ?? 0} sa ${m ?? 0} dk`
  return [
    { label: 'Şiddetli aktivite gün', value: record.vigorousNone ? 'Yapmadım' : dash(record.vigorousDays) },
    { label: 'Şiddetli aktivite süre', value: dur(record.vigorousHours, record.vigorousMinutes, record.vigorousUnknown) },
    { label: 'Orta aktivite gün', value: record.moderateNone ? 'Yapmadım' : dash(record.moderateDays) },
    { label: 'Orta aktivite süre', value: dur(record.moderateHours, record.moderateMinutes, record.moderateUnknown) },
    { label: 'Yürüme gün', value: record.walkNone ? 'Yürümedim' : dash(record.walkDays) },
    { label: 'Yürüme süre', value: dur(record.walkHours, record.walkMinutes, record.walkUnknown) },
    { label: 'Oturma süre', value: dur(record.sittingHours, record.sittingMinutes, record.sittingUnknown) },
  ]
}

export function ffqDisplayRows(record: FoodFrequencyRecord | null | undefined) {
  if (!record?.items) return []
  return Object.entries(record.items)
    .filter(([, v]) => v?.frequency)
    .map(([key, v]) => ({
      food: labelFfqFood(key),
      frequency: labelFfqFrequency(v.frequency),
      amount: dash(v.amount),
    }))
}
