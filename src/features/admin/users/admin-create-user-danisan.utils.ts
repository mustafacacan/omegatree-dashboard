import type { AdminCreateUserForm } from '@/features/admin/users/admin-create-user.types'
import {
  BESLENME_REQUIRED_ERROR,
  buildBeslenmeAnamneziPayload,
  type BeslenmeAnamneziPayload,
} from '@/features/shared/beslenme-anamnezi-form.utils'
import {
  buildIpaqPayload,
  ipaqFormHasInput,
  validateIpaqForm,
  type IpaqFormState,
} from '@/features/shared/ipaq-form.utils'
import {
  ffqFormHasInput,
  validateFfqForm,
  type FoodFrequencyFormState,
} from '@/features/shared/food-frequency-form.utils'
import type { createClient } from '@/services/clients.service'

export type AdminCreateUserDanisanExtras = {
  ipaqForm: IpaqFormState
  ffqItems: FoodFrequencyFormState
  ffqNotes: string
}

export type DanisanOptionalPayloads = {
  anamnezForm?: NonNullable<Parameters<typeof createClient>[0]['anamnezForm']>
  foodConsumptionRecord?: BeslenmeAnamneziPayload
  ipaqPayload?: ReturnType<typeof buildIpaqPayload>
  ffqPayload?: { items: FoodFrequencyFormState; notes: string | null }
}

export function buildDanisanAnamnezForm(
  form: AdminCreateUserForm,
): DanisanOptionalPayloads['anamnezForm'] {
  const age = form.age.trim() ? Number(form.age) : undefined
  const h = form.bodyHeight.trim() ? Number(form.bodyHeight) : undefined
  const w = form.bodyWeight.trim() ? Number(form.bodyWeight) : undefined
  const waist = form.waistCircumference.trim() ? Number(form.waistCircumference) : undefined
  const hip = form.hipCircumference.trim() ? Number(form.hipCircumference) : undefined
  const neck = form.neckCircumference.trim() ? Number(form.neckCircumference) : undefined

  const partial: NonNullable<Parameters<typeof createClient>[0]['anamnezForm']> = {}
  if (age !== undefined && !Number.isNaN(age)) partial.age = Math.round(age)
  if (form.chronicIllness.trim()) partial.chronicIllness = form.chronicIllness.trim()
  if (form.familyChronicIllness.trim()) partial.familyChronicIllness = form.familyChronicIllness.trim()
  if (form.medicationUsed.trim()) partial.medicationUsed = form.medicationUsed.trim()
  if (form.profession.trim()) partial.profession = form.profession.trim()
  if (form.education.trim()) partial.education = form.education.trim()
  if (form.smokingFrequency) partial.smokingFrequency = form.smokingFrequency
  if (form.alcoholFrequency) partial.alcoholFrequency = form.alcoholFrequency
  if (form.alcoholType.trim()) partial.alcoholType = form.alcoholType.trim()
  if (h !== undefined && !Number.isNaN(h)) partial.bodyHeight = h
  if (w !== undefined && !Number.isNaN(w)) partial.bodyWeight = w
  if (waist !== undefined && !Number.isNaN(waist)) partial.waistCircumference = waist
  if (hip !== undefined && !Number.isNaN(hip)) partial.hipCircumference = hip
  if (neck !== undefined && !Number.isNaN(neck)) partial.neckCircumference = neck
  if (form.foodAllergy.trim()) partial.foodAllergy = form.foodAllergy.trim()

  return Object.keys(partial).length ? partial : undefined
}

/** Opsiyonel danışan formları — kısmen doldurulmuşsa doğrular, aksi halde atlar. */
export function resolveDanisanOptionalPayloads(
  form: AdminCreateUserForm,
  extras: AdminCreateUserDanisanExtras,
): { ok: true; payloads: DanisanOptionalPayloads } | { ok: false; message: string } {
  const foodConsumptionRecord = buildBeslenmeAnamneziPayload(form)
  if (foodConsumptionRecord === 'error') {
    return { ok: false, message: BESLENME_REQUIRED_ERROR }
  }

  if (ipaqFormHasInput(extras.ipaqForm)) {
    const ipaqErr = validateIpaqForm(extras.ipaqForm)
    if (ipaqErr) {
      return { ok: false, message: ipaqErr }
    }
  }

  if (ffqFormHasInput(extras.ffqItems, extras.ffqNotes)) {
    const ffqErr = validateFfqForm(extras.ffqItems, 1)
    if (ffqErr) {
      return { ok: false, message: ffqErr }
    }
  }

  const payloads: DanisanOptionalPayloads = {
    anamnezForm: buildDanisanAnamnezForm(form),
    foodConsumptionRecord: foodConsumptionRecord || undefined,
  }

  if (ipaqFormHasInput(extras.ipaqForm)) {
    payloads.ipaqPayload = buildIpaqPayload(extras.ipaqForm)
  }
  if (ffqFormHasInput(extras.ffqItems, extras.ffqNotes)) {
    payloads.ffqPayload = {
      items: extras.ffqItems,
      notes: extras.ffqNotes.trim() || null,
    }
  }

  return { ok: true, payloads }
}
