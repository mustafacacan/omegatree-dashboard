import { UserRole } from '@/utils/constants'
import type { FrequencyValue } from '@/lib/frequency-labels'
import {
  EMPTY_BESLENME_ANAMNEZI_FORM,
  type BeslenmeAnamneziFormState,
} from '@/features/shared/beslenme-anamnezi-form.utils'

export type AdminCreateUserGender = 'male' | 'female'

/** Danışan — opsiyonel sağlık / beslenme alanları */
export type AdminCreateUserDanisanFields = {
  age: string
  chronicIllness: string
  familyChronicIllness: string
  medicationUsed: string
  bodyHeight: string
  bodyWeight: string
  waistCircumference: string
  hipCircumference: string
  neckCircumference: string
  smokingFrequency: '' | FrequencyValue
  alcoholFrequency: '' | FrequencyValue
  alcoholType: string
  profession: string
  education: string
} & BeslenmeAnamneziFormState

/** Tek modal — tüm roller için birleşik form durumu */
export type AdminCreateUserForm = {
  role: UserRole
  firstName: string
  lastName: string
  companyName: string
  email: string
  phone: string
  countryDialCode: string
  gender: AdminCreateUserGender
  identityNumber: string
  vkn: string
  dieticianId: string
  cargofirm: string
  cargoNumber: string
  addressTitle: string
  country: string
  city: string
  district: string
  street: string
  neighborhood: string
  no: string
  postalCode: string
  fullAddress: string
} & AdminCreateUserDanisanFields

const EMPTY_DANISAN_FIELDS: AdminCreateUserDanisanFields = {
  age: '',
  chronicIllness: '',
  familyChronicIllness: '',
  medicationUsed: '',
  bodyHeight: '',
  bodyWeight: '',
  waistCircumference: '',
  hipCircumference: '',
  neckCircumference: '',
  smokingFrequency: '',
  alcoholFrequency: '',
  alcoholType: '',
  profession: '',
  education: '',
  ...EMPTY_BESLENME_ANAMNEZI_FORM,
}

export const ADMIN_CREATABLE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.DIETITIAN,
  UserRole.DANISAN,
  UserRole.LAB,
  UserRole.SPECIALIST,
]

export function emptyAdminCreateUserForm(role: UserRole = UserRole.ADMIN): AdminCreateUserForm {
  return {
    role,
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    countryDialCode: '90',
    gender: 'male',
    identityNumber: '',
    vkn: '',
    dieticianId: '',
    cargofirm: '',
    cargoNumber: '',
    addressTitle: 'work',
    country: 'Turkiye',
    city: '',
    district: '',
    street: '',
    neighborhood: '',
    no: '',
    postalCode: '',
    fullAddress: '',
    ...EMPTY_DANISAN_FIELDS,
  }
}

export function roleUsesCompanyName(role: UserRole): boolean {
  return role === UserRole.DIETITIAN || role === UserRole.LAB || role === UserRole.SPECIALIST
}

export function roleRequiresCompanyName(role: UserRole): boolean {
  return role === UserRole.LAB
}
