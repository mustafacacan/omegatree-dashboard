import { api, type ApiRequestConfig } from '@/lib/axios'
import type { components } from '@/types/openapi'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

export type SleepQualityRecord = components['schemas']['SleepQualityRecordResponse']
export type CreateSleepQualityRecord = components['schemas']['CreateSleepQualityRecord']

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
 * GET /sleep-quality-records/me/latest
 * Returns the authenticated client's latest record, or null if it doesn't exist.
 */
export async function getMyLatestSleepQualityRecord(): Promise<SleepQualityRecord | null> {
    try {
        const { data } = await api.get<unknown>('/sleep-quality-records/me/latest', skipAuth)
        const payload = unwrapData(data)
        if (payload == null) return null
        return payload as SleepQualityRecord
    } catch (err: unknown) {
        const status = getHttpStatus(err)
        if (status === 404) return null
        throw err
    }
}

/**
 * POST /sleep-quality-records
 * Creates or replaces a record. For the client role, clientId is inferred server-side.
 */
export async function upsertMySleepQualityRecord(
    payload: Omit<CreateSleepQualityRecord, 'clientId'>
): Promise<SleepQualityRecord> {
    const { data } = await api.post<unknown>('/sleep-quality-records', payload, skipAuth)
    const out = unwrapData(data)
    return out as SleepQualityRecord
}
