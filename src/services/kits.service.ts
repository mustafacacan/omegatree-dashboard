import { api } from '@/lib/axios'
import type { components } from '@/types/openapi'

type KitResponse = components['schemas']['KitResponse']
type CreateKitBody = components['schemas']['CreateKit']
type UpdateKitBody = components['schemas']['UpdateKit']

export interface Kit {
  id: number
  barcode: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

function mapApiKit(apiKit: KitResponse): Kit {
  return {
    id: Number(apiKit.id) ?? 0,
    barcode: apiKit.barcode ?? '',
    name: apiKit.name ?? '',
    isActive: apiKit.isActive ?? true,
    createdAt: apiKit.createdAt ?? new Date().toISOString(),
    updatedAt: apiKit.updatedAt ?? new Date().toISOString(),
  }
}

/** GET /kits — cevap data veya data.items olabilir */
export async function getKits(params?: { page?: number; limit?: number }): Promise<Kit[]> {
  const { data } = await api.get<{
    data?: KitResponse[] | { items?: KitResponse[] }
  }>('/kits', {
    params: params ? { page: params.page ?? 1, limit: params.limit ?? 100 } : undefined,
  })
  const raw = data?.data
  const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'items' in raw ? (raw as { items?: KitResponse[] }).items : []) ?? []
  return (list as KitResponse[]).map(mapApiKit)
}

/** GET /kits/{kitId} */
export async function getKit(kitId: number): Promise<Kit> {
  const { data } = await api.get<KitResponse>(`/kits/${kitId}`)
  const body = (data as { data?: KitResponse })?.data ?? data
  return mapApiKit(body as KitResponse)
}

/** POST /kits */
export async function createKit(payload: { name: string; isActive?: boolean }): Promise<Kit> {
  const { data } = await api.post<{ data?: KitResponse }>('/kits', {
    name: payload.name,
    isActive: payload.isActive ?? true,
  })
  const body = data?.data ?? data
  return mapApiKit(body as KitResponse)
}

/** PUT /kits/{kitId} */
export async function updateKit(
  kitId: number,
  payload: { name?: string; isActive?: boolean }
): Promise<Kit> {
  const { data } = await api.put<{ data?: KitResponse }>(`/kits/${kitId}`, payload)
  const body = data?.data ?? data
  return mapApiKit(body as KitResponse)
}

/** POST /kits/assign/{dieticianId} — diyetisyene kit atar */
export async function assignKitsToDietician(dieticianId: number, kitIds: number[]): Promise<void> {
  await api.post(`/kits/assign/${dieticianId}`, { kitIds })
}
