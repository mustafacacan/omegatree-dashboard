import {
  type BowelIssueValue,
  type DefecationFrequencyValue,
  type FrequencyValue,
} from '@/lib/frequency-labels'

export type BeslenmeAnamneziFormState = {
  mainMealsPerDay: string
  snackMealsPerDay: string
  avoidedFoods: string
  avoidedFoodsReason: string
  foodAllergy: string
  dailyWaterLiters: string
  fastFoodDaysPerWeek: string
  fastFoodMealsPerWeek: string
  defecationFrequency: DefecationFrequencyValue | ''
  bowelIssue: BowelIssueValue
  bowelIssueFrequency: FrequencyValue | ''
  gastrointestinalDisease: string
  nightEatingHabit: boolean
  eatingDisorderBehaviors: boolean
  eatingDisorderBehaviorsNote: string
  nutritionNotes: string
}

export const EMPTY_BESLENME_ANAMNEZI_FORM: BeslenmeAnamneziFormState = {
  mainMealsPerDay: '',
  snackMealsPerDay: '',
  avoidedFoods: '',
  avoidedFoodsReason: '',
  foodAllergy: '',
  dailyWaterLiters: '',
  fastFoodDaysPerWeek: '',
  fastFoodMealsPerWeek: '',
  defecationFrequency: '',
  bowelIssue: 'none',
  bowelIssueFrequency: '',
  gastrointestinalDisease: '',
  nightEatingHabit: false,
  eatingDisorderBehaviors: false,
  eatingDisorderBehaviorsNote: '',
  nutritionNotes: '',
}

export type BeslenmeAnamneziPayload = {
  mainMealsPerDay: number
  snackMealsPerDay: number
  mealsPerDay: number
  avoidedFoods: string
  avoidedFoodsReason?: string
  foodAllergy: string
  dailyWaterLiters: number
  fastFoodDaysPerWeek: number
  fastFoodMealsPerWeek: number
  defecationFrequency: DefecationFrequencyValue
  bowelIssue: BowelIssueValue
  bowelIssueFrequency?: FrequencyValue
  gastrointestinalDisease: string
  nightEatingHabit: boolean
  eatingDisorderBehaviors: boolean
  eatingDisorderBehaviorsNote?: string
  notes?: string
}

function hasAnyBeslenmeInput(form: BeslenmeAnamneziFormState): boolean {
  return (
    form.mainMealsPerDay.trim() !== '' ||
    form.snackMealsPerDay.trim() !== '' ||
    form.dailyWaterLiters.trim() !== '' ||
    form.defecationFrequency !== '' ||
    form.avoidedFoods.trim() !== '' ||
    form.avoidedFoodsReason.trim() !== '' ||
    form.foodAllergy.trim() !== '' ||
    form.fastFoodDaysPerWeek.trim() !== '' ||
    form.fastFoodMealsPerWeek.trim() !== '' ||
    form.bowelIssue !== 'none' ||
    form.bowelIssueFrequency !== '' ||
    form.gastrointestinalDisease.trim() !== '' ||
    form.nutritionNotes.trim() !== '' ||
    form.eatingDisorderBehaviorsNote.trim() !== '' ||
    form.nightEatingHabit === true ||
    form.eatingDisorderBehaviors === true
  )
}

/** Returns undefined when form untouched; error string when invalid; payload when ok. */
export function buildBeslenmeAnamneziPayload(
  form: BeslenmeAnamneziFormState,
): BeslenmeAnamneziPayload | undefined | 'error' {
  if (!hasAnyBeslenmeInput(form)) return undefined

  const mainMealsPerDay = form.mainMealsPerDay.trim() ? Number(form.mainMealsPerDay) : NaN
  const snackMealsPerDay = form.snackMealsPerDay.trim() ? Number(form.snackMealsPerDay) : NaN
  const dailyWaterLiters = form.dailyWaterLiters.trim() ? Number(form.dailyWaterLiters) : NaN
  const fastFoodDaysPerWeek = form.fastFoodDaysPerWeek.trim() ? Number(form.fastFoodDaysPerWeek) : NaN
  const fastFoodMealsPerWeek = form.fastFoodMealsPerWeek.trim()
    ? Number(form.fastFoodMealsPerWeek)
    : NaN
  const defecationFrequency = form.defecationFrequency
  const bowelIssue = form.bowelIssue || 'none'

  if (
    !Number.isFinite(mainMealsPerDay) ||
    !Number.isFinite(snackMealsPerDay) ||
    !Number.isFinite(dailyWaterLiters) ||
    !Number.isFinite(fastFoodDaysPerWeek) ||
    !Number.isFinite(fastFoodMealsPerWeek) ||
    !defecationFrequency
  ) {
    return 'error'
  }

  if (bowelIssue !== 'none' && !form.bowelIssueFrequency) {
    return 'error'
  }

  return {
    mainMealsPerDay,
    snackMealsPerDay,
    mealsPerDay: mainMealsPerDay + snackMealsPerDay,
    avoidedFoods: form.avoidedFoods.trim() || 'none',
    avoidedFoodsReason: form.avoidedFoodsReason.trim() || undefined,
    foodAllergy: form.foodAllergy.trim() || 'none',
    dailyWaterLiters,
    fastFoodDaysPerWeek,
    fastFoodMealsPerWeek,
    defecationFrequency,
    bowelIssue,
    bowelIssueFrequency:
      bowelIssue !== 'none' && form.bowelIssueFrequency
        ? form.bowelIssueFrequency
        : undefined,
    gastrointestinalDisease: form.gastrointestinalDisease.trim() || 'none',
    nightEatingHabit: Boolean(form.nightEatingHabit),
    eatingDisorderBehaviors: Boolean(form.eatingDisorderBehaviors),
    eatingDisorderBehaviorsNote: form.eatingDisorderBehaviorsNote.trim() || undefined,
    ...(form.nutritionNotes.trim() ? { notes: form.nutritionNotes.trim() } : {}),
  }
}

export const BESLENME_REQUIRED_ERROR =
  'Beslenme anamnezi için zorunlu alanlar: ana/ara öğün, su, dışarı gün/öğün, tuvalet sıklığı'
