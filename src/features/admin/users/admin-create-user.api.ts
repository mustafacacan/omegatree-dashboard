import { UserRole } from '@/utils/constants'
import { createClient } from '@/services/clients.service'
import { createDietician } from '@/services/dieticians.service'
import { createLaboratory } from '@/services/laboratories.service'
import { createUser } from '@/services/users.service'
import type { AdminCreateUserForm } from '@/features/admin/users/admin-create-user.types'
import { validateAdminCreateUserForm } from '@/features/admin/users/admin-create-user.validation'
import {
  resolveDanisanOptionalPayloads,
  type AdminCreateUserDanisanExtras,
} from '@/features/admin/users/admin-create-user-danisan.utils'
import { upsertFoodConsumptionRecord } from '@/services/food-consumption-records.service'
import { upsertIpaqRecord } from '@/services/ipaq.service'
import { upsertFoodFrequencyRecord } from '@/services/food-frequency.service'
import { EMPTY_IPAQ_FORM } from '@/features/shared/ipaq-form.utils'
import { buildEmptyFfqItems } from '@/features/shared/food-frequency-form.utils'
import { getApiErrorMessage } from '@/lib/api-error'

export type CreateAdminUserResult = {
  followUpErrors: string[]
}

const DIETICIAN_NONE = '__none__'

function buildLaboratoryAddress(form: AdminCreateUserForm) {
  const streetVal = form.street.trim() || '-'
  const neighborhoodVal = form.neighborhood.trim() || '-'
  const noVal = form.no.trim()
  const cityVal = form.city.trim()
  const districtVal = form.district.trim()
  const countryVal = form.country.trim() || 'Turkiye'
  const autoFull =
    form.fullAddress.trim() ||
    [
      streetVal !== '-' ? streetVal : null,
      noVal ? `No:${noVal}` : null,
      neighborhoodVal !== '-' ? neighborhoodVal : null,
      districtVal,
      cityVal,
      countryVal,
    ]
      .filter(Boolean)
      .join(', ')

  return {
    title: form.addressTitle || 'work',
    country: countryVal,
    city: cityVal,
    district: districtVal,
    street: streetVal,
    neighborhood: neighborhoodVal,
    no: noVal || undefined,
    fullAddress: autoFull,
    postalCode: form.postalCode.trim() || '00000',
  }
}

/** Rol bazlı doğru backend endpoint'ine yönlendirir. */
export async function createAdminUserByRole(
  form: AdminCreateUserForm,
  danisanExtras?: AdminCreateUserDanisanExtras,
): Promise<CreateAdminUserResult | void> {
  const validation = validateAdminCreateUserForm(form)
  if (!validation.ok) {
    throw new Error(validation.message)
  }

  const phoneDigits = form.phone.replace(/\D/g, '')
  const email = form.email.trim() || undefined
  const identityNumber = form.identityNumber.trim() || undefined

  switch (form.role) {
    case UserRole.DANISAN: {
      const dieticianId =
        form.dieticianId && form.dieticianId !== DIETICIAN_NONE
          ? Number(form.dieticianId)
          : undefined

      const resolved = resolveDanisanOptionalPayloads(
        form,
        danisanExtras ?? {
          ipaqForm: EMPTY_IPAQ_FORM,
          ffqItems: buildEmptyFfqItems(),
          ffqNotes: '',
        },
      )
      if (!resolved.ok) {
        throw new Error(resolved.message)
      }
      const { anamnezForm, foodConsumptionRecord, ipaqPayload, ffqPayload } = resolved.payloads

      const created = await createClient({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: phoneDigits,
        countryDialCode: form.countryDialCode || '90',
        email,
        gender: form.gender,
        identityNumber,
        ...(Number.isFinite(dieticianId) ? { dieticianId } : {}),
        ...(anamnezForm ? { anamnezForm } : {}),
      })

      const followUpErrors: string[] = []
      if (foodConsumptionRecord) {
        try {
          await upsertFoodConsumptionRecord({
            clientId: created.id,
            ...foodConsumptionRecord,
          })
        } catch (err: unknown) {
          followUpErrors.push(getApiErrorMessage(err, { fallback: 'Beslenme formu kaydedilemedi' }))
        }
      }
      if (ipaqPayload) {
        try {
          await upsertIpaqRecord({ ...ipaqPayload, clientId: created.id })
        } catch (err: unknown) {
          followUpErrors.push(getApiErrorMessage(err, { fallback: 'IPAQ kaydedilemedi' }))
        }
      }
      if (ffqPayload) {
        try {
          await upsertFoodFrequencyRecord({ ...ffqPayload, clientId: created.id })
        } catch (err: unknown) {
          followUpErrors.push(
            getApiErrorMessage(err, { fallback: 'Besin tüketim sıklığı kaydedilemedi' }),
          )
        }
      }
      return followUpErrors.length ? { followUpErrors } : undefined
    }
    case UserRole.DIETITIAN: {
      await createDietician({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        companyName: form.companyName.trim() || undefined,
        phone: phoneDigits,
        countryDialCode: form.countryDialCode || '90',
        email,
        gender: form.gender,
        vkn: form.vkn.trim() || undefined,
      })
      return
    }
    case UserRole.LAB: {
      await createLaboratory({
        companyName: form.companyName.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: phoneDigits,
        countryDialCode: form.countryDialCode || '90',
        gender: form.gender,
        email,
        identityNumber,
        cargofirm: form.cargofirm.trim(),
        cargoNumber: form.cargoNumber.trim(),
        address: buildLaboratoryAddress(form),
      })
      return
    }
    case UserRole.ADMIN:
    case UserRole.SPECIALIST:
    default: {
      await createUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: phoneDigits,
        countryDialCode: form.countryDialCode || '90',
        email,
        role: form.role,
        gender: form.gender,
        companyName:
          form.role === UserRole.SPECIALIST ? form.companyName.trim() || undefined : undefined,
        identityNumber,
      })
    }
  }
}
