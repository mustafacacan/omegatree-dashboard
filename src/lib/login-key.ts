import {
  normalizeNationalPhoneDigits,
  TR_NATIONAL_PHONE_LENGTH,
} from '@/components/shared/phone-input'

const EMAIL_LIKE = /@/

/** Giriş alanı — e-posta veya telefon. 0 / 90 önekli 10 hane, ya da kayıtlı daha uzun numara. */
export function validateLoginKey(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'E-posta veya telefon girin'

  if (EMAIL_LIKE.test(trimmed)) {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    return ok ? null : 'Geçerli bir e-posta girin'
  }

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < TR_NATIONAL_PHONE_LENGTH) {
    return `Telefon numarası en az ${TR_NATIONAL_PHONE_LENGTH} hane olmalıdır`
  }
  if (digits.length > 15) return 'Telefon numarası çok uzun'

  const national = normalizeNationalPhoneDigits(trimmed, '90')
  if (national.length === TR_NATIONAL_PHONE_LENGTH && !/^5\d{9}$/.test(national)) {
    return 'Telefon numarası 5 ile başlamalıdır'
  }
  return null
}

/**
 * API'ye gönderilecek loginKey.
 * E-posta küçük harfe çevrilir. 10 haneli cep numarası +90 ile gider; daha uzun numara olduğu gibi rakamlara indirgenir.
 */
export function prepareLoginKeyForApi(loginKey: string): string {
  const trimmed = loginKey.trim()
  if (!trimmed) return trimmed
  if (EMAIL_LIKE.test(trimmed)) {
    return trimmed.toLowerCase()
  }
  const national = normalizeNationalPhoneDigits(trimmed, '90')
  if (national.length === TR_NATIONAL_PHONE_LENGTH && /^5\d{9}$/.test(national)) {
    return `+90${national}`
  }
  const digits = trimmed.replace(/\D/g, '')
  return digits || trimmed.replace(/\s/g, '')
}

/** Telefon girişinden son 10 hane (backend ile aynı mantık, test/diagnostic). */
export function extractLoginPhoneSuffix10(loginKey: string): string {
  const digits = loginKey.replace(/\D/g, '')
  if (!digits) return ''
  const national = normalizeNationalPhoneDigits(loginKey, '90')
  if (national.length >= TR_NATIONAL_PHONE_LENGTH) {
    return national.slice(-TR_NATIONAL_PHONE_LENGTH)
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(-TR_NATIONAL_PHONE_LENGTH)
  }
  return national.length === TR_NATIONAL_PHONE_LENGTH ? national : ''
}
