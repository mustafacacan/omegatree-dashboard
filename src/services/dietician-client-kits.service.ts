import { api, type ApiRequestConfig } from '@/lib/axios'
import type { components } from '@/types/openapi'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

type ApiCreateDieticianKit = components['schemas']['CreateDieticianKit']

export interface DieticianClientKit {
  id: number
  dieticianId?: number
  dieticianName?: string
  dieticianUserId?: number
  dieticianPhone?: string
  dieticianEmail?: string
  kitId?: number
  kitBarcode?: string
  kitName?: string
  kitIsActive?: boolean
  kitCreatedAt?: string
  kitUpdatedAt?: string
  clientId?: number
  clientName?: string
  clientUserId?: number
  clientPhone?: string
  clientEmail?: string
  status?: 'in_client' | 'in_laboratory' | 'in_expert' | 'delivered' | 'cancelled' | 'completed'
  /** Backend sometimes returns a free-text status/operation description (e.g. cancellation reason). */
  description?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

function asObj(v: unknown): Record<string, unknown> | null {
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

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function asBoolean(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined
}

function mapApiKit(item: unknown): DieticianClientKit {
  const obj = asObj(item) ?? {}

  const kitObj = asObj(obj.kit) ?? asObj(obj.kitId)

  const clientEntity = asObj(obj.client) ?? asObj(obj.clientId)
  const clientUserObj = asObj(clientEntity?.user) ?? clientEntity

  const dieticianEntity = asObj(obj.dietician) ?? asObj(obj.dieticianId)
  const dieticianUserObj = asObj(dieticianEntity?.user) ?? dieticianEntity

  const clientName =
    clientUserObj
      ? `${asString(clientUserObj.firstName) ?? ''} ${asString(clientUserObj.lastName) ?? ''}`.trim() || undefined
      : undefined

  const dieticianName =
    dieticianUserObj
      ? `${asString(dieticianUserObj.firstName) ?? ''} ${asString(dieticianUserObj.lastName) ?? ''}`.trim() || undefined
      : undefined

  const status = asString(obj.status) as DieticianClientKit['status'] | undefined
  const description = asString(obj.description)

  return {
    id: asNumber(obj.id) ?? 0,
    dieticianId: asNumber(dieticianEntity?.id) ?? asNumber(obj.dieticianId),
    dieticianName,
    dieticianUserId: asNumber(dieticianEntity?.userId) ?? asNumber(dieticianUserObj?.id),
    dieticianPhone: asString(dieticianUserObj?.phone),
    dieticianEmail: asString(dieticianUserObj?.email),

    kitId: asNumber(kitObj?.id) ?? asNumber(obj.kitId),
    kitBarcode: asString(kitObj?.barcode),
    kitName: asString(kitObj?.name),
    kitIsActive: asBoolean(kitObj?.isActive),
    kitCreatedAt: asString(kitObj?.createdAt),
    kitUpdatedAt: asString(kitObj?.updatedAt),

    clientId: asNumber(clientEntity?.id) ?? asNumber(obj.clientId),
    clientName,
    clientUserId: asNumber(clientEntity?.userId) ?? asNumber(clientUserObj?.id),
    clientPhone: asString(clientUserObj?.phone),
    clientEmail: asString(clientUserObj?.email),
    status,
    description,
    isActive: asBoolean(obj.isActive),
    createdAt: asString(obj.createdAt),
    updatedAt: asString(obj.updatedAt),
  }
}

/** GET /dietician-client-kits */
export async function getDieticianClientKits(page?: number): Promise<DieticianClientKit[]> {
  const { data } = await api.get<unknown>('/dietician-client-kits', {
    ...skipAuth,
    params: { page: page ?? 1, limit: 200 },
  })

  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const payload = top && 'data' in top ? top.data : data

  const list: unknown[] =
    Array.isArray(payload)
      ? payload
      : (asObj(payload) && Array.isArray((payload as Record<string, unknown>).items)
        ? (((payload as Record<string, unknown>).items as unknown[]) ?? [])
        : [])

  return list.map(mapApiKit)
}

/** GET /dietician-client-kits/{id} */
export async function getDieticianClientKitById(id: number | string): Promise<DieticianClientKit> {
  const { data } = await api.get<unknown>(`/dietician-client-kits/${id}`, skipAuth)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as unknown
  return mapApiKit(item)
}

/** POST /dietician-client-kits — kit ata */
export async function createDieticianClientKit(kitId: number): Promise<DieticianClientKit> {
  const { data } = await api.post<unknown>('/dietician-client-kits', { kitId }, skipAuth)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as unknown
  return mapApiKit(item)
}

/** POST /dietician-client-kits/{clientId} — stoktaki kiti danışana ata */
export async function assignDieticianClientKitToClient(
  clientId: number | string,
  kitId: number
): Promise<DieticianClientKit> {
  const body: ApiCreateDieticianKit = { kitId }
  const { data } = await api.post<unknown>(`/dietician-client-kits/${clientId}`, body, skipAuth)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as unknown
  return mapApiKit(item)
}

/** PUT /dietician-client-kits/{id} — güncelle */
export async function updateDieticianClientKit(
  id: number | string,
  payload: { kitId?: number; status?: DieticianClientKit['status'] }
): Promise<void> {
  await api.put(`/dietician-client-kits/${id}`, payload, skipAuth)
}

/** DELETE /dietician-client-kits/{id} */
export async function deleteDieticianClientKit(id: number | string): Promise<void> {
  await api.delete(`/dietician-client-kits/${id}`, skipAuth)
}

/** POST /dietician-client-kits/send-kit-laboratory — laboratuvara gönder (dietician-client-kit assignment id) */
export async function sendKitToLaboratory(dieticianClientKitId: number | string): Promise<void> {
  await api.post('/dietician-client-kits/send-kit-laboratory', { id: Number(dieticianClientKitId) }, skipAuth)
}
