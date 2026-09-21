import { api, type ApiRequestConfig } from '@/lib/axios'
import type { BeslenmeAnamneziPayload } from '@/features/shared/beslenme-anamnezi-form.utils'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

/** Backend gerçek payload (OpenAPI şeması eski alanları hâlâ zorunlu gösteriyor). */
export type CreateFoodConsumptionRecord = BeslenmeAnamneziPayload & {
  clientId?: number
}

export type FoodConsumptionRecord = CreateFoodConsumptionRecord & {
  id?: number
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
  // Geriye uyumluluk / eski kayıtlar
  alcoholFrequency?: string | null
  smokingFrequency?: string | null
  fastFoodMealsPerDay?: number | null
  discomfortFoods?: string | null
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function unwrapData(v: unknown): unknown {
  const top = asRecord(v)
  if (!top || !('data' in top)) return v
  return (top as { data?: unknown }).data
}

function getHttpStatus(err: unknown): number | undefined {
  const e = err as { response?: { status?: unknown } }
  return typeof e?.response?.status === 'number' ? e.response.status : undefined
}

/**
 * GET /food-consumption-records/me
 * Returns the authenticated client's record, or null if it doesn't exist.
 */
export async function getMyFoodConsumptionRecord(): Promise<FoodConsumptionRecord | null> {
  try {
    const { data } = await api.get<unknown>('/food-consumption-records/me', skipAuth)
    const payload = unwrapData(data)
    if (payload == null) return null
    return payload as FoodConsumptionRecord
  } catch (err: unknown) {
    const status = getHttpStatus(err)
    if (status === 404) return null
    throw err
  }
}

/**
 * POST /food-consumption-records
 * Creates or replaces a record. For the client role, clientId is inferred server-side.
 */
export async function upsertMyFoodConsumptionRecord(
  payload: Omit<CreateFoodConsumptionRecord, 'clientId'>,
): Promise<FoodConsumptionRecord> {
  const { data } = await api.post<unknown>('/food-consumption-records', payload, skipAuth)
  const out = unwrapData(data)
  return out as FoodConsumptionRecord
}

/**
 * POST /food-consumption-records
 * Admin/expert/dietician can upsert a record for a specific client by passing clientId.
 */
export async function upsertFoodConsumptionRecord(
  payload: CreateFoodConsumptionRecord,
): Promise<FoodConsumptionRecord> {
  const { data } = await api.post<unknown>('/food-consumption-records', payload, skipAuth)
  const out = unwrapData(data)
  return out as FoodConsumptionRecord
}
