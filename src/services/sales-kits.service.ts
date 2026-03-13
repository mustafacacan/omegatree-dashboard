import { api } from '@/lib/axios'
import type { components } from '@/types/openapi'

type SalesKitResponse = components['schemas']['SalesKitResponse']

export interface SalesKit {
  id: number
  name: string
  description?: string
  quantity: number
  price: number
  /** Backend may expose this as isActive/is_active; if undefined, assume active on UI */
  isActive?: boolean
  imageData?: {
    id: number
    url: string
    file: string
    mimeType: string
  }
}

/** API imageData: { id, url, filename, mimetype } — bu url'ü ekrana basıyoruz */
function getImageUrlFromApiKit(raw: Record<string, unknown>): string | undefined {
  const imageData = raw.imageData ?? raw.image_data
  if (imageData && typeof imageData === 'object' && imageData !== null && 'url' in imageData) {
    const url = (imageData as { url?: string }).url
    if (typeof url === 'string' && url.trim()) return url.trim()
  }
  const image = raw.image
  if (typeof image === 'string' && image.trim()) return image.trim()
  if (image && typeof image === 'object' && image !== null && 'url' in image) {
    const url = (image as { url?: string }).url
    if (typeof url === 'string' && url.trim()) return url.trim()
  }
  if (typeof raw.imageUrl === 'string' && raw.imageUrl.trim()) return (raw.imageUrl as string).trim()
  return undefined
}

function mapApiKit(apiKit: SalesKitResponse | Record<string, unknown>): SalesKit {
  const raw = apiKit as Record<string, unknown>
  const isActiveRaw = raw.isActive ?? raw.is_active ?? raw.active
  const isActive = typeof isActiveRaw === 'boolean'
    ? isActiveRaw
    : typeof isActiveRaw === 'number'
      ? isActiveRaw === 1
      : typeof isActiveRaw === 'string'
        ? ['true', '1', 'active', 'yes'].includes(isActiveRaw.trim().toLowerCase())
        : undefined
  const imageDataObj = raw.imageData ?? raw.image_data
  const imageUrl = getImageUrlFromApiKit(raw)
  const imageDataIdRaw =
    typeof imageDataObj === 'object' && imageDataObj !== null && 'id' in imageDataObj
      ? (imageDataObj as { id?: unknown }).id
      : undefined
  const imageDataIdNum = Number(imageDataIdRaw)
  const id = Number.isFinite(imageDataIdNum) ? imageDataIdNum : 0
  const file = typeof imageDataObj === 'object' && imageDataObj !== null
    ? String(
      (imageDataObj as { file?: unknown; filename?: unknown }).file ??
      (imageDataObj as { file?: unknown; filename?: unknown }).filename ??
      ''
    )
    : ''
  const mimeType = typeof imageDataObj === 'object' && imageDataObj !== null
    ? String(
      (imageDataObj as { mimeType?: unknown; mimetype?: unknown }).mimeType ??
      (imageDataObj as { mimeType?: unknown; mimetype?: unknown }).mimetype ??
      ''
    )
    : ''

  const kitIdNum = Number(raw.id)
  const quantityNum = Number(raw.quantity)
  const priceNum = Number(raw.price)
  return {
    id: Number.isFinite(kitIdNum) ? kitIdNum : 0,
    name: (raw.name as string) ?? '',
    description: raw.description as string | undefined,
    quantity: Number.isFinite(quantityNum) ? quantityNum : 0,
    price: Number.isFinite(priceNum) ? priceNum : 0,
    isActive,
    imageData: imageUrl
      ? { id, url: imageUrl, file, mimeType }
      : undefined,
  }
}

/** Görsel URL'si: API'den gelen imageData.url (tam veya relative) kullanılır */
export function getSalesKitImageUrl(url: string | undefined): string | null {
  if (!url || typeof url !== 'string' || !url.trim()) return null
  const u = url.trim()
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3005/api'
  const base = String(apiBase).replace(/\/api\/?$/, '')
  if (u.startsWith('undefined') || u.startsWith('undefined/')) {
    const fixed = u.replace(/^undefined\/?/, '/')
    return `${base}${fixed.startsWith('/') ? '' : '/'}${fixed}`
  }
  return `${base}${u.startsWith('/') ? '' : '/'}${u}`
}

/** Backend dönüşü: { data: [...] } veya { data: { items: [...] } } */
export async function getSalesKits(): Promise<SalesKit[]> {
  const { data } = await api.get<
    SalesKitResponse[] | { success?: boolean; message?: string; data?: SalesKitResponse[] | { items?: SalesKitResponse[] } }
  >('/sales-kits')
  let list: unknown[] = []
  if (Array.isArray(data)) {
    list = data
  } else if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data?: SalesKitResponse[] | { items?: SalesKitResponse[] } }).data
    if (Array.isArray(inner)) list = inner
    else if (inner && typeof inner === 'object' && Array.isArray((inner as { items?: SalesKitResponse[] }).items)) {
      list = (inner as { items: SalesKitResponse[] }).items
    }
  }
  return (list as SalesKitResponse[]).map(mapApiKit)
}

export async function createSalesKit(payload: {
  name: string
  description?: string
  quantity: number
  price: number
  file?: File
}): Promise<SalesKit> {
  const form = new FormData()
  form.append('name', payload.name)
  if (payload.description != null && payload.description !== '') form.append('description', payload.description)
  form.append('quantity', String(payload.quantity))
  form.append('price', String(payload.price))
  if (payload.file) form.append('file', payload.file)

  const { data } = await api.post<SalesKitResponse | { success?: boolean; message?: string; data?: SalesKitResponse }>('/sales-kits', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  const body = (data && typeof data === 'object' && 'data' in data ? (data as { data?: SalesKitResponse }).data : null) ?? data
  return mapApiKit(body as SalesKitResponse)
}

export async function updateSalesKit(
  id: number,
  payload: {
    name?: string
    description?: string
    quantity?: number
    price?: number
    isActive?: boolean
    file?: File
  }
): Promise<SalesKit> {
  const form = new FormData()
  if (payload.name != null) form.append('name', payload.name)
  if (payload.description != null) form.append('description', payload.description)
  if (payload.quantity != null) form.append('quantity', String(payload.quantity))
  if (payload.price != null) form.append('price', String(payload.price))
  if (payload.isActive != null) form.append('isActive', String(payload.isActive))
  if (payload.file) form.append('file', payload.file)

  const { data } = await api.put<SalesKitResponse | { success?: boolean; message?: string; data?: SalesKitResponse }>(`/sales-kits/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  const body = (data && typeof data === 'object' && 'data' in data ? (data as { data?: SalesKitResponse }).data : null) ?? data
  return mapApiKit(body as SalesKitResponse)
}

/** DELETE /sales-kits/{id} — remove a sales kit */
export async function deleteSalesKit(id: number): Promise<void> {
  await api.delete(`/sales-kits/${id}`)
}
