import { api, type ApiRequestConfig } from '@/lib/axios'
import type { components } from '@/types/openapi'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

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

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function toNumberMaybe(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function toStringMaybe(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function getHttpStatus(err: unknown): number | undefined {
  const e = err as { response?: { status?: unknown } }
  return typeof e?.response?.status === 'number' ? e.response.status : undefined
}

function mapApiAnamnez(item: unknown): AnamnezForm {
  // OpenAPI says AnamnezFormResponse, but backend may return different shapes.
  const rec = asRecord(item) ?? {}

  const id = toNumberMaybe(rec.id) ?? 0
  const createdAt = toStringMaybe(rec.createdAt) ?? ''
  const updatedAt = toStringMaybe(rec.updatedAt) ?? ''

  // clientId: can be a number or an object, and sometimes a separate `client` object exists.
  const clientIdValue = rec.clientId
  const clientObj = asRecord(clientIdValue) ?? asRecord(rec.client)
  const clientId =
    toNumberMaybe(clientIdValue) ??
    toNumberMaybe(clientObj?.id) ??
    toNumberMaybe(asRecord(clientObj?.user)?.id)

  const userObj = asRecord(clientObj?.user)
  const clientName = (() => {
    const firstName = toStringMaybe(clientObj?.firstName) ?? toStringMaybe(userObj?.firstName) ?? ''
    const lastName = toStringMaybe(clientObj?.lastName) ?? toStringMaybe(userObj?.lastName) ?? ''
    const out = `${firstName} ${lastName}`.trim()
    return out || undefined
  })()

  return {
    id,
    clientId: clientId ?? undefined,
    clientName,
    chronicIllness: toStringMaybe(rec.chronic_illness),
    medicationUsed: toStringMaybe(rec.medication_used),
    foodAllergy: toStringMaybe(rec.food_allergy),
    bodyWeight: toNumberMaybe(rec.body_weight),
    bodyHeight: toNumberMaybe(rec.body_height),
    waistCircumference: toNumberMaybe(rec.waist_circumference),
    hipCircumference: toNumberMaybe(rec.hip_circumference),
    profession: toStringMaybe(rec.profession),
    education: toStringMaybe(rec.education),
    createdAt,
    updatedAt,
  }
}

/**
 * Backend responses are not fully consistent with the OpenAPI spec.
 * Supports:
 * - { data: T }
 * - { success, message, data: T }
 * - { data: { items: T[] } } (pagination wrapper)
 */
function unwrapData(v: unknown): unknown {
  const top = asRecord(v)
  if (!top || !('data' in top)) return v
  return (top as { data?: unknown }).data
}

function unwrapItems(v: unknown): unknown[] {
  const payload = unwrapData(v)
  if (Array.isArray(payload)) return payload
  const rec = asRecord(payload)
  const items = rec && 'items' in rec ? (rec as { items?: unknown }).items : undefined
  return Array.isArray(items) ? items : []
}

function unwrapSingle(v: unknown): unknown {
  const payload = unwrapData(v)
  return payload
}

/** GET /anamnez */
export async function getAnamnezForms(): Promise<AnamnezForm[]> {
  try {
    const { data } = await api.get<unknown>('/anamnez', skipAuth)
    return unwrapItems(data).map(mapApiAnamnez)
  } catch (err: unknown) {
    const status = getHttpStatus(err)
    // Some environments return 404 when the authenticated user has no anamnez.
    if (status === 404) return []
    throw err
  }
}

/** GET /anamnez/{id} */
export async function getAnamnezById(id: number | string): Promise<AnamnezForm> {
  const { data } = await api.get<unknown>(`/anamnez/${id}`, skipAuth)
  return mapApiAnamnez(unwrapSingle(data))
}

/** POST /anamnez */
export async function createAnamnez(payload: ApiCreateAnamnez): Promise<AnamnezForm> {
  const { data } = await api.post<unknown>('/anamnez', payload, skipAuth)
  return mapApiAnamnez(unwrapSingle(data))
}

/** PUT /anamnez/{id} */
export async function updateAnamnez(
  id: number | string,
  payload: Partial<ApiCreateAnamnez>
): Promise<AnamnezForm> {
  const { data } = await api.put<unknown>(`/anamnez/${id}`, payload, skipAuth)
  return mapApiAnamnez(unwrapSingle(data))
}
