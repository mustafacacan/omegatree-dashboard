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
  return Object.values(items).filter((v) => v.frequency && v.frequency !== 'never').length
}

export function ffqFormHasInput(items: FoodFrequencyFormState, notes = ''): boolean {
  return countFilledFfqItems(items) > 0 || notes.trim() !== ''
}

export function validateFfqForm(items: FoodFrequencyFormState, minFilled = 1): string | null {
  if (countFilledFfqItems(items) < minFilled) {
    return `En az ${minFilled} besin için tüketim sıklığı seçmelisiniz.`
  }
  return null
}
