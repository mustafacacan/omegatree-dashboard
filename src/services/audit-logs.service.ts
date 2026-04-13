import { api } from '@/lib/axios'

export type AuditLogsSortField = 'timestamp' | 'action' | 'entity'
export type AuditLogsSortDirection = 'asc' | 'desc'

export interface GetAuditLogsParams {
    page?: number
    limit?: number
    search?: string
    sortField?: AuditLogsSortField
    sortDirection?: AuditLogsSortDirection
}

export type AuditLogUser = {
    id?: number | string
    firstName?: string
    lastName?: string
    phone?: string
    email?: string
}

export type AuditLogData = Record<string, unknown>

/**
 * Backend'den gelebilecek audit log satırı (swagger ile birebir aynı olmayabilir).
 * - Eski şema: { userName, userRole, details, timestamp }
 * - Yeni şema (örnek): { user: {..}, data: { field: {oldValue,newValue} }, createdAt }
 */
export interface AuditLogItem {
    id: number | string
    userId?: number | string
    action?: string
    entity?: string
    entityId?: number | string | null
    ipAddress?: string
    userAgent?: string | null
    /** Eski şema */
    userName?: string
    userRole?: string
    details?: string
    timestamp?: string
    /** Yeni şema */
    data?: AuditLogData
    createdAt?: string
    updatedAt?: string
    user?: AuditLogUser
}

export interface GetAuditLogsResult {
    items: AuditLogItem[]
    totalItems: number
    totalPages: number
    currentPage: number
}

function pickSingleLog(body: unknown): AuditLogItem | null {
    // Possible shapes:
    // 1) AuditLogItem
    // 2) { data: AuditLogItem }
    // 3) { success, message, data: AuditLogItem }
    if (!isRecord(body)) return null

    if ('id' in body) return body as unknown as AuditLogItem

    if ('data' in body) {
        const d = body.data
        if (isRecord(d) && 'id' in d) return d as unknown as AuditLogItem
        // nested: { data: { data: AuditLogItem } }
        if (isRecord(d) && 'data' in d && isRecord(d.data) && 'id' in d.data) return d.data as unknown as AuditLogItem
    }

    return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

function pickItemsAndPagination(body: unknown): { items: AuditLogItem[]; meta: Record<string, unknown> } {
    // Most likely shapes:
    // 1) { data: AuditLogItem[], pagination: {...} }
    // 2) { success, message, data: { items: AuditLogItem[], totalItems, totalPages, currentPage } }
    // 3) { items: AuditLogItem[], pagination/meta: {...} }
    if (!isRecord(body)) return { items: [], meta: {} }

    // Shape 2: wrapper with data object
    if ('data' in body && isRecord(body.data)) {
        const inner = body.data
        if ('items' in inner && Array.isArray(inner.items)) {
            return { items: inner.items as AuditLogItem[], meta: inner }
        }
        if ('data' in inner && Array.isArray(inner.data)) {
            return { items: inner.data as AuditLogItem[], meta: inner }
        }
    }

    // Shape 1: { data: [], pagination: {} }
    if ('data' in body && Array.isArray(body.data)) {
        const meta = (isRecord(body.pagination) ? body.pagination : body) as Record<string, unknown>
        return { items: body.data as AuditLogItem[], meta }
    }

    // Shape 3: { items: [], ... }
    if ('items' in body && Array.isArray(body.items)) {
        const meta = (isRecord(body.pagination) ? body.pagination : body) as Record<string, unknown>
        return { items: body.items as AuditLogItem[], meta }
    }

    return { items: [], meta: body }
}

function readNumber(meta: Record<string, unknown>, keys: string[], fallback: number): number {
    for (const k of keys) {
        if (k in meta) {
            const n = Number(meta[k])
            if (Number.isFinite(n) && n > 0) return n
        }
    }
    return fallback
}

/** GET /audit-logs — response: { data: AuditLog[], pagination: {...} } (veya benzeri wrapper) */
export async function getAuditLogsWithPagination(params?: GetAuditLogsParams): Promise<GetAuditLogsResult> {
    const { page = 1, limit = 10, search, sortField = 'timestamp', sortDirection = 'desc' } = params ?? {}

    const { data } = await api.get<unknown>('/audit-logs', {
        params: {
            page,
            limit,
            ...(search ? { search } : {}),
            sortField,
            sortDirection,
        },
    })

    const { items, meta } = pickItemsAndPagination(data)
    const safeItems = Array.isArray(items) ? items : []

    const totalItems = readNumber(meta, ['totalItems', 'total', 'count', 'itemsCount'], safeItems.length)
    const totalPages = readNumber(meta, ['totalPages', 'pages', 'pageCount'], Math.max(1, Math.ceil(totalItems / Math.max(1, limit))))
    const currentPage = readNumber(meta, ['currentPage', 'page'], page)

    return {
        items: safeItems,
        totalItems,
        totalPages,
        currentPage,
    }
}

/** GET /audit-logs/{id} — tek log kaydı */
export async function getAuditLogById(id: number | string): Promise<AuditLogItem> {
    const { data } = await api.get<unknown>(`/audit-logs/${id}`)
    const item = pickSingleLog(data) ?? (data as unknown as AuditLogItem)
    return item
}
