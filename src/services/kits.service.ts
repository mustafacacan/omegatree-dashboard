import { api } from '@/lib/axios'
import type { components, paths } from '@/types/openapi'
import { readUserVerifiedTrue, readVerifiedFromDieticianNode } from '@/lib/user-verified'

type KitResponse = components['schemas']['KitResponse']

export interface Kit {
  id: number
  barcode: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

function mapApiKit(apiKit: KitResponse): Kit {
  return {
    id: Number(apiKit.id) || 0,
    barcode: apiKit.barcode ?? '',
    name: apiKit.name ?? '',
    isActive: apiKit.isActive ?? true,
    createdAt: apiKit.createdAt ?? new Date().toISOString(),
    updatedAt: apiKit.updatedAt ?? new Date().toISOString(),
  }
}

/** API sayfalı cevap: { data: { totalItems, totalPages, currentPage, items } } */
export interface GetKitsPaginatedResult {
  items: Kit[]
  totalItems: number
}

/** GET /kits — sayfalı: totalItems + items döner */
export async function getKitsPaginated(params?: { page?: number; limit?: number }): Promise<GetKitsPaginatedResult> {
  const { data } = await api.get<{
    data?: {
      totalItems?: number
      totalPages?: number
      currentPage?: number
      items?: KitResponse[]
    } | KitResponse[] | { items?: KitResponse[] }
  }>('/kits', {
    params: params ? { page: params.page ?? 1, limit: params.limit ?? 10 } : undefined,
  })
  const raw = data?.data
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'items' in raw) {
    const payload = raw as { totalItems?: number; items?: KitResponse[] }
    const list = payload.items ?? []
    const totalItemsNum = Number(payload.totalItems)
    const totalItems = Number.isFinite(totalItemsNum) && totalItemsNum >= 0 ? totalItemsNum : list.length
    return {
      items: (list as KitResponse[]).map(mapApiKit),
      totalItems,
    }
  }
  const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'items' in (raw as object) ? (raw as { items?: KitResponse[] }).items : []) ?? []
  const kits = (list as KitResponse[]).map(mapApiKit)
  return { items: kits, totalItems: kits.length }
}

/** GET /kits — tek sayfa liste (geriye uyumluluk) */
export async function getKits(params?: { page?: number; limit?: number }): Promise<Kit[]> {
  const res = await getKitsPaginated(params)
  return res.items
}

/** GET /kits/{kitId} */
export async function getKit(kitId: number): Promise<Kit> {
  const { data } = await api.get<KitResponse>(`/kits/${kitId}`)
  const body = (data as { data?: KitResponse })?.data ?? data
  return mapApiKit(body as KitResponse)
}

/** POST /kits */
export async function createKit(payload: { name: string; isActive?: boolean }): Promise<Kit> {
  const { data } = await api.post<{ data?: KitResponse }>('/kits', {
    name: payload.name,
    isActive: payload.isActive ?? true,
  })
  const body = data?.data ?? data
  return mapApiKit(body as KitResponse)
}

/** PUT /kits/{kitId} */
export async function updateKit(
  kitId: number,
  payload: { name?: string; isActive?: boolean }
): Promise<Kit> {
  const { data } = await api.put<{ data?: KitResponse }>(`/kits/${kitId}`, payload)
  const body = data?.data ?? data
  return mapApiKit(body as KitResponse)
}

/** POST /kits/assign/{dieticianId} — diyetisyene kit atar */
type AssignKitsRequest =
  paths['/kits/assign/{dieticianId}']['post']['requestBody']['content']['application/json']
type AssignKitsResponse =
  paths['/kits/assign/{dieticianId}']['post']['responses'][200]['content']['application/json']

export async function assignKitsToDietician(
  dieticianId: number,
  kitIds: number[]
): Promise<AssignKitsResponse> {
  const payload: AssignKitsRequest = { kitIds }
  const { data } = await api.post<AssignKitsResponse>(`/kits/assign/${dieticianId}`, payload)
  return data
}

/** Diyetisyen listesi (Diyetisyene kit ata modalı için) */
export interface DieticianOption {
  id: number
  /** Backend stocks?user= için gerekli: dietitian.user.id */
  userId?: number
  label: string
  firstName?: string
  lastName?: string
  email?: string
  isVerified: boolean
}

export interface GetDieticiansParams {
  /**
   * true: yalnızca açıkça doğrulanmış (isVerified === true) diyetisyenler.
   * false veya verilmez: id geçerli olan tüm satırlar (API isVerified göndermiyorsa boş liste oluşmaz; zimmet/atama modalları için).
   */
  onlyVerified?: boolean
}

function filterDieticianOptions(options: DieticianOption[], onlyVerified: boolean): DieticianOption[] {
  const withId = options.filter((d) => d.id > 0)
  if (!onlyVerified) return withId
  return withId.filter((d) => d.isVerified === true)
}

