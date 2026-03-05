import { api } from '@/lib/axios'
import type { components } from '@/types/openapi'

type DamagedKitResponse = components['schemas']['DamageKitResponse']
type Pagination = components['schemas']['Pagination']

export type DamagedKit = DamagedKitResponse

export interface GetDamagedKitsParams {
  page?: Pagination
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
