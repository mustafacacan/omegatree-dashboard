import { api, type ApiRequestConfig } from '@/lib/axios'
import type { components } from '@/types/openapi'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

type ApiAnamnezResponse = components['schemas']['AnamnezFormResponse']
type ApiCreateAnamnez = components['schemas']['CreateAnamnezForm']

export interface AnamnezForm {
  id: number
  clientId?: number
  clientName?: string
  chronicIllness?: string
  medicationUsed?: string
  foodAllergy?: string
  bodyWeight?: number
  bodyHeight?: number
  waistCircumference?: number
  hipCircumference?: number
  profession?: string
  education?: string
  createdAt: string
  updatedAt: string
}

function mapApiAnamnez(item: ApiAnamnezResponse): AnamnezForm {
  const client = item.clientId
  return {
    id: item.id ?? 0,
    clientId: client?.id,
    clientName: client ? `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() : undefined,
    chronicIllness: item.chronic_illness,
    medicationUsed: item.medication_used,
    foodAllergy: item.food_allergy,
    bodyWeight: item.body_weight,
    bodyHeight: item.body_height,
    waistCircumference: item.waist_circumference,
    hipCircumference: item.hip_circumference,
    profession: item.profession,
    education: item.education,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

/** GET /anamnez */
export async function getAnamnezForms(): Promise<AnamnezForm[]> {
  const { data } = await api.get<unknown>('/anamnez', skipAuth)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const payload = top && 'data' in top ? top.data : data
  const list: ApiAnamnezResponse[] = Array.isArray(payload) ? payload : []
  return list.map(mapApiAnamnez)
}

/** GET /anamnez/{id} */
export async function getAnamnezById(id: number | string): Promise<AnamnezForm> {
  const { data } = await api.get<ApiAnamnezResponse>(`/anamnez/${id}`, skipAuth)
  return mapApiAnamnez(data)
}

/** POST /anamnez */
export async function createAnamnez(payload: ApiCreateAnamnez): Promise<AnamnezForm> {
  const { data } = await api.post<ApiAnamnezResponse>('/anamnez', payload, skipAuth)
  return mapApiAnamnez(data)
}

/** PUT /anamnez/{id} */
export async function updateAnamnez(
  id: number | string,
  payload: Partial<ApiCreateAnamnez>
): Promise<AnamnezForm> {
  const { data } = await api.put<ApiAnamnezResponse>(`/anamnez/${id}`, payload, skipAuth)
  return mapApiAnamnez(data)
}
