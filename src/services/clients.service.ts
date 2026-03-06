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

export interface ClientDetail {
  id: number
  userId?: number
  createdAt?: string
  updatedAt?: string
  user?: {
    id: number
    firstName?: string
    lastName?: string
    phone?: string
    email?: string
    addresses?: unknown[]
  }
  anamnezForm?: {
    id?: number
    clientId?: number
    chronicIllness?: string
    medicationUsed?: string
    foodAllergy?: string
    bodyWeight?: string | number
    bodyHeight?: string | number
    waistCircumference?: string | number
    hipCircumference?: string | number
    profession?: string
    education?: string
    createdAt?: string
    updatedAt?: string
    deletedAt?: string | null
  }
  dietician?: {
    id?: number
    userId?: number
    firstName?: string
    lastName?: string
    phone?: string
    email?: string
  }
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

/** GET /clients/{clientId} — full client detail (user + anamnezForm + dieticianClient) */
export async function getClientDetail(clientId: number | string): Promise<ClientDetail> {
  const { data } = await api.get<unknown>(`/clients/${clientId}`, skipAuth)
  const top = asObj(data)
  const payload = top && 'data' in top ? top.data : data
  const item = asObj(payload) ?? {}

  const user = asObj(item.user)
  const anamnez = asObj(item.anamnezForm)
  const dieticianClient = asObj(item.dieticianClient)
  const dietician = asObj(dieticianClient?.dietician)
  const dieticianUser = asObj(dietician?.user)

  const detail: ClientDetail = {
    id: asNumber(item.id) ?? Number(clientId),
    userId: asNumber(item.userId),
    createdAt: asString(item.createdAt),
    updatedAt: asString(item.updatedAt),
    user: user
      ? {
        id: asNumber(user.id) ?? 0,
        firstName: asString(user.firstName),
        lastName: asString(user.lastName),
        phone: asString(user.phone),
        email: asString(user.email),
        addresses: Array.isArray(user.addresses) ? user.addresses : [],
      }
      : undefined,
    anamnezForm: anamnez
      ? {
        id: asNumber(anamnez.id),
        clientId: asNumber(anamnez.clientId),
        chronicIllness: asString(anamnez.chronic_illness),
        medicationUsed: asString(anamnez.medication_used),
        foodAllergy: asString(anamnez.food_allergy),
        bodyWeight: (asString(anamnez.body_weight) ?? asNumber(anamnez.body_weight)) as string | number | undefined,
        bodyHeight: (asString(anamnez.body_height) ?? asNumber(anamnez.body_height)) as string | number | undefined,
        waistCircumference: (asString(anamnez.waist_circumference) ?? asNumber(anamnez.waist_circumference)) as
          | string
          | number
          | undefined,
        hipCircumference: (asString(anamnez.hip_circumference) ?? asNumber(anamnez.hip_circumference)) as
          | string
          | number
          | undefined,
        profession: asString(anamnez.profession),
        education: asString(anamnez.education),
        createdAt: asString(anamnez.createdAt),
        updatedAt: asString(anamnez.updatedAt),
        deletedAt: (asString(anamnez.deletedAt) ?? null) as string | null,
      }
      : undefined,
    dietician: dieticianUser
      ? {
        id: asNumber(dietician?.id),
        userId: asNumber(dietician?.userId),
        firstName: asString(dieticianUser.firstName),
        lastName: asString(dieticianUser.lastName),
        phone: asString(dieticianUser.phone),
        email: asString(dieticianUser.email),
      }
      : undefined,
  }

  return detail
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
  anamnezForm?: {
    chronicIllness?: string
    medicationUsed?: string
    foodAllergy?: string
    bodyWeight?: number
    bodyHeight?: number
    waistCircumference?: number
    hipCircumference?: number
    profession?: string
    education?: string
  }
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

  if (payload.anamnezForm) {
    const anamnez: Record<string, unknown> = {}
    if (payload.anamnezForm.chronicIllness) anamnez.chronic_illness = payload.anamnezForm.chronicIllness
    if (payload.anamnezForm.medicationUsed) anamnez.medication_used = payload.anamnezForm.medicationUsed
    if (payload.anamnezForm.foodAllergy) anamnez.food_allergy = payload.anamnezForm.foodAllergy
    if (typeof payload.anamnezForm.bodyWeight === 'number') anamnez.body_weight = payload.anamnezForm.bodyWeight
    if (typeof payload.anamnezForm.bodyHeight === 'number') anamnez.body_height = payload.anamnezForm.bodyHeight
    if (typeof payload.anamnezForm.waistCircumference === 'number') anamnez.waist_circumference = payload.anamnezForm.waistCircumference
    if (typeof payload.anamnezForm.hipCircumference === 'number') anamnez.hip_circumference = payload.anamnezForm.hipCircumference
    if (payload.anamnezForm.profession) anamnez.profession = payload.anamnezForm.profession
    if (payload.anamnezForm.education) anamnez.education = payload.anamnezForm.education

    if (Object.keys(anamnez).length) {
      body.anamnezForm = anamnez as unknown as ApiCreateClient['anamnezForm']
    }
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
