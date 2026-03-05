import { api, type ApiRequestConfig } from '@/lib/axios'
import type { components } from '@/types/openapi'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

type ApiClientResponse = components['schemas']['ClientResponse']
type ApiCreateClient = components['schemas']['CreateClient']

export interface AppClient {
  id: number
  firstName: string
  lastName: string
  phone: string
  email: string
  gender?: string
  identityNumber?: string
  createdAt: string
  updatedAt: string
  dieticianId?: number
  dieticianName?: string
}

function mapApiClientToApp(item: ApiClientResponse): AppClient {
  const user = item.userId
  const dietician = item.dieticianId
  return {
    id: item.id,
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    gender: user?.gender,
    identityNumber: user?.identityNumber,
    createdAt: user?.createdAt ?? '',
    updatedAt: user?.updatedAt ?? '',
    dieticianId: dietician?.id,
    dieticianName: dietician ? `${dietician.firstName ?? ''} ${dietician.lastName ?? ''}`.trim() : undefined,
  }
}

export interface GetClientsParams {
  page?: number
  limit?: number
  search?: string
}

export interface GetClientsResponse {
  clients: AppClient[]
  total?: number
}

/** GET /clients */
export async function getClients(params?: GetClientsParams): Promise<GetClientsResponse> {
  const { data } = await api.get<unknown>('/clients', {
    ...skipAuth,
    params: params
      ? { page: params.page ?? 1, limit: params.limit ?? 50, ...(params.search && { search: params.search }) }
      : undefined,
  })
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const payload = top && 'data' in top ? top.data : data

  if (payload && typeof payload === 'object' && 'clients' in (payload as Record<string, unknown>)) {
    const list = ((payload as Record<string, unknown>).clients as ApiClientResponse[]) ?? []
    return { clients: list.map(mapApiClientToApp), total: list.length }
  }

  const list: ApiClientResponse[] = Array.isArray(payload) ? payload : []
  return { clients: list.map(mapApiClientToApp), total: list.length }
}

/** GET /clients/{clientId} */
export async function getClientById(clientId: number | string): Promise<AppClient> {
  const { data } = await api.get<unknown>(`/clients/${clientId}`, skipAuth)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as ApiClientResponse
  return mapApiClientToApp(item)
}

/** POST /clients */
export async function createClient(payload: {
  firstName: string
  lastName: string
  phone: string
  email?: string
  gender: 'male' | 'female'
  identityNumber?: string
  dieticianId: number
}): Promise<AppClient> {
  const body: ApiCreateClient = {
    userId: {
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      email: payload.email,
      role: 'client',
      gender: payload.gender,
      identityNumber: payload.identityNumber,
    },
    dieticianId: payload.dieticianId,
  }

  const { data } = await api.post<unknown>('/clients', body, skipAuth)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as ApiClientResponse
  return mapApiClientToApp(item)
}

/** PUT /clients/{clientId} — diyetisyen değiştir */
export async function updateClientDietician(clientId: number | string, dieticianId: number): Promise<AppClient> {
  const { data } = await api.put<unknown>(`/clients/${clientId}`, { dieticianId }, skipAuth)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as ApiClientResponse
  return mapApiClientToApp(item)
}
