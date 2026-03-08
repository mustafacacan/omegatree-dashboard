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
  laboratoryId?: number
  dieticianId?: number
  kitId?: LabKitKit
  status?: LabKitStatus
  isActive?: boolean
  resultMediaId?: LabKitMedia
  /** Backend may return media as `mediaResult`; we also map it into `resultMediaId` for backward compatibility. */
  mediaResult?: LabKitMedia
  reasonForCancellation?: string
  createdAt: string
  updatedAt: string
}

export interface LaboratoryKitsPage {
  items: LaboratoryKit[]
  totalItems: number
  totalPages: number
  currentPage: number
}

interface ApiKitLaboratory {
  id?: number
  barcode?: string
  isActive?: boolean
}

interface ApiLaboratoryKitItem {
  id?: number
  laboratoryId?: number
  dieticianId?: number
  kitId?: LabKitKit | number
  status?: LabKitStatus
  isActive?: boolean
  resultMediaId?: LabKitMedia | number | null
  mediaResult?: LabKitMedia | number | null
  reasonForCancellation?: string
  createdAt?: string
  updatedAt?: string
  kitLaboratory?: ApiKitLaboratory
}

function mapApiLabKit(item: ApiLaboratoryKitItem): LaboratoryKit {
  const kitObj = item.kitId && typeof item.kitId === 'object' ? item.kitId : undefined
  const kitBarcodeFromKitLaboratory = item.kitLaboratory?.barcode
  const kitIdFromNumber = typeof item.kitId === 'number' ? item.kitId : undefined

  const resolvedKitObj: LabKitKit | undefined =
    kitObj ??
    (kitBarcodeFromKitLaboratory
      ? {
        id: Number(kitIdFromNumber ?? item.kitLaboratory?.id) || 0,
        kitBarcode: kitBarcodeFromKitLaboratory,
        isActive: item.kitLaboratory?.isActive,
      }
      : undefined)

  const resultMediaObj = item.resultMediaId && typeof item.resultMediaId === 'object' ? item.resultMediaId : undefined
  const mediaResultObj = item.mediaResult && typeof item.mediaResult === 'object' ? item.mediaResult : undefined
  const resolvedMedia = resultMediaObj ?? mediaResultObj
  return {
    id: Number(item.id) || 0,
    laboratoryId: item.laboratoryId != null ? Number(item.laboratoryId) : undefined,
    dieticianId: item.dieticianId != null ? Number(item.dieticianId) : undefined,
    kitId: resolvedKitObj,
    status: item.status,
    isActive: item.isActive,
    resultMediaId: resolvedMedia as LabKitMedia | undefined,
    mediaResult: mediaResultObj as LabKitMedia | undefined,
    reasonForCancellation: item.reasonForCancellation,
    createdAt: item.createdAt ?? '',
    updatedAt: item.updatedAt ?? '',
  }
}

function readNumber(v: unknown, fallback = 0) {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : fallback
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function pickItemsAndMeta(payload: unknown, requestedPage?: number): { items: ApiLaboratoryKitItem[]; totalItems: number; totalPages: number; currentPage: number } {
  if (Array.isArray(payload)) {
    return {
      items: payload as ApiLaboratoryKitItem[],
      totalItems: payload.length,
      totalPages: 1,
      currentPage: requestedPage ?? 1,
    }
  }

  const obj = asRecord(payload)
  const itemsRaw = obj?.items
  const items = Array.isArray(itemsRaw) ? (itemsRaw as ApiLaboratoryKitItem[]) : []
  const totalItems = readNumber(obj?.totalItems, items.length)
  const totalPages = readNumber(obj?.totalPages, totalItems > 0 ? 1 : 1)
  const currentPage = readNumber(obj?.currentPage, requestedPage ?? 1)
  return { items, totalItems, totalPages, currentPage }
}

/**
 * GET /laboratory-kits (paginated wrapper)
 * Response (observed): { success, message, data: { totalItems, totalPages, currentPage, items: [] } }
 */
export async function getLaboratoryKitsPage(params?: { page?: number; status?: LabKitStatus }): Promise<LaboratoryKitsPage> {
  const { data } = await api.get<unknown>('/laboratory-kits', { params })
  const top = asRecord(data)
  const payload = top && 'data' in top ? top.data : data
  const { items, totalItems, totalPages, currentPage } = pickItemsAndMeta(payload, params?.page)
  return {
    items: items.map(mapApiLabKit),
    totalItems,
    totalPages,
    currentPage,
  }
}

/**
 * GET /laboratory-kits
 * Authenticated user's laboratory kits.
 * Response: { data: LaboratoryKitResponse[] }
 */
export async function getLaboratoryKits(params?: { page?: number }): Promise<LaboratoryKit[]> {
  const page = await getLaboratoryKitsPage(params)
  return page.items
}

/**
 * GET /laboratory-kits/{id}
 */
export async function getLaboratoryKitById(id: number): Promise<LaboratoryKit> {
  const { data } = await api.get<unknown>(`/laboratory-kits/${id}`)
  const top = asRecord(data)
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
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
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
  const top = asRecord(data)
  const item = (top && 'data' in top ? top.data : data) as ApiLaboratoryKitItem
  return mapApiLabKit(item)
}
