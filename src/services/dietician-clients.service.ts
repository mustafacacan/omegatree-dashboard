import { api, type ApiRequestConfig } from '@/lib/axios'
import type { components } from '@/types/openapi'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

type ApiDieticianClientResponse = components['schemas']['DieticianClientResponse']
type ApiGetDieticianFromClient = components['schemas']['GetDieticianFromClient']

export interface DieticianClient {
  id: number
  dieticianId?: number
  dieticianName?: string
  clientId?: number
  clientName?: string
  clientPhone?: string
  clientEmail?: string
  createdAt?: string
}

function mapDieticianClientResponse(item: ApiDieticianClientResponse): DieticianClient {
  return {
    id: item.id ?? 0,
    dieticianId: item.dietician?.id,
    dieticianName: item.dietician ? `${item.dietician.firstName ?? ''} ${item.dietician.lastName ?? ''}`.trim() : undefined,
    clientId: item.client?.id,
    clientName: item.client ? `${item.client.firstName ?? ''} ${item.client.lastName ?? ''}`.trim() : undefined,
    clientPhone: item.client?.phone,
    clientEmail: item.client?.email,
    createdAt: item.createdAt,
  }
}

function mapFromClient(item: ApiGetDieticianFromClient): DieticianClient {
  return {
    id: item.id ?? 0,
    clientId: item.client?.id,
    clientName: item.client ? `${item.client.firstName ?? ''} ${item.client.lastName ?? ''}`.trim() : undefined,
    clientPhone: item.client?.phone,
    clientEmail: item.client?.email,
    createdAt: item.client?.createdAt,
  }
}

/** POST /dietician-clients — diyetisyen-danışan ilişkisi oluştur */
export async function addDieticianToClient(dieticianId: number, clientId: number): Promise<DieticianClient> {
  const { data } = await api.post<ApiDieticianClientResponse>('/dietician-clients', { dieticianId, clientId }, skipAuth)
  return mapDieticianClientResponse(data)
}

/** PUT /dietician-clients/update — ilişkiyi güncelle */
export async function updateDieticianClient(dieticianId: number, clientId: number): Promise<DieticianClient> {
  const { data } = await api.put<ApiDieticianClientResponse>('/dietician-clients/update', { dieticianId, clientId }, skipAuth)
  return mapDieticianClientResponse(data)
}

/** GET /dietician-clients/{dieticianId}/clients — diyetisyenin danışanları */
export async function getDieticianClients(dieticianId: number | string): Promise<DieticianClient[]> {
  const { data } = await api.get<unknown>(`/dietician-clients/${dieticianId}/clients`, skipAuth)
  const list: ApiGetDieticianFromClient[] = Array.isArray(data) ? data : []
  return list.map(mapFromClient)
}

/** DELETE /dietician-clients/remove/{id} — ilişkiyi sil */
export async function removeDieticianClient(relationshipId: number): Promise<void> {
  await api.delete(`/dietician-clients/remove/${relationshipId}`, skipAuth)
}
