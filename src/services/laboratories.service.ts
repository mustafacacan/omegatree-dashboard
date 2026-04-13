import { api } from '@/lib/axios'
import type { Laboratory } from '@/types/laboratory.types'
import { readUserVerifiedTrue } from '@/lib/user-verified'

interface ApiLabUser {
  id?: number
  firstName?: string
  lastName?: string
  companyName?: string | null
  phone?: string
  email?: string
  password?: string
  role?: string
  gender?: string
  identityNumber?: string
  isVerified?: boolean
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

interface ApiLabAddress {
  id?: number
  userId?: number
  title?: string
  country?: string
  city?: string
  district?: string
  street?: string
  neighborhood?: string
  no?: string
  fullAddress?: string
  postalCode?: string
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

interface ApiLaboratoryItem {
  id?: number
  userId?: number
  addressId?: number
  user?: ApiLabUser
  address?: ApiLabAddress
  /** Detail endpoint may return user under this key */
  userLaboratory?: ApiLabUser
  /** Detail endpoint may return address under this key */
  laboratoryAddress?: ApiLabAddress
  cargofirm?: string
  cargoNumber?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
  /** Bazen liste cevabında telefon/email üst seviyede döner */
  phone?: string
  email?: string
}

interface ApiLabDietician {
  id?: number
  laboratory?: ApiLaboratoryItem
  dietician?: {
    id?: number
    user?: ApiLabUser
  }
  createdAt?: string
  updatedAt?: string
}

function buildDisplayAddress(addr: ApiLabAddress | undefined): string {
  if (!addr) return ''
  if (addr.fullAddress?.trim()) return addr.fullAddress.trim()
  const parts = [
    addr.street,
    addr.no ? `No:${addr.no}` : null,
    addr.neighborhood,
    addr.district,
    addr.city,
    addr.country,
  ].filter(Boolean)
  return parts.join(', ')
}

function mapApiLabToLab(item: ApiLaboratoryItem): Laboratory {
  const user = item.userLaboratory ?? item.user
  const addr = item.laboratoryAddress ?? item.address
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
  const phone = user?.phone ?? item.phone
  const email = user?.email ?? item.email
  return {
    id: String(item.id ?? ''),
    name: fullName || `Laboratuvar #${item.id ?? ''}`,
    companyName: user?.companyName ?? undefined,
    address: buildDisplayAddress(addr),
    city: addr?.city ?? '',
    district: addr?.district,
    postalCode: addr?.postalCode,
    phone: phone || undefined,
    email: email || undefined,
    assignedDietitians: [],
    createdAt: item.createdAt ?? '',
    updatedAt: item.updatedAt ?? '',
    cargofirm: item.cargofirm,
    cargoNumber: item.cargoNumber,
    isActive: item.isActive,
    userId: item.userId ?? user?.id,
    street: addr?.street,
    neighborhood: addr?.neighborhood,
    no: addr?.no,
    fullAddress: addr?.fullAddress,
    country: addr?.country,
    addressTitle: addr?.title,
    firstName: user?.firstName,
    lastName: user?.lastName,
    gender: user?.gender,
    isUserVerified: readUserVerifiedTrue(user as Record<string, unknown> | undefined),
  }
}

export interface GetLaboratoriesParams {
  page?: number
  limit?: number
  search?: string
  sort?: 'asc' | 'desc'
}

export interface GetLaboratoriesWithPaginationResult {
  items: Laboratory[]
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

function pickItemsAndMeta(body: unknown): { items: ApiLaboratoryItem[]; meta: Record<string, unknown> } {
  // Common shapes observed across endpoints:
  // 1) { success, message, data: { items, totalItems, totalPages, currentPage } }
  // 2) { data: { items, totalItems, ... } }
  // 3) { data: LaboratoryResponse[] }
  // 4) LaboratoryResponse[]
  if (Array.isArray(body)) return { items: body as ApiLaboratoryItem[], meta: {} }
  if (!isRecord(body)) return { items: [], meta: {} }

  const top = body
  const payload = 'data' in top ? (top.data as unknown) : body

  if (Array.isArray(payload)) return { items: payload as ApiLaboratoryItem[], meta: top }
  if (isRecord(payload)) {
    if (Array.isArray(payload.items)) return { items: payload.items as ApiLaboratoryItem[], meta: payload }
    if (Array.isArray(payload.data)) return { items: payload.data as ApiLaboratoryItem[], meta: payload }
  }

  return { items: [], meta: isRecord(payload) ? payload : top }
}

/**
 * GET /laboratories
 * Response: { data: LaboratoryResponse[] } veya paginated { data: { items, totalItems, ... } }
 */
export async function getLaboratories(params?: GetLaboratoriesParams): Promise<Laboratory[]> {
  const { data } = await api.get<unknown>('/laboratories', {
    params: params
      ? {
        page: params.page ?? 1,
        limit: params.limit ?? 200,
        ...(params.search && { search: params.search }),
        ...(params.sort && { sort: params.sort }),
      }
      : undefined,
  })
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const payload = top && 'data' in top ? top.data : data
  const list: ApiLaboratoryItem[] = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && 'items' in (payload as Record<string, unknown>)
      ? ((payload as Record<string, unknown>).items as ApiLaboratoryItem[]) ?? []
      : []
  return list.map(mapApiLabToLab)
}

/** GET /laboratories — items + pagination meta */
export async function getLaboratoriesWithPagination(params?: GetLaboratoriesParams): Promise<GetLaboratoriesWithPaginationResult> {
  const page = params?.page ?? 1
  const limit = params?.limit ?? 10
  const search = params?.search != null && String(params.search).trim() ? String(params.search).trim() : undefined

  const { data } = await api.get<unknown>('/laboratories', {
    params: params
      ? {
        page,
        limit,
        ...(search ? { search } : {}),
        ...(params.sort && { sort: params.sort }),
      }
      : { page, limit },
  })

  const { items, meta } = pickItemsAndMeta(data)
  const mapped = items.map(mapApiLabToLab)

  const totalItems = readNumber(meta, ['totalItems', 'total', 'count', 'itemsCount'], mapped.length)
  const totalPages = readNumber(meta, ['totalPages', 'pages', 'pageCount'], Math.max(1, Math.ceil(totalItems / Math.max(1, limit))))
  const currentPage = readNumber(meta, ['currentPage', 'page'], page)

  return { items: mapped, totalItems, totalPages, currentPage }
}

/**
 * GET /laboratories/{id}
 */
export async function getLaboratoryById(id: string | number): Promise<Laboratory> {
  const { data } = await api.get<unknown>(`/laboratories/${id}`)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as ApiLaboratoryItem
  return mapApiLabToLab(item)
}

/**
 * POST /laboratories
 * Body: { user, cargofirm, cargoNumber, address }
 */
export async function createLaboratory(payload: {
  companyName: string
  firstName?: string
  lastName?: string
  phone: string
  gender: 'male' | 'female'
  email?: string
  identityNumber?: string
  cargofirm: string
  cargoNumber: string
  address: {
    title: string
    country: string
    city: string
    district: string
    street: string
    neighborhood: string
    no?: string
    fullAddress?: string
    postalCode: string
  }
}): Promise<Laboratory> {
  const now = new Date().toISOString()
  const body: Record<string, unknown> = {
    user: {
      companyName: payload.companyName,
      phone: payload.phone,
      gender: payload.gender,
      ...(payload.email ? { email: payload.email } : {}),
      ...(payload.identityNumber ? { identityNumber: payload.identityNumber } : {}),
    },
    cargofirm: payload.cargofirm,
    cargoNumber: payload.cargoNumber,
    address: {
      title: payload.address.title,
      country: payload.address.country,
      city: payload.address.city,
      district: payload.address.district,
      street: payload.address.street,
      neighborhood: payload.address.neighborhood,
      ...(payload.address.no ? { no: payload.address.no } : {}),
      ...(payload.address.fullAddress ? { fullAddress: payload.address.fullAddress } : {}),
      postalCode: payload.address.postalCode,
      createdAt: now,
      updatedAt: now,
    },
  }

  const user = body.user as Record<string, unknown>
  if (payload.firstName != null && String(payload.firstName).trim()) user.firstName = String(payload.firstName).trim()
  if (payload.lastName != null && String(payload.lastName).trim()) user.lastName = String(payload.lastName).trim()

  console.log('[createLaboratory] request body:', JSON.stringify(body, null, 2))

  const { data } = await api.post<unknown>('/laboratories', body)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as ApiLaboratoryItem
  return mapApiLabToLab(item)
}

/**
 * PUT /laboratories/{id}
 * Body: { cargofirm?, cargoNumber? }
 */
export async function updateLaboratory(
  id: string,
  payload: { cargofirm?: string; cargoNumber?: string }
): Promise<Laboratory> {
  const { data } = await api.put<unknown>(`/laboratories/${id}`, payload)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as ApiLaboratoryItem
  return mapApiLabToLab(item)
}

/**
 * DELETE /laboratories/{id}
 */
export async function deleteLaboratory(id: string): Promise<void> {
  await api.delete(`/laboratories/${id}`)
}

/* ─── Laboratory-Dietician ─── */

/**
 * GET /laboratory-dietician — paginated list of lab-dietician assignments.
 */
export async function getLabDietitianAssignments(): Promise<ApiLabDietician[]> {
  const { data } = await api.get<unknown>('/laboratory-dietician', {
    params: { page: 1, limit: 500 },
  })
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const payload = top && 'data' in top ? top.data : data
  if (Array.isArray(payload)) return payload as ApiLabDietician[]
  if (payload && typeof payload === 'object' && 'items' in (payload as Record<string, unknown>)) {
    return ((payload as Record<string, unknown>).items as ApiLabDietician[]) ?? []
  }
  return []
}

/**
 * POST /laboratory-dietician — assign a dietician to a laboratory.
 * Body: { laboratoryId, dieticianId }
 */
export async function assignDietitianToLab(
  laboratoryId: number,
  dieticianId: number
): Promise<void> {
  await api.post('/laboratory-dietician', { laboratoryId, dieticianId })
}

/**
 * PUT /laboratory-dietician/{id} — update an assignment.
 */
export async function updateLabDietitianAssignment(
  id: number,
  payload: { laboratoryId: number; dieticianId: number }
): Promise<void> {
  await api.put(`/laboratory-dietician/${id}`, payload)
}

/**
 * GET /laboratory-dietician/dieticians-view-laboratory
 * Authenticated dietician's lab view.
 */
export async function getDieticiansViewLaboratory(): Promise<ApiLabDietician | null> {
  try {
    const { data } = await api.get<unknown>('/laboratory-dietician/dieticians-view-laboratory')
    const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
    const payload = top && 'data' in top ? top.data : data
    return (payload as ApiLabDietician) ?? null
  } catch {
    return null
  }
}

/**
 * Convenience helper for dietitian dashboard.
 * Returns the authenticated dietician's assigned laboratory (address + cargo info included).
 */
export async function getDietitiansAssignedLaboratory(): Promise<Laboratory | null> {
  const assignment = await getDieticiansViewLaboratory()
  if (!assignment?.laboratory) return null
  return mapApiLabToLab(assignment.laboratory)
}

/* ─── Statistics ─── */

export interface LaboratoryStatisticsItem {
  laboratoryId: number
  laboratoryUser?: {
    id?: number
    firstName?: string
    lastName?: string
    email?: string
  }
  totals?: {
    totalKits?: number
    pendingKits?: number
    inProgressKits?: number
    completedKits?: number
    cancelledKits?: number
    reportCount?: number
    lastReportAt?: string
  }
  interest?: {
    windowDays?: number
    recentCompletedKits?: number
    completedPerWeek?: number
    completionRate?: number
    avgCompletionSeconds?: number
    recentAvgCompletionSeconds?: number
  }
}

export type LaboratoriesStatisticsResponse = LaboratoryStatisticsItem[]

/**
 * GET /laboratories/statistics
 * Swagger'da 200 response schema tanimsiz oldugu icin unknown olarak alinir.
 */
export async function getLaboratoriesStatistics(params?: { days?: number }): Promise<LaboratoriesStatisticsResponse> {
  const { data } = await api.get<unknown>('/laboratories/statistics', {
    params: params?.days != null ? { days: params.days } : undefined,
  })
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const payload = top && 'data' in top ? top.data : data

  if (Array.isArray(payload)) return payload as LaboratoriesStatisticsResponse
  if (isRecord(payload) && Array.isArray(payload.items)) return payload.items as LaboratoriesStatisticsResponse
  return []
}

/**
 * GET /laboratories/{id}/statistics
 * Swagger'da 200 response schema tanimsiz oldugu icin unknown olarak alinir.
 */
export async function getLaboratoryStatisticsById(
  id: string | number,
  params?: { days?: number }
): Promise<LaboratoryStatisticsItem | null> {
  const { data } = await api.get<unknown>(`/laboratories/${id}/statistics`, {
    params: params?.days != null ? { days: params.days } : undefined,
  })
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const payload = top && 'data' in top ? top.data : data

  if (Array.isArray(payload)) return (payload[0] as unknown as LaboratoryStatisticsItem | undefined) ?? null
  if (isRecord(payload)) return payload as unknown as LaboratoryStatisticsItem
  return null
}

export type { ApiLabDietician }
