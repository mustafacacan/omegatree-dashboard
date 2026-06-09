import { api } from '@/lib/axios'
import type { components } from '@/types/openapi'
import { readUserVerifiedTrue, readVerifiedFromDieticianNode } from '@/lib/user-verified'
import { UserStatus } from '@/utils/constants'

type CreateDieticianBody = components['schemas']['CreateDietician']
type DieticianResponse = components['schemas']['DieticianResponse']

/** Admin tablosu satırı — `id` kullanıcı (user) id; güncelleme/silme PUT/DELETE /users/:id */
export interface AdminDietitianRow {
  dieticianId: number
  id: string
  firstName: string
  lastName: string
  companyName: string | null
  email: string
  phone: string
  gender?: 'male' | 'female'
  status: UserStatus
  createdAt: string
}

function resolveDieticianPk(row: Record<string, unknown>): number {
  const n = (v: unknown) => {
    const x = Number(v)
    return Number.isFinite(x) && x > 0 ? x : 0
  }
  const top = n(row.id)
  if (top > 0) return top
  const byKey = n(row.dieticianId)
  if (byKey > 0) return byKey
  const dc = row.dietician
  if (dc && typeof dc === 'object' && !Array.isArray(dc)) {
    const nid = n((dc as Record<string, unknown>).id)
    if (nid > 0) return nid
  }
  return 0
}

function parseDieticiansListPayload(data: unknown): { rows: unknown[]; totalItems: number } {
  if (!data || typeof data !== 'object') return { rows: [], totalItems: 0 }
  const top = data as Record<string, unknown>
  const inner = top.data

  if (Array.isArray(inner)) {
    return { rows: inner, totalItems: inner.length }
  }
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const mid = inner as Record<string, unknown>
    if (Array.isArray(mid.items)) {
      const t = Number(mid.totalItems)
      return {
        rows: mid.items,
        totalItems: Number.isFinite(t) && t >= 0 ? t : mid.items.length,
      }
    }
    if (Array.isArray(mid.data)) {
      const arr = mid.data as unknown[]
      const t = Number(mid.totalItems)
      return {
        rows: arr,
        totalItems: Number.isFinite(t) && t >= 0 ? t : arr.length,
      }
    }
    const dd = mid.data
    if (dd && typeof dd === 'object' && !Array.isArray(dd) && Array.isArray((dd as Record<string, unknown>).items)) {
      const items = (dd as { items: unknown[] }).items
      const t = Number((dd as Record<string, unknown>).totalItems)
      return {
        rows: items,
        totalItems: Number.isFinite(t) && t >= 0 ? t : items.length,
      }
    }
  }
  if (Array.isArray(top.items)) {
    const t = Number(top.totalItems)
    return {
      rows: top.items,
      totalItems: Number.isFinite(t) && t >= 0 ? t : top.items.length,
    }
  }
  return { rows: [], totalItems: 0 }
}

function mapApiRowToAdmin(row: unknown): AdminDietitianRow | null {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null
  const r = row as Record<string, unknown>
  const user = r.user as Record<string, unknown> | undefined
  const dieticianNested = r.dietician as Record<string, unknown> | undefined

  const dieticianId = resolveDieticianPk(r)
  const userIdNum = Number(user?.id)
  const nestedId = Number(dieticianNested?.id)
  const uid =
    Number.isFinite(userIdNum) && userIdNum > 0
      ? userIdNum
      : Number.isFinite(nestedId) && nestedId > 0
        ? nestedId
        : 0

  if (dieticianId <= 0 || uid <= 0) return null

  const firstName = String(user?.firstName ?? dieticianNested?.firstName ?? '')
  const lastName = String(user?.lastName ?? dieticianNested?.lastName ?? '')
  const companyNameRaw = user?.companyName ?? dieticianNested?.companyName
  const companyName =
    companyNameRaw == null || companyNameRaw === '' ? null : String(companyNameRaw)
  const email = String(user?.email ?? dieticianNested?.email ?? '')
  const phone = String(user?.phone ?? dieticianNested?.phone ?? '')
  const genderRaw = user?.gender ?? dieticianNested?.gender
  const gender = genderRaw === 'female' || genderRaw === 'male' ? genderRaw : undefined

  const verified =
    readUserVerifiedTrue(user) ||
    readVerifiedFromDieticianNode(dieticianNested) ||
    readVerifiedFromDieticianNode(r)
  const status = verified ? UserStatus.ACTIVE : UserStatus.PENDING

  const createdAtRaw = user?.createdAt ?? dieticianNested?.createdAt ?? r.createdAt
  const createdAt =
    typeof createdAtRaw === 'string' && createdAtRaw.trim()
      ? createdAtRaw
      : new Date().toISOString()

  return {
    dieticianId,
    id: String(uid),
    firstName,
    lastName,
    companyName,
    email,
    phone,
    gender,
    status,
    createdAt,
  }
}