/** Aynı kullanıcı (userId) için birden fazla Dieticians satırı varsa tek kayıt bırakır. */
function dedupeDieticianOptions(options: DieticianOption[]): DieticianOption[] {
  const byUserKey = new Map<string, DieticianOption>()

  for (const opt of options) {
    const userKey =
      opt.userId != null && opt.userId > 0 ? `u:${opt.userId}` : `d:${opt.id}`
    const existing = byUserKey.get(userKey)
    if (!existing || opt.id < existing.id) {
      byUserKey.set(userKey, opt)
    }
  }

  return Array.from(byUserKey.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'tr')
  )
}

function finalizeDieticianOptions(
  options: DieticianOption[],
  onlyVerified: boolean,
): DieticianOption[] {
  return dedupeDieticianOptions(filterDieticianOptions(options, onlyVerified))
}

/** Stok filtresi / select value — kullanıcı (user) id */
export function getDieticianFilterUserId(option: DieticianOption): number {
  return option.userId != null && option.userId > 0 ? option.userId : option.id
}

/** GET /dieticians — diyetisyen listesi (assign dropdown için) */
export async function getDieticians(params?: GetDieticiansParams): Promise<DieticianOption[]> {
  const onlyVerified = params?.onlyVerified === true
  type DieticiansResponse = paths['/dieticians']['get']['responses'][200]['content']['application/json']
  type DieticianItem = components['schemas']['DieticianWithClientsResponse']

  // Backend bazı ortamlarda OpenAPI'den farklı olarak sayfalı bir yapı döndürüyor:
  // { success, message, data: { totalItems, totalPages, currentPage, items: [{ id, user: { firstName, lastName, email } }] } }
  type DieticiansPaginatedResponse = {
    success?: boolean
    message?: string
    data?: {
      totalItems?: number
      totalPages?: number
      currentPage?: string | number
      items?: Array<{
        id?: number
        user?: {
          firstName?: string
          lastName?: string
          email?: string
        }
      }>
    }
  }

  const { data } = await api.get<DieticiansResponse | DieticiansPaginatedResponse>('/dieticians', {
    params: { page: 1, limit: 200 },
  })

  const raw = (data as { data?: unknown })?.data

  // 1) OpenAPI: data = DieticianWithClientsResponse[] — dietician.id = user id
  if (Array.isArray(raw)) {
    const list = raw as DieticianItem[]
    return finalizeDieticianOptions(
      list.map((d) => {
        const firstName = d.dietician?.firstName
        const lastName = d.dietician?.lastName
        const fullName = [firstName, lastName].filter(Boolean).join(' ')
        const email = d.dietician?.email
        const id = Number(d.id) || 0
        const userId = Number((d.dietician as { id?: number } | undefined)?.id) || undefined
        const row = d as unknown as Record<string, unknown>
        const verified =
          readUserVerifiedTrue(row.user as Record<string, unknown> | undefined) ||
          readVerifiedFromDieticianNode(d.dietician)
        return {
          id,
          userId,
          label: fullName || email || `Diyetisyen #${id}`,
          firstName,
          lastName,
          email,
          isVerified: verified,
        }
      }),
      onlyVerified,
    )
  }

  // 2) Backend: data = { items: [{ id, user: { id, firstName, lastName, email } }] }
  if (raw && typeof raw === 'object' && 'items' in raw) {
    const items = (raw as { items?: NonNullable<DieticiansPaginatedResponse['data']>['items'] }).items ?? []
    return finalizeDieticianOptions(
      (items ?? []).map((d) => {
        const firstName = d?.user?.firstName
        const lastName = d?.user?.lastName
        const fullName = [firstName, lastName].filter(Boolean).join(' ')
        const email = d?.user?.email
        const id = Number(d?.id) || 0
        const userId = Number((d?.user as { id?: number } | undefined)?.id) || undefined
        return {
          id,
          userId,
          label: fullName || email || `Diyetisyen #${id}`,
          firstName,
          lastName,
          email,
          isVerified: readUserVerifiedTrue(d?.user as Record<string, unknown> | undefined),
        }
      }),
      onlyVerified,
    )
  }

  // 3) Tolerans: data.items olabilir (eski mapping)
  const list: DieticianItem[] = ((raw && typeof raw === 'object' && 'items' in raw
    ? (raw as { items?: DieticianItem[] }).items
    : []) ?? [])

  return finalizeDieticianOptions(
    (list ?? []).map((d) => {
      const firstName = d.dietician?.firstName
      const lastName = d.dietician?.lastName
      const fullName = [firstName, lastName].filter(Boolean).join(' ')
      const email = d.dietician?.email
      const id = Number(d.id) || 0
      const userId = Number((d.dietician as { id?: number } | undefined)?.id) || undefined
      const row = d as unknown as Record<string, unknown>
      const verified =
        readUserVerifiedTrue(row.user as Record<string, unknown> | undefined) ||
        readVerifiedFromDieticianNode(d.dietician)
      return {
        id,
        userId,
        label: fullName || email || `Diyetisyen #${id}`,
        firstName,
        lastName,
        email,
        isVerified: verified,
      }
    }),
    onlyVerified,
  )
}
