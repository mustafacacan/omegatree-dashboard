import { api } from '@/lib/axios'

export type LabKitStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface LabKitKit {
  id: number
  kitBarcode?: string
  status?: string
  reasonForCancellation?: string
  isActive?: boolean
}

export interface LabKitMedia {
  id: number
  url?: string
}

export interface LaboratoryKit {
  id: number
  dieticianId?: number
  kitId?: LabKitKit
  status?: LabKitStatus
  resultMediaId?: LabKitMedia
  reasonForCancellation?: string
  createdAt: string
  updatedAt: string
}

interface ApiLaboratoryKitItem {
  id?: number
  dieticianId?: number
  kitId?: LabKitKit | number
  status?: LabKitStatus
  resultMediaId?: LabKitMedia | number | null
  reasonForCancellation?: string
  createdAt?: string
  updatedAt?: string
}

function mapApiLabKit(item: ApiLaboratoryKitItem): LaboratoryKit {
  const kitObj = item.kitId && typeof item.kitId === 'object' ? item.kitId : undefined
  const mediaObj = item.resultMediaId && typeof item.resultMediaId === 'object' ? item.resultMediaId : undefined
  return {
    id: Number(item.id) || 0,
    dieticianId: item.dieticianId != null ? Number(item.dieticianId) : undefined,
    kitId: kitObj as LabKitKit | undefined,
    status: item.status,
    resultMediaId: mediaObj as LabKitMedia | undefined,
    reasonForCancellation: item.reasonForCancellation,
    createdAt: item.createdAt ?? '',
    updatedAt: item.updatedAt ?? '',
  }
}

/**
 * GET /laboratory-kits
 * Authenticated user's laboratory kits.
 * Response: { data: LaboratoryKitResponse[] }
 */
export async function getLaboratoryKits(): Promise<LaboratoryKit[]> {
  const { data } = await api.get<unknown>('/laboratory-kits')
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const payload = top && 'data' in top ? top.data : data
  const list: ApiLaboratoryKitItem[] = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && 'items' in (payload as Record<string, unknown>)
      ? ((payload as Record<string, unknown>).items as ApiLaboratoryKitItem[]) ?? []
      : []
  return list.map(mapApiLabKit)
}

/**
 * GET /laboratory-kits/{id}
 */
export async function getLaboratoryKitById(id: number): Promise<LaboratoryKit> {
  const { data } = await api.get<unknown>(`/laboratory-kits/${id}`)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as ApiLaboratoryKitItem
  return mapApiLabKit(item)
}

/**
 * PUT /laboratory-kits/{id}
 * Body: multipart/form-data — status, reasonForCancellation?, file? (result media)
 */
export async function updateLaboratoryKit(
  id: number,
  payload: {
    status: 'pending' | 'completed' | 'cancelled'
    reasonForCancellation?: string
    file?: File
  }
): Promise<LaboratoryKit> {
  const form = new FormData()
  form.append('status', payload.status)
  if (payload.reasonForCancellation) {
    form.append('reasonForCancellation', payload.reasonForCancellation)
  }
  if (payload.file) {
    form.append('file', payload.file)
  }
  const { data } = await api.put<unknown>(`/laboratory-kits/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as ApiLaboratoryKitItem
  return mapApiLabKit(item)
}
