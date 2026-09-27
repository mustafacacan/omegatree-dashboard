import { api, type ApiRequestConfig } from '@/lib/axios'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

/** Backend POST /anamnez gövdesi (snake_case, Joi createAnamnezFormSchema). */
export type CreateAnamnezPayload = {
  age?: number
  chronic_illness: string
  family_chronic_illness?: string
  medication_used: string
  food_allergy?: string
  body_weight: number
  body_height: number
  waist_circumference: number
  hip_circumference: number
  neck_circumference?: number
  smokingFrequency?: string
  alcoholFrequency?: string
  alcoholType?: string
  profession: string
  education: string
}

/** API'ye gönderilen tam gövde — backend'in beklediği zorunlu/varsayılan alanlar dahil. */
export type AnamnezApiCreateBody = CreateAnamnezPayload & {
  food_allergy: string
  family_chronic_illness: string
}

/** Danışan onboarding / POST /anamnez için backend ile birebir uyumlu payload. */
export function buildAnamnezCreatePayload(input: CreateAnamnezPayload): AnamnezApiCreateBody {
  const body: AnamnezApiCreateBody = {
    chronic_illness: input.chronic_illness.trim(),
    medication_used: input.medication_used.trim(),
    food_allergy: input.food_allergy?.trim() || 'none',
    family_chronic_illness: input.family_chronic_illness?.trim() || 'none',
    body_weight: Number(input.body_weight),
    body_height: Math.round(Number(input.body_height)),
    waist_circumference: Number(input.waist_circumference),
    hip_circumference: Number(input.hip_circumference),
    profession: input.profession.trim(),
    education: input.education.trim(),
  }

  if (input.age != null && Number.isFinite(Number(input.age))) {
    body.age = Math.round(Number(input.age))
  }
  if (input.neck_circumference != null && Number.isFinite(Number(input.neck_circumference))) {
    body.neck_circumference = Number(input.neck_circumference)
  }
  if (input.smokingFrequency) body.smokingFrequency = input.smokingFrequency
  if (input.alcoholFrequency) body.alcoholFrequency = input.alcoholFrequency
  if (input.alcoholType?.trim()) body.alcoholType = input.alcoholType.trim()

  return body
}

export interface AnamnezForm {
  id: number
  clientId?: number
  clientName?: string
  age?: number
  chronicIllness?: string
  familyChronicIllness?: string
  medicationUsed?: string
  foodAllergy?: string
  bodyWeight?: number
  bodyHeight?: number
  waistCircumference?: number
  hipCircumference?: number
  neckCircumference?: number
  smokingFrequency?: string
  alcoholFrequency?: string
  alcoholType?: string
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
    age: toNumberMaybe(rec.age),
    chronicIllness: toStringMaybe(rec.chronic_illness),
    familyChronicIllness: toStringMaybe(rec.family_chronic_illness),
    medicationUsed: toStringMaybe(rec.medication_used),
    foodAllergy: toStringMaybe(rec.food_allergy),
    bodyWeight: toNumberMaybe(rec.body_weight),
    bodyHeight: toNumberMaybe(rec.body_height),
    waistCircumference: toNumberMaybe(rec.waist_circumference),
    hipCircumference: toNumberMaybe(rec.hip_circumference),
    neckCircumference: toNumberMaybe(rec.neck_circumference),
    smokingFrequency: toStringMaybe(rec.smokingFrequency),
    alcoholFrequency: toStringMaybe(rec.alcoholFrequency),
    alcoholType: toStringMaybe(rec.alcoholType),
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
export async function createAnamnez(payload: CreateAnamnezPayload): Promise<AnamnezForm> {
  const body = buildAnamnezCreatePayload(payload)
  const { data } = await api.post<unknown>('/anamnez', body, skipAuth)
  return mapApiAnamnez(unwrapSingle(data))
}

/** PUT /anamnez/{id} */
export async function updateAnamnez(
  id: number | string,
  payload: Partial<CreateAnamnezPayload>
): Promise<AnamnezForm> {
  const { data } = await api.put<unknown>(`/anamnez/${id}`, payload, skipAuth)
  return mapApiAnamnez(unwrapSingle(data))
}
