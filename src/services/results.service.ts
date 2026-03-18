import { api, type ApiRequestConfig } from '@/lib/axios'
import type { components } from '@/types/openapi'

export type Result = components['schemas']['ResultResponse'] & {
    client?: {
        id?: number
        user?: {
            id?: number
            firstName?: string | null
            lastName?: string | null
            phone?: string | null
            email?: string | null
        } | null
    } | null

    dieticianClient?: {
        id?: number
        clientId?: number
        client?: {
            id?: number
            userId?: number
            user?: {
                id?: number
                firstName?: string | null
                lastName?: string | null
                phone?: string | null
                email?: string | null
            } | null
        } | null
    } | null
}

export type ResultStatus = 'pending' | 'completed' | 'approved' | 'rejected'

export interface GetResultsParams {
    page?: number
    limit?: number
    status?: ResultStatus
}

export interface GetResultsResponse {
    items: Result[]
    totalItems: number
    totalPages: number
    currentPage: number
}

export interface GetPendingResultsParams {
    page?: number
    limit?: number
}

function asRecord(v: unknown): Record<string, unknown> | null {
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

/**
 * GET /results
 * Query: page, limit, status
 * Response format may vary across environments:
 * - { data: ResultResponse[] }
 * - { data: { items, totalItems, totalPages, currentPage }, meta?: {...} }
 */
export async function getResultsPage(params?: GetResultsParams): Promise<GetResultsResponse> {
    const page = params?.page ?? 1
    const limit = params?.limit ?? 10

    const { data } = await api.get<unknown>(
        '/results',
        {
            params: {
                page,
                limit,
                ...(params?.status ? { status: params.status } : undefined),
            },
            // If backend denies this endpoint for a role, we prefer showing error state
            // instead of logging the user out globally.
            skipAuthRedirect: true,
        } as ApiRequestConfig
    )

    const top = asRecord(data)
    const payload = top && 'data' in top ? top.data : data

    const payloadRec = asRecord(payload)
    const items: Result[] = Array.isArray(payload)
        ? (payload as Result[])
        : payloadRec && Array.isArray(payloadRec.items)
            ? (payloadRec.items as Result[])
            : []

    const metaFromTop = top && asRecord(top.meta)
    const metaFromPayload = payloadRec

    const totalItems =
        asNumber(metaFromPayload?.totalItems) ??
        asNumber(metaFromTop?.totalItems) ??
        items.length
    const totalPages =
        asNumber(metaFromPayload?.totalPages) ??
        asNumber(metaFromTop?.totalPages) ??
        Math.max(1, Math.ceil(totalItems / Math.max(1, limit)))
    const currentPage =
        asNumber(metaFromPayload?.currentPage) ??
        asNumber(metaFromTop?.currentPage) ??
        page

    return { items, totalItems, totalPages, currentPage }
}

/**
 * GET /results/pending (admin)
 * Query: page, limit
 * Response format may vary across environments:
 * - { data: ResultResponse[] }
 * - { data: { items, totalItems, totalPages, currentPage }, meta?: {...} }
 */
export async function getPendingResultsPage(params?: GetPendingResultsParams): Promise<GetResultsResponse> {
    const page = params?.page ?? 1
    const limit = params?.limit ?? 10

    const { data } = await api.get<unknown>(
        '/results/pending',
        {
            params: {
                page,
                limit,
            },
            skipAuthRedirect: true,
        } as ApiRequestConfig
    )

    const top = asRecord(data)
    const payload = top && 'data' in top ? top.data : data

    const payloadRec = asRecord(payload)
    const items: Result[] = Array.isArray(payload)
        ? (payload as Result[])
        : payloadRec && Array.isArray(payloadRec.items)
            ? (payloadRec.items as Result[])
            : payloadRec && Array.isArray(payloadRec.data)
                ? (payloadRec.data as Result[])
                : []

    const metaFromTop = top && asRecord(top.meta)
    const metaFromPayload = payloadRec

    const totalItems =
        asNumber(metaFromPayload?.totalItems) ??
        asNumber(metaFromTop?.totalItems) ??
        items.length
    const totalPages =
        asNumber(metaFromPayload?.totalPages) ??
        asNumber(metaFromTop?.totalPages) ??
        Math.max(1, Math.ceil(totalItems / Math.max(1, limit)))
    const currentPage =
        asNumber(metaFromPayload?.currentPage) ??
        asNumber(metaFromTop?.currentPage) ??
        page

    return { items, totalItems, totalPages, currentPage }
}

/** GET /results/{id} */
export async function getResultById(id: number | string): Promise<Result> {
    const { data } = await api.get<unknown>(`/results/${id}`, { skipAuthRedirect: true } as ApiRequestConfig)
    const top = asRecord(data)
    const payload = (top && 'data' in top ? top.data : data) as Result
    return payload
}

export type UpdateResultSchema = components['schemas']['UpdateResult']
export type ResultOverallEvaluation = UpdateResultSchema['overall_evaluation']
export type UpdateResultInput = Omit<UpdateResultSchema, 'file'> & { file?: File }

/** PUT /results/{id} (multipart/form-data) */
export async function updateResult(id: number | string, input: UpdateResultInput): Promise<Result> {
    const form = new FormData()

    if (typeof input.status === 'string' && input.status.trim() !== '') {
        form.append('status', input.status)
    }
    if (input.overall_evaluation) form.append('overall_evaluation', input.overall_evaluation)
    if (typeof input.nutrition_suggestions === 'string' && input.nutrition_suggestions.trim() !== '') {
        form.append('nutrition_suggestions', input.nutrition_suggestions)
    }
    if (typeof input.reinforcement_suggestions === 'string' && input.reinforcement_suggestions.trim() !== '') {
        form.append('reinforcement_suggestions', input.reinforcement_suggestions)
    }
    if (typeof input.resultMedia === 'string' && input.resultMedia.trim() !== '') {
        form.append('resultMedia', input.resultMedia)
    }
    if (input.file) {
        form.append('file', input.file)
    }

    const { data } = await api.put<unknown>(
        `/results/${id}`,
        form,
        {
            headers: { 'Content-Type': 'multipart/form-data' },
            skipAuthRedirect: true,
        } as ApiRequestConfig
    )

    const top = asRecord(data)
    const payload = (top && 'data' in top ? top.data : data) as Result
    return payload
}

/** PUT /results/{id}/approve (admin) */
export async function approveResult(id: number | string): Promise<Result> {
    const { data } = await api.put<unknown>(
        `/results/${id}/approve`,
        undefined,
        { skipAuthRedirect: true } as ApiRequestConfig
    )
    const top = asRecord(data)
    const payload = (top && 'data' in top ? top.data : data) as Result
    return payload
}
