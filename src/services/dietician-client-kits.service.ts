import { api, type ApiRequestConfig } from '@/lib/axios'
import type { components } from '@/types/openapi'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

type ApiDieticianKitResponse = components['schemas']['DieticianKitResponse']

export interface DieticianClientKit {
  id: number
  dieticianId?: number
  dieticianName?: string
  kitId?: number
  kitBarcode?: string
  kitName?: string
  clientId?: number
  clientName?: string
  status?: 'in_client' | 'in_laboratory' | 'in_expert' | 'delivered' | 'cancelled' | 'completed'
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

function mapApiKit(item: ApiDieticianKitResponse): DieticianClientKit {
  return {
    id: item.id,
    dieticianId: item.dieticianId?.id,
    dieticianName: item.dieticianId
      ? `${item.dieticianId.firstName ?? ''} ${item.dieticianId.lastName ?? ''}`.trim()
      : undefined,
    kitId: item.kitId?.id,
    kitBarcode: item.kitId?.barcode,
    kitName: item.kitId?.name,
    clientId: item.clientId?.id,
    clientName: item.clientId
      ? `${item.clientId.firstName ?? ''} ${item.clientId.lastName ?? ''}`.trim()
      : undefined,
    status: item.status,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

/** GET /dietician-client-kits */
export async function getDieticianClientKits(page?: number): Promise<DieticianClientKit[]> {
  const { data } = await api.get<unknown>('/dietician-client-kits', {
    ...skipAuth,
    params: { page: page ?? 1, limit: 200 },
  })

  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const payload = top && 'data' in top ? top.data : data
  const list: ApiDieticianKitResponse[] = Array.isArray(payload) ? payload : []
  return list.map(mapApiKit)
}

/** GET /dietician-client-kits/{id} */
export async function getDieticianClientKitById(id: number | string): Promise<DieticianClientKit> {
  const { data } = await api.get<unknown>(`/dietician-client-kits/${id}`, skipAuth)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as ApiDieticianKitResponse
  return mapApiKit(item)
}

/** POST /dietician-client-kits — kit ata */
export async function createDieticianClientKit(kitId: number): Promise<DieticianClientKit> {
  const { data } = await api.post<unknown>('/dietician-client-kits', { kitId }, skipAuth)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as ApiDieticianKitResponse
  return mapApiKit(item)
}

/** PUT /dietician-client-kits/{id} — güncelle */
export async function updateDieticianClientKit(
  id: number | string,
  payload: { kitId?: number; status?: DieticianClientKit['status'] }
): Promise<void> {
  await api.put(`/dietician-client-kits/${id}`, payload, skipAuth)
}

/** DELETE /dietician-client-kits/{id} */
export async function deleteDieticianClientKit(id: number | string): Promise<void> {
  await api.delete(`/dietician-client-kits/${id}`, skipAuth)
}

/** POST /dietician-client-kits/send-kit-laboratory — laboratuvara gönder */
export async function sendKitToLaboratory(kitId: number): Promise<void> {
  await api.post('/dietician-client-kits/send-kit-laboratory', { id: kitId }, skipAuth)
}
