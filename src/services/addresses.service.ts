import { api, type ApiRequestConfig } from '@/lib/axios'
import type { components } from '@/types/openapi'

/**
 * Addresses API:
 * - GET  /addresses       → 200: { success, message, data: { totalItems, totalPages, currentPage, items: Address[] } }
 * - POST /addresses       → 201: Address (body: title, country, city, district, street, neighborhood, postalCode?)
 * - GET  /addresses/:id  → 200: Address
 * - PUT  /addresses/:id  → 200: Address (body: same as POST)
 */
type AddressResponse = components['schemas']['AddressResponse']
type CreateAddressBody = components['schemas']['CreateAddress']
type UpdateAddressBody = components['schemas']['UpdateAddress']

export type Address = AddressResponse & {
  no?: string
  fullAddress?: string
}

/** GET /addresses yanıtı */
interface GetAddressesResponse {
  success?: boolean
  message?: string
  data?: {
    totalItems?: number
    totalPages?: number
    currentPage?: number
    items?: Address[]
  }
}

const TITLE_LABELS: Record<string, string> = {
  home: 'Ev',
  work: 'İş',
  other: 'Diğer',
}

/** Adres için görüntü etiketi (title → Türkçe) */
export function getAddressLabel(address: Address): string {
  const t = address.title?.toLowerCase() ?? 'other'
  return TITLE_LABELS[t] ?? address.title ?? 'Diğer'
}

/** Tek satır tam adres metni (API'den fullAddress geliyorsa onu kullanır) */
export function getAddressFullLine(address: Address): string {
  if (address.fullAddress?.trim()) return address.fullAddress.trim()
  const parts = [
    address.street,
    address.no ? `No: ${address.no}` : null,
    address.neighborhood,
    address.district,
    address.city,
    address.postalCode,
    address.country,
  ].filter(Boolean)
  return parts.join(', ')
}

const ADDRESSES_CONFIG: ApiRequestConfig = { skipAuthRedirect: true }

/** Tüm adresleri getir (giriş yapan kullanıcı). 401 alınsa bile oturum kapatılmaz. */
export async function getAddresses(): Promise<Address[]> {
  const { data } = await api.get<GetAddressesResponse>('/addresses', ADDRESSES_CONFIG)
  const items = data?.data?.items
  return Array.isArray(items) ? items : []
}

/** Yeni adres ekle (no, fullAddress backend destekliyorsa gönderilir) */
export async function createAddress(
  body: CreateAddressBody & { no?: string; fullAddress?: string }
): Promise<Address> {
  const { data } = await api.post<Address>('/addresses', body, ADDRESSES_CONFIG)
  return data
}

/** Adres güncelle (no, fullAddress backend destekliyorsa gönderilir) */
export async function updateAddress(
  id: number,
  body: UpdateAddressBody & { no?: string; fullAddress?: string }
): Promise<Address> {
  const { data } = await api.put<Address>(`/addresses/${id}`, body, ADDRESSES_CONFIG)
  return data
}
