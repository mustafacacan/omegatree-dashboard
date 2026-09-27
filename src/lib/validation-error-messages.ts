/** Backend Joi alan anahtarları → danışan/yönetici formlarında görünen etiketler */
const FIELD_LABELS: Record<string, string> = {
  food_allergy: 'Gıda alerjisi',
  foodAllergy: 'Gıda alerjisi',
  chronic_illness: 'Kronik hastalık',
  family_chronic_illness: 'Ailede kronik hastalık',
  medication_used: 'Kullanılan ilaç',
  body_weight: 'Kilo (kg)',
  body_height: 'Boy (cm)',
  waist_circumference: 'Bel çevresi (cm)',
  hip_circumference: 'Kalça çevresi (cm)',
  neck_circumference: 'Boyun çevresi (cm)',
  profession: 'Meslek',
  education: 'Eğitim',
  age: 'Yaş',
  smokingFrequency: 'Sigara kullanımı',
  alcoholFrequency: 'Alkol kullanımı',
  alcoholType: 'Alkol türü',
  mainMealsPerDay: 'Ana öğün sayısı',
  snackMealsPerDay: 'Ara öğün sayısı',
  mealsPerDay: 'Günlük öğün sayısı',
  avoidedFoods: 'Kaçınılan besinler',
  avoidedFoodsReason: 'Kaçınma nedeni',
  dailyWaterLiters: 'Günlük su tüketimi (L)',
  fastFoodDaysPerWeek: 'Dışarıda yemek (haftalık gün)',
  fastFoodMealsPerWeek: 'Dışarıda yemek (haftalık öğün)',
  defecationFrequency: 'Tuvalet alışkanlığı',
  bowelIssue: 'Bağırsak şikayeti',
  bowelIssueFrequency: 'Bağırsak şikayeti sıklığı',
  gastrointestinalDisease: 'Gastrointestinal hastalık',
  nightEatingHabit: 'Gece yeme alışkanlığı',
  eatingDisorderBehaviors: 'Yeme bozukluğu davranışları',
  recordDate: 'Kayıt tarihi',
  usualBedTime: 'Yatış saati',
  sleepLatencyMinutes: 'Uykuya dalma süresi (dk)',
  usualWakeTime: 'Kalkış saati',
  sleepHours: 'Uyku süresi (saat)',
  subjectiveSleepQuality: 'Öznel uyku kalitesi',
  firstName: 'Ad',
  lastName: 'Soyad',
  phone: 'Telefon',
  email: 'E-posta',
}

function labelForFieldKey(key: string): string {
  return FIELD_LABELS[key] ?? key
}

function translateSingleValidationFragment(fragment: string): string {
  const trimmed = fragment.trim()
  if (!trimmed) return ''

  let m = trimmed.match(/^"([^"]+)" is required$/)
  if (m) return `${labelForFieldKey(m[1])} zorunludur.`

  m = trimmed.match(/^"([^"]+)" must be a number$/)
  if (m) return `${labelForFieldKey(m[1])} geçerli bir sayı olmalıdır.`

  m = trimmed.match(/^"([^"]+)" must be a string$/)
  if (m) return `${labelForFieldKey(m[1])} metin olmalıdır.`

  m = trimmed.match(/^"([^"]+)" must be a boolean$/)
  if (m) return `${labelForFieldKey(m[1])} evet/hayır olarak seçilmelidir.`

  m = trimmed.match(/^"([^"]+)" must be a valid date$/)
  if (m) return `${labelForFieldKey(m[1])} geçerli bir tarih olmalıdır.`

  m = trimmed.match(/^"([^"]+)" must be one of \[([^\]]+)\]$/)
  if (m) return `${labelForFieldKey(m[1])} geçerli bir seçenek değil.`

  if (/[ğüşıöçĞÜŞİÖÇ]/.test(trimmed) || trimmed.includes('zorunludur')) {
    return trimmed
  }

  const bareKey = trimmed.match(/^([a-zA-Z_][\w.]*) is required$/)
  if (bareKey) return `${labelForFieldKey(bareKey[1])} zorunludur.`

  return trimmed
}

/** Virgülle birleştirilmiş Joi mesajlarını Türkçeleştirir */
export function humanizeValidationErrorMessage(message: string): string {
  if (!message.trim()) return message

  const parts = message.split(/,\s*/).map(translateSingleValidationFragment).filter(Boolean)
  const unique = [...new Set(parts)]
  if (unique.length === 0) return message
  return unique.join(' ')
}

export function looksLikeValidationError(message: string): boolean {
  const s = message.toLowerCase()
  return (
    s.includes(' is required') ||
    s.includes(' must be ') ||
    s.includes('zorunludur') ||
    s.includes('geçerli bir')
  )
}
