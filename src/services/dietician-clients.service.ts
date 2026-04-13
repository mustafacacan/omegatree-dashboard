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

export interface DieticianClientsByDieticianItem {
  id: number
  dieticianId?: number
  clientId?: number
  clientUserId?: number
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  createdAt?: string
}

export interface DieticianClientsByDieticianResponse {
  totalItems: number
  totalPages: number
  currentPage: number
  items: DieticianClientsByDieticianItem[]
}

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) ? n : fallback
}

/** GET /dieticians/get-clients-by-dietician — authenticated diyetisyenin danışanları (paginated) */
export async function getClientsByDietician(params?: {
  page?: number
  limit?: number
  search?: string
}): Promise<DieticianClientsByDieticianResponse> {
  const { data } = await api.get<unknown>('/dieticians/get-clients-by-dietician', {
    ...skipAuth,
    params: {
      ...(params?.page ? { page: params.page } : { page: 1 }),
      ...(params?.limit ? { limit: params.limit } : {}),
      ...(params?.search ? { search: params.search } : {}),
    },
  })

  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const payload = (top && 'data' in top ? (top.data as unknown) : data) as unknown

  const pageObj = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
  const inner = (pageObj && 'data' in pageObj ? (pageObj.data as unknown) : payload) as unknown

  const d = inner && typeof inner === 'object' ? (inner as Record<string, unknown>) : null
  const itemsRaw = (d?.items as unknown) ?? []
  const itemsArr: unknown[] = Array.isArray(itemsRaw) ? itemsRaw : []

  const items: DieticianClientsByDieticianItem[] = itemsArr.map((it) => {
    const item = it && typeof it === 'object' ? (it as Record<string, unknown>) : {}
    const client = item.client && typeof item.client === 'object' ? (item.client as Record<string, unknown>) : null
    const clientUser = client?.user && typeof client.user === 'object' ? (client.user as Record<string, unknown>) : null
    const firstName = typeof clientUser?.firstName === 'string' ? clientUser.firstName : ''
    const lastName = typeof clientUser?.lastName === 'string' ? clientUser.lastName : ''

    return {
      id: toNumber(item.id, 0),
      dieticianId: toNumber(item.dieticianId, 0) || undefined,
      clientId: toNumber((client?.id ?? item.clientId) as unknown, 0) || undefined,
      clientUserId: toNumber((clientUser?.id ?? client?.userId) as unknown, 0) || undefined,
      clientName: `${firstName} ${lastName}`.trim() || undefined,
      clientEmail: typeof clientUser?.email === 'string' ? clientUser.email : undefined,
      clientPhone: typeof clientUser?.phone === 'string' ? clientUser.phone : (typeof client?.phone === 'string' ? client.phone : undefined),
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined,
    }
  })

  return {
    totalItems: toNumber(d?.totalItems, items.length),
    totalPages: toNumber(d?.totalPages, 1),
    currentPage: toNumber(d?.currentPage, params?.page ?? 1),
    items,
  }
}

/** DELETE /dietician-clients/remove/{id} — ilişkiyi sil */
export async function removeDieticianClient(relationshipId: number): Promise<void> {
  await api.delete(`/dietician-clients/remove/${relationshipId}`, skipAuth)
}
