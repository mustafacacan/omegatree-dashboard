import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { filterPhone } from '@/lib/input-filters'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'

export type CountryDialOption = {
  iso: string
  name: string
  dial: string
  nationalMaxLength: number
}

/** TR-first list; dial codes without '+'. */
export const PHONE_COUNTRY_OPTIONS: CountryDialOption[] = [
  { iso: 'TR', name: 'Türkiye', dial: '90', nationalMaxLength: 10 },
  { iso: 'DE', name: 'Almanya', dial: '49', nationalMaxLength: 11 },
  { iso: 'GB', name: 'Birleşik Krallık', dial: '44', nationalMaxLength: 10 },
  { iso: 'US', name: 'ABD', dial: '1', nationalMaxLength: 10 },
  { iso: 'NL', name: 'Hollanda', dial: '31', nationalMaxLength: 9 },
  { iso: 'AZ', name: 'Azerbaycan', dial: '994', nationalMaxLength: 9 },
]

export function normalizePhoneClient(
  nationalOrFull: string,
  countryDialCode = '90',
): string {
  let digits = String(nationalOrFull ?? '').replace(/\D/g, '')
  const dial = String(countryDialCode ?? '90').replace(/\D/g, '') || '90'
  if (!digits) return ''

  if (digits.startsWith(dial) && digits.length >= dial.length + 8) return digits
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (dial === '90') {
    if (digits.startsWith('0') && digits.length >= 11) return `90${digits.slice(1)}`
    if (digits.length === 10 && digits.startsWith('5')) return `90${digits}`
  }
  const national = digits.startsWith('0') ? digits.slice(1) : digits
  return `${dial}${national}`
}

/** Stored E.164 / legacy → UI dial + national digits */
export function splitPhoneForInput(stored?: string | null): {
  dial: string
  national: string
} {
  const digits = String(stored ?? '').replace(/\D/g, '')
  if (!digits) return { dial: '90', national: '' }

  const dials = [...PHONE_COUNTRY_OPTIONS]
    .map((c) => c.dial)
    .sort((a, b) => b.length - a.length)

  for (const dial of dials) {
    if (digits.startsWith(dial) && digits.length > dial.length) {
      return { dial, national: digits.slice(dial.length) }
    }
  }

  if (digits.startsWith('0') && digits.length >= 11) {
    return { dial: '90', national: digits.slice(1) }
  }

  return { dial: '90', national: digits }
}

export function validateNationalPhone(
  national: string,
  countryDialCode = '90',
): string | null {
  const digits = String(national ?? '').replace(/\D/g, '')
  if (!digits) return 'Telefon numarası zorunludur'
  const dial = String(countryDialCode ?? '90').replace(/\D/g, '') || '90'
  if (dial === '90') {
    const national10 = digits.startsWith('0') ? digits.slice(1) : digits
    if (!/^5\d{9}$/.test(national10)) {
      return 'Geçerli bir Türkiye cep telefonu girin (5XXXXXXXXX)'
    }
    return null
  }
  if (digits.length < 8) return 'Geçerli bir telefon numarası girin'
  return null
}

type PhoneInputProps = {
  label?: string
  error?: string
  value: string
  countryDialCode?: string
  onValueChange: (nationalDigits: string) => void
  onCountryChange?: (dial: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  required?: boolean
}

export function PhoneInput({
  label = 'Telefon',
  error,
  value,
  countryDialCode = '90',
  onValueChange,
  onCountryChange,
  disabled,
  placeholder,
  className,
  required,
}: PhoneInputProps) {
  const country = useMemo(
    () =>
      PHONE_COUNTRY_OPTIONS.find((c) => c.dial === countryDialCode) ??
      PHONE_COUNTRY_OPTIONS[0],
    [countryDialCode],
  )

  const displayPlaceholder =
    placeholder ??
    (country.dial === '90' ? '5XX XXX XX XX' : 'Ulusal numara')

  const maxLen =
    country.dial === '90'
      ? country.nationalMaxLength + 1
      : country.nationalMaxLength

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-medium text-surface-700">
          {label}
          {required ? ' *' : ''}
        </label>
      )}
      <div className="flex gap-2">
        <Select
          value={country.dial}
          onValueChange={(v) => onCountryChange?.(v)}
          disabled={disabled}
        >
          <SelectTrigger className="w-[148px] shrink-0">
            <SelectValue placeholder="+90">+{country.dial}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PHONE_COUNTRY_OPTIONS.map((opt) => (
              <SelectItem key={opt.iso} value={opt.dial}>
                +{opt.dial} {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          disabled={disabled}
          value={value}
          placeholder={displayPlaceholder}
          maxLength={maxLen}
          onChange={(e) => {
            const next = filterPhone(e.target.value).slice(0, maxLen)
            onValueChange(next)
          }}
          className={cn(
            'flex h-10 w-full rounded-md border border-surface-200 bg-panel px-3 py-2 text-sm',
            'placeholder:text-surface-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-danger-500 focus-visible:ring-danger-500',
          )}
        />
      </div>
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  )
}