function unwrapData<T>(data: unknown): T | undefined {
  if (data && typeof data === 'object' && 'data' in (data as object)) {
    return (data as { data?: T }).data
  }
  return data as T | undefined
}

export interface GetDieticiansPaginatedParams {
  page?: number
  limit?: number
  search?: string
  sort?: 'createdAt' | 'firstName' | 'lastName'
}

export interface GetDieticiansPaginatedResult {
  items: AdminDietitianRow[]
  totalItems: number
  totalPages: number
  currentPage: number
}

/** GET /dieticians — admin tablosu (sayfalı) */
export async function getDieticiansPaginated(
  params?: GetDieticiansPaginatedParams
): Promise<GetDieticiansPaginatedResult> {
  const page = params?.page ?? 1
  const limit = params?.limit ?? 50
  const search = params?.search != null && String(params.search).trim()
    ? String(params.search).trim()
    : undefined

  const { data } = await api.get<unknown>('/dieticians', {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
      ...(params?.sort ? { sort: params.sort } : {}),
    },
  })

  const { rows, totalItems: rawTotal } = parseDieticiansListPayload(data)
  const mapped = rows.map(mapApiRowToAdmin).filter((x): x is AdminDietitianRow => x != null)

  const seenUserIds = new Set<string>()
  const items = mapped.filter((row) => {
    if (seenUserIds.has(row.id)) return false
    seenUserIds.add(row.id)
    return true
  })

  const totalItems =
    Number.isFinite(rawTotal) && rawTotal >= 0 ? rawTotal : items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, limit)))

  return {
    items,
    totalItems,
    totalPages,
    currentPage: page,
  }
}

function mapDieticianResponseToAdmin(res: DieticianResponse | undefined | null): AdminDietitianRow | null {
  if (!res || typeof res !== 'object') return null
  const u = res.user
  const dieticianId = Number(res.id) || 0
  const uid = Number(u?.id) || 0
  if (dieticianId <= 0 || uid <= 0) return null

  const verified = readUserVerifiedTrue(u as Record<string, unknown> | undefined)
  const status = verified ? UserStatus.ACTIVE : UserStatus.PENDING

  return {
    dieticianId,
    id: String(uid),
    firstName: u?.firstName ?? '',
    lastName: u?.lastName ?? '',
    companyName: u?.companyName ?? null,
    email: u?.email ?? '',
    phone: u?.phone ?? '',
    gender: u?.gender === 'female' || u?.gender === 'male' ? u.gender : undefined,
    status,
    createdAt: u?.createdAt ?? new Date().toISOString(),
  }
}

/** GET /dieticians/{dieticianId} — düzenleme öncesi detay */
export async function getDieticianById(dieticianId: number): Promise<AdminDietitianRow | null> {
  const { data } = await api.get<unknown>(`/dieticians/${dieticianId}`)
  const payload = unwrapData<DieticianResponse>(data) ?? (data as DieticianResponse)
  return mapDieticianResponseToAdmin(payload)
}

/** POST /dieticians — yeni diyetisyen */
export async function createDietician(payload: {
  firstName?: string
  lastName?: string
  companyName?: string
  phone: string
  email?: string
  gender: 'male' | 'female'
  vkn?: string
}): Promise<void> {
  const user: CreateDieticianBody['user'] = {
    phone: payload.phone.trim(),
    gender: payload.gender,
    ...(payload.firstName != null && String(payload.firstName).trim()
      ? { firstName: String(payload.firstName).trim() }
      : {}),
    ...(payload.lastName != null && String(payload.lastName).trim()
      ? { lastName: String(payload.lastName).trim() }
      : {}),
    ...(payload.companyName != null && String(payload.companyName).trim()
      ? { companyName: String(payload.companyName).trim() }
      : {}),
    ...(payload.email != null && String(payload.email).trim()
      ? { email: String(payload.email).trim() }
      : {}),
  }

  const body: CreateDieticianBody = {
    user,
    ...(payload.vkn != null && String(payload.vkn).trim() ? { vkn: String(payload.vkn).trim() } : {}),
  }

  await api.post('/dieticians', body)
}
