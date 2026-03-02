import { api } from '@/lib/axios'
import type { components } from '@/types/openapi'

type SalesKitResponse = components['schemas']['SalesKitResponse']

export interface SalesKit {
  id: number
  name: string
  description?: string
  quantity: number
  price: number
  imageData?: {
    id: number
    url: string
    file: string
    mimeType: string
  }
}

/** API'den gelen ham objede görsel URL'si imageData.url, image (obje veya string) veya imageUrl olabilir */
function getImageUrlFromApiKit(raw: Record<string, unknown>): string | undefined {
  const imageData = raw.imageData ?? raw.image_data
  if (imageData && typeof imageData === 'object' && imageData !== null && 'url' in imageData) {
    const url = (imageData as { url?: string }).url
    if (typeof url === 'string' && url.trim()) return url
  }
  const image = raw.image
  if (typeof image === 'string' && image.trim()) return image.trim()
  if (image && typeof image === 'object' && image !== null && 'url' in image) {
    const url = (image as { url?: string }).url
    if (typeof url === 'string' && url.trim()) return url
  }
  if (typeof raw.imageUrl === 'string' && raw.imageUrl.trim()) return raw.imageUrl as string
  return undefined
}

function mapApiKit(apiKit: SalesKitResponse | Record<string, unknown>): SalesKit {
  const raw = apiKit as Record<string, unknown>
  const imageUrl = getImageUrlFromApiKit(raw)
  const imageDataObj = raw.imageData ?? raw.image_data
  return {
    id: Number(raw.id) ?? 0,
    name: (raw.name as string) ?? '',
    description: raw.description as string | undefined,
    quantity: Number(raw.quantity) ?? 0,
    price: Number(raw.price) ?? 0,
    imageData: imageUrl
      ? {
          id: typeof imageDataObj === 'object' && imageDataObj !== null && 'id' in imageDataObj
            ? Number((imageDataObj as { id: unknown }).id) ?? 0
            : 0,
          url: imageUrl,
          file:
            typeof imageDataObj === 'object' && imageDataObj !== null
              ? String(
                  (imageDataObj as { file?: unknown; filename?: unknown }).file ??
                  (imageDataObj as { file?: unknown; filename?: unknown }).filename ??
                  ''
                )
              : '',
          mimeType:
            typeof imageDataObj === 'object' && imageDataObj !== null
              ? String(
                  (imageDataObj as { mimeType?: unknown; mimetype?: unknown }).mimeType ??
                  (imageDataObj as { mimeType?: unknown; mimetype?: unknown }).mimetype ??
                  ''
                )
              : '',
        }
      : undefined,
  }
}

/** Görsel URL'si API'den tam veya relative gelebilir; "undefined" on eki backend hatasinda duzeltilir */
export function getSalesKitImageUrl(url: string | undefined): string | null {
  if (!url?.trim()) return null
  let u = url.trim()
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3005/api'
  const base = String(apiBase).replace(/\/api\/?$/, '')
  if (u.startsWith('undefined') || u.startsWith('undefined/')) {
    u = u.replace(/^undefined\/?/, '/')
  }
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  return `${base}${u.startsWith('/') ? '' : '/'}${u}`
}

/** Backend dönüşü: { success, message, data: [...] } veya doğrudan [...] */
export async function getSalesKits(): Promise<SalesKit[]> {
  const { data } = await api.get<SalesKitResponse[] | { success?: boolean; message?: string; data?: SalesKitResponse[] }>('/sales-kits')
  const list = Array.isArray(data)
    ? data
    : (data && typeof data === 'object' && 'data' in data ? (data as { data?: SalesKitResponse[] }).data : null) ?? []
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
    file?: File
  }
): Promise<SalesKit> {
  const form = new FormData()
  if (payload.name != null) form.append('name', payload.name)
  if (payload.description != null) form.append('description', payload.description)
  if (payload.quantity != null) form.append('quantity', String(payload.quantity))
  if (payload.price != null) form.append('price', String(payload.price))
  if (payload.file) form.append('file', payload.file)

  const { data } = await api.put<SalesKitResponse | { success?: boolean; message?: string; data?: SalesKitResponse }>(`/sales-kits/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  const body = (data && typeof data === 'object' && 'data' in data ? (data as { data?: SalesKitResponse }).data : null) ?? data
  return mapApiKit(body as SalesKitResponse)
}
