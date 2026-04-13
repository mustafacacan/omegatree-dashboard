import { api } from '@/lib/axios'
import type { components } from '@/types/openapi'

type DamagedKitResponse = components['schemas']['DamageKitResponse']
type Pagination = components['schemas']['Pagination']

export type DamagedKit = DamagedKitResponse

export interface GetDamagedKitsParams {
  page?: Pagination
}

export interface GetDamagedKitsResult {
  items: DamagedKit[]
  totalItems: number
  totalPages: number
  currentPage: number
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function readNumber(meta: Record<string, unknown> | null | undefined, keys: string[], fallback: number): number {
  if (!meta) return fallback
  for (const k of keys) {
    if (k in meta) {
      const n = Number(meta[k])
      if (Number.isFinite(n) && n >= 0) return n
    }
  }
  return fallback
}

function pickItemsAndMeta(body: unknown): { items: DamagedKit[]; meta: Record<string, unknown> } {
  // Possible shapes:
  // 1) { data: { items, totalItems, totalPages, currentPage } }
  // 2) { success, message, data: { items, totalItems, ... } }
  // 3) { data: DamagedKit[], pagination/meta: {...} }
  // 4) { items: DamagedKit[], totalItems, ... }
  // 5) DamagedKit[]
  if (Array.isArray(body)) return { items: body as DamagedKit[], meta: {} }
  if (!isRecord(body)) return { items: [], meta: {} }

  const top = body
  const payload = isRecord(top) && 'data' in top ? (top.data as unknown) : body

  if (Array.isArray(payload)) {
    const meta = (isRecord(top) && isRecord((top as Record<string, unknown>).pagination))
      ? ((top as Record<string, unknown>).pagination as Record<string, unknown>)
      : (isRecord(top) ? top : {})
    return { items: payload as DamagedKit[], meta }
  }

  if (isRecord(payload)) {
    if (Array.isArray(payload.items)) return { items: payload.items as DamagedKit[], meta: payload }
    if (Array.isArray(payload.data)) return { items: payload.data as DamagedKit[], meta: payload }
  }

  if ('items' in top && Array.isArray((top as Record<string, unknown>).items)) {
    return { items: (top as Record<string, unknown>).items as DamagedKit[], meta: top }
  }

  return { items: [], meta: isRecord(payload) ? payload : top }
}

/** Get damaged kit details by id (admin) */
export async function getDamagedKitDetails(
  damagedKitId: string
): Promise<Record<string, unknown> | null> {
  const { data } = await api.get<unknown>(
    `/damaged-kits/details/${encodeURIComponent(damagedKitId)}`
  )

  // Backend farklı formatlarda dönebilir:
  // - { data: { ... } }
  // - { success, message, data: { ... } }
  // - { ... } (nadir)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const payload = top && 'data' in top ? (top.data as unknown) : data

  if (!payload || typeof payload !== 'object') return null
  return payload as Record<string, unknown>
}

/** Create a damaged kit entry (dietitian reports damaged/return with photo) */
export async function createDamagedKit(
  kitId: string,
  params: { reason: string; imageFile: File }
): Promise<DamagedKit> {
  const form = new FormData()
  form.append('reason', params.reason)
  form.append('mediaId', params.imageFile)
  const { data } = await api.post<{ data?: DamagedKit; message?: string }>(
    `/damaged-kits/${encodeURIComponent(kitId)}`,
    form,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
  const result: DamagedKit | undefined =
    data && typeof data === 'object' && 'data' in data ? (data as { data?: DamagedKit }).data : (data as DamagedKit | undefined)
  if (result == null) throw new Error((data as { message?: string })?.message ?? 'Damaged kit create failed')
  return result
}

/** Get all damaged kits (for dietician: own; for admin: may return all depending on backend) */
export async function getDamagedKits(params?: GetDamagedKitsParams): Promise<DamagedKit[]> {
  const { data } = await api.get<unknown>('/damaged-kits', {
    params: params?.page ? { page: params.page } : undefined,
  })

  // Backend farklı formatlarda dönebilir:
  // - { data: DamagedKit[] }
  // - { success, message, data: DamagedKit[] }
  // - { data: { items: DamagedKit[] } }
  // - { data: { data: DamagedKit[] } }
  // - DamagedKit[] (nadir)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const payload = top && 'data' in top ? (top.data as unknown) : data

  if (Array.isArray(payload)) return payload as DamagedKit[]

  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    if (Array.isArray(obj.items)) return obj.items as DamagedKit[]
    if (Array.isArray(obj.data)) return obj.data as DamagedKit[]
  }

  return []
}

/** Get damaged kits with pagination meta (admin page table pagination) */
export async function getDamagedKitsWithPagination(params?: GetDamagedKitsParams): Promise<GetDamagedKitsResult> {
  const requestedPage = params?.page?.page ?? 1
  const requestedLimit = params?.page?.limit ?? 10
  const { data } = await api.get<unknown>('/damaged-kits', {
    params: params?.page ? { page: params.page } : undefined,
  })

  const { items, meta } = pickItemsAndMeta(data)
  const safeItems = Array.isArray(items) ? items : []

  const totalItems = readNumber(meta, ['totalItems', 'total', 'count', 'itemsCount'], safeItems.length)
  const totalPages = readNumber(meta, ['totalPages', 'pages', 'pageCount'], Math.max(1, Math.ceil(totalItems / Math.max(1, requestedLimit))))
  const currentPage = readNumber(meta, ['currentPage', 'page'], requestedPage)

  return { items: safeItems, totalItems, totalPages, currentPage }
}

/** Approve a damaged kit (admin). Backend may support PATCH /damaged-kits/{id} with { approved: true }. */
export async function approveDamagedKit(damagedKitId: string): Promise<DamagedKit | null> {
  try {
    const { data } = await api.patch<{ data?: DamagedKit; message?: string }>(
      `/damaged-kits/${encodeURIComponent(damagedKitId)}`,
      { approved: true }
    )
    const result: DamagedKit | undefined =
      data && typeof data === 'object' && 'data' in data ? (data as { data?: DamagedKit }).data : (data as DamagedKit | undefined)
    return result ?? null
  } catch {
    return null
  }
}

/** Update damaged kit with assigned replacement kit id (admin) */
export async function assignReplacementKitToDamaged(
  damagedKitId: string,
  assignedKitId: number
): Promise<DamagedKit | null> {
  const { data } = await api.put<unknown>(
    `/damaged-kits/assigned/${encodeURIComponent(damagedKitId)}`,
    { assignedKitId }
  )

  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const payload = top && 'data' in top ? (top.data as unknown) : data
  if (!payload || typeof payload !== 'object') return null
  return payload as DamagedKit
}

/** Assign a replacement kit for a damaged kit (admin) */
export async function assignReplacementForDamaged(
  damagedKitId: string,
  assignedKitId: string
): Promise<DamagedKit> {
  const { data } = await api.put<{ data?: DamagedKit; message?: string }>(
    `/damaged-kits/assigned/${encodeURIComponent(damagedKitId)}`,
    { assignedKitId }
  )
  const result: DamagedKit | undefined =
    data && typeof data === 'object' && 'data' in data ? (data as { data?: DamagedKit }).data : (data as DamagedKit | undefined)
  if (result == null) throw new Error((data as { message?: string })?.message ?? 'Assign replacement failed')
  return result
}
