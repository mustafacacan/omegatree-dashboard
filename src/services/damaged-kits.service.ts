import { api } from '@/lib/axios'
import type { components } from '@/types/openapi'

type DamagedKitResponse = components['schemas']['DamageKitResponse']
type Pagination = components['schemas']['Pagination']

export type DamagedKit = DamagedKitResponse

export interface GetDamagedKitsParams {
  page?: Pagination
}

/** Create a damaged kit entry (dietitian reports damaged/return with photo) */
export async function createDamagedKit(
  kitId: string,
  params: { description: string; imageFile: File }
): Promise<DamagedKit> {
  const form = new FormData()
  form.append('description', params.description)
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
  const { data } = await api.get<{ data?: DamagedKit[]; message?: string }>('/damaged-kits', {
    params: params?.page ? { page: params.page } : undefined,
  })
  const list: DamagedKit[] | undefined = data && typeof data === 'object' && 'data' in data ? (data as { data?: DamagedKit[] }).data : (data as DamagedKit[] | undefined)
  return Array.isArray(list) ? list : []
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
