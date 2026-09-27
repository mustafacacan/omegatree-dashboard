import {
  normalizeNationalPhoneDigits,
  TR_NATIONAL_PHONE_LENGTH,
  validateNationalPhone,
} from '@/components/shared/phone-input'

const EMAIL_LIKE = /@/

/** Giriş alanı — e-posta veya telefon (10 hane, isteğe bağlı baştaki 0 veya 90). */
export function validateLoginKey(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'E-posta veya telefon girin'

  if (EMAIL_LIKE.test(trimmed)) {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    return ok ? null : 'Geçerli bir e-posta girin'
  }

  return validateNationalPhone(trimmed, '90')
}

/** API'ye gönderilecek loginKey — boşlukları temizler, e-postayı küçük harfe çevirir. */
export function prepareLoginKeyForApi(loginKey: string): string {
  const trimmed = loginKey.trim()
  if (!trimmed) return trimmed
  if (EMAIL_LIKE.test(trimmed)) {
    return trimmed.toLowerCase()
  }
  return trimmed.replace(/\s/g, '')
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
