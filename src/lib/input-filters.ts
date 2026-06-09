export type InputFilterKind = 'personName' | 'phone' | 'nationalId' | 'digits'

/** Ad / soyad: harf, boşluk, tire, kesme; rakam yok. */
const PERSON_NAME_INVALID = /[^a-zA-ZçğıöşüÇĞİÖŞÜ\s'.-]/g

export function filterPersonName(value: string): string {
  return value.replace(PERSON_NAME_INVALID, '')
}

/** Telefon: yalnızca rakam, en fazla 15 hane. */
export function filterPhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15)
}

/** T.C. kimlik: yalnızca rakam, en fazla 11 hane. */
export function filterNationalId(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11)
}

/** Yalnızca rakam. */
export function filterDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function applyInputFilter(kind: InputFilterKind, value: string): string {
  switch (kind) {
    case 'personName':
      return filterPersonName(value)
    case 'phone':
      return filterPhone(value)
    case 'nationalId':
      return filterNationalId(value)
    case 'digits':
      return filterDigits(value)
    default:
      return value
  }
}

export function getInputFilterDefaults(kind: InputFilterKind): {
  type?: 'text' | 'tel' | 'number' | 'email' | 'password' | 'search'
  inputMode?: 'text' | 'tel' | 'numeric' | 'email' | 'decimal' | 'search'
  maxLength?: number
  autoComplete?: string
} {
  switch (kind) {
    case 'personName':
      return { inputMode: 'text', autoComplete: 'name' }
    case 'phone':
      return { type: 'tel', inputMode: 'tel', maxLength: 15, autoComplete: 'tel' }
    case 'nationalId':
      return { inputMode: 'numeric', maxLength: 11 }
    case 'digits':
      return { inputMode: 'numeric' }
    default:
      return {}
  }
}
