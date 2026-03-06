import { api } from '@/lib/axios'
import type { Laboratory } from '@/types/laboratory.types'

interface ApiLabUser {
  id?: number
  firstName?: string
  lastName?: string
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
  return {
    id: String(item.id ?? ''),
    name: fullName || `Laboratuvar #${item.id ?? ''}`,
    address: buildDisplayAddress(addr),
    city: addr?.city ?? '',
    district: addr?.district,
    postalCode: addr?.postalCode,
    phone: user?.phone,
    email: user?.email,
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
  }
}

export interface GetLaboratoriesParams {
  page?: number
  limit?: number
  search?: string
  sort?: 'asc' | 'desc'
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
  firstName: string
  lastName: string
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
      firstName: payload.firstName,
      lastName: payload.lastName,
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

export type { ApiLabDietician }
