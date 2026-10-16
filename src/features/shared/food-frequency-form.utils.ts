import { FFQ_FOOD_GROUPS } from '@/lib/ffq-food-keys'
import type { FfqFrequencyValue } from '@/lib/frequency-labels'
import type { FoodFrequencyItem } from '@/services/food-frequency.service'

export type FoodFrequencyFormState = Record<string, FoodFrequencyItem>

export function buildEmptyFfqItems(): FoodFrequencyFormState {
  const out: FoodFrequencyFormState = {}
  for (const group of FFQ_FOOD_GROUPS) {
    for (const item of group.items) {
      out[item.key] = { frequency: '', amount: '' }
    }
  }
  return out
}

export function mergeFfqItems(existing?: Record<string, FoodFrequencyItem> | null): FoodFrequencyFormState {
  const base = buildEmptyFfqItems()
  if (!existing) return base
  for (const [key, val] of Object.entries(existing)) {
    base[key] = {
      frequency: (val?.frequency as FfqFrequencyValue | '' | null | undefined) ?? '',
      amount: val?.amount ?? '',
    }
  }
  return base
}

export function countFilledFfqItems(items: FoodFrequencyFormState): number {
  return Object.values(items).filter((v) => Boolean(v.frequency)).length
}

export function ffqFormHasInput(items: FoodFrequencyFormState, notes = ''): boolean {
  return countFilledFfqItems(items) > 0 || notes.trim() !== ''
}

export type FfqFieldErrors = Record<string, { frequency?: string; amount?: string }>

/** Değerlendirme için her besinin sıklığı zorunlu. Tüketiliyorsa miktar da zorunlu. */
export function getFfqFieldErrors(items: FoodFrequencyFormState): FfqFieldErrors {
  const errors: FfqFieldErrors = {}
  for (const group of FFQ_FOOD_GROUPS) {
    for (const food of group.items) {
      const row = items[food.key]
      const frequency = row?.frequency ?? ''
      if (!frequency) {
        errors[food.key] = { frequency: 'Sıklık zorunludur.' }
        continue
      }
      if (frequency !== 'never' && !String(row?.amount ?? '').trim()) {
        errors[food.key] = { amount: 'Miktar zorunludur.' }
      }
    }
  }
  return errors
}

export function validateFfqForm(items: FoodFrequencyFormState): string | null {
  const missing = Object.keys(getFfqFieldErrors(items)).length
  if (missing === 0) return null
  return `Değerlendirme için tüm besinler zorunludur. ${missing} besin eksik. Tüketmiyorsanız "Tüketmiyor" seçin; tüketiyorsanız miktarı da yazın.`
}
