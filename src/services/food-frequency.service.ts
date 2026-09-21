import { api, type ApiRequestConfig } from '@/lib/axios'
import type { FfqFrequencyValue } from '@/lib/frequency-labels'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

export type FoodFrequencyItem = {
  frequency?: FfqFrequencyValue | '' | null
  amount?: string | null
}

export type FoodFrequencyRecord = {
  id?: number
  clientId?: number
  items: Record<string, FoodFrequencyItem>
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export type CreateFoodFrequencyRecord = {
  clientId?: number
  items: Record<string, FoodFrequencyItem>
  notes?: string | null
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function unwrapData(v: unknown): unknown {
  const top = asRecord(v)
  if (!top || !('data' in top)) return v
  return top.data
}

function mapFoodFrequency(row: unknown): FoodFrequencyRecord | null {
  if (row == null) return null
  const rec = asRecord(row) ?? {}
  const itemsRaw = rec.items
  const items =
    itemsRaw && typeof itemsRaw === 'object' && !Array.isArray(itemsRaw)
      ? (itemsRaw as Record<string, FoodFrequencyItem>)
      : {}
  return {
    id: rec.id != null ? Number(rec.id) : undefined,
    clientId: rec.clientId != null ? Number(rec.clientId) : undefined,
    items,
    notes: (rec.notes as string | null | undefined) ?? null,
    createdAt: rec.createdAt as string | undefined,
    updatedAt: rec.updatedAt as string | undefined,
  }
}

/** POST /food-frequency-records */
export async function upsertFoodFrequencyRecord(
  payload: CreateFoodFrequencyRecord,
): Promise<FoodFrequencyRecord> {
  const { data } = await api.post<unknown>('/food-frequency-records', payload, skipAuth)
  return mapFoodFrequency(unwrapData(data)) ?? { items: {} }
}

/** Danışan kendi kaydı — clientId sunucuda otomatik çözülür */
export async function getMyFoodFrequencyRecord(): Promise<FoodFrequencyRecord | null> {
  return getFoodFrequencyForClient(0)
}

/** GET /food-frequency-records/client/:clientId */
export async function getFoodFrequencyForClient(
  clientId: number | string,
): Promise<FoodFrequencyRecord | null> {
  try {
    const { data } = await api.get<unknown>(`/food-frequency-records/client/${clientId}`, skipAuth)
    const payload = unwrapData(data)
    if (payload == null) return null
    return mapFoodFrequency(payload)
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) return null
    throw err
  }
}
