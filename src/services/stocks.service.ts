import { api } from '@/lib/axios'
import type { components } from '@/types/openapi'

type StockResponse = components['schemas']['StockResponse']

export interface StockAlertSettings {
  limit: number
}

function asObj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) ? n : fallback
}

function unwrapData(payload: unknown): unknown {
  const top = asObj(payload)
  const data = top && 'data' in top ? top.data : payload
  const nested = asObj(data)
  return nested && 'data' in nested ? nested.data : data
}

/** GET /stocks/alert-settings — authenticated dietician stock alert limit */
export async function getStockAlertSettings(): Promise<StockAlertSettings> {
  const { data } = await api.get<unknown>('/stocks/alert-settings')
  const payload = unwrapData(data)
  const obj = asObj(payload) ?? {}
  return {
    limit: Math.max(0, toNumber(obj.limit, 0)),
  }
}

/** PUT /stocks/alert-settings — update authenticated dietician stock alert limit */
export async function updateStockAlertSettings(limit: number): Promise<StockAlertSettings> {
  const safe = Math.max(0, Math.floor(limit))
  const { data } = await api.put<unknown>('/stocks/alert-settings', { limit: safe })
  const payload = unwrapData(data)
  const obj = asObj(payload)
  const returnedLimit = obj && 'limit' in obj ? toNumber(obj.limit, safe) : safe
  return { limit: Math.max(0, returnedLimit) }
}

/** Stok durumu: backend yeni status'lar döndürebilir (örn: damaged-pending) */
export type StockStatus =
  | 'available'
  | 'used'
  | 'expired'
  | 'approval_pending'
  | `damaged-${string}`

export interface StockKit {
  id: number
  barcode: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StockUser {
  id: number
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  role?: string
  gender?: string
  identityNumber?: string
  createdAt?: string
  updatedAt?: string
}

export interface Stock {
  id: number
  kitId?: StockKit
  userId?: StockUser
  status?: StockStatus
  createdAt: string
  updatedAt: string
}

/** API'den gelen item: kitId/userId sayı, kit/user ile nested obje */
interface StockApiItem {
  id?: number
  kitId?: number
  userId?: number
  status?: StockStatus
  createdAt?: string
  updatedAt?: string
  kit?: {
    id?: number
    barcode?: string
    name?: string
    isActive?: boolean
    createdAt?: string
    updatedAt?: string
  }
  user?: {
    id?: number
    firstName?: string
    lastName?: string
    phone?: string
    email?: string
  }
}

function mapStockApiItem(item: StockApiItem | null | undefined): Stock {
  if (!item) {
    return { id: 0, createdAt: '', updatedAt: '' }
  }
  const kit = item.kit
  const user = item.user
  return {
    id: toNumber(item.id, 0),
    kitId: kit
      ? {
        id: toNumber(kit.id, 0),
        barcode: kit.barcode ?? '',
        name: kit.name ?? '',
        isActive: kit.isActive ?? true,
        createdAt: kit.createdAt ?? '',
        updatedAt: kit.updatedAt ?? '',
      }
      : undefined,
    userId: user
      ? {
        id: toNumber(user.id, 0),
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
      }
      : undefined,
    status: item.status,
    createdAt: item.createdAt ?? '',
    updatedAt: item.updatedAt ?? '',
  }
}

function mapStockResponse(res: StockResponse | null | undefined): Stock {
  if (!res) {
    return {
      id: 0,
      createdAt: '',
      updatedAt: '',
    }
  }
  const kit = (res as unknown as StockApiItem).kit ?? res.kitId
  const user = (res as unknown as StockApiItem).user ?? res.userId
  const kitObj = kit && typeof kit === 'object' ? kit : undefined
  const userObj = user && typeof user === 'object' ? user : undefined
  return {
    id: toNumber(res.id, 0),
    kitId: kitObj
      ? {
        id: toNumber((kitObj as StockApiItem['kit'])?.id, 0),
        barcode: (kitObj as StockApiItem['kit'])?.barcode ?? '',
        name: (kitObj as StockApiItem['kit'])?.name ?? '',
        isActive: (kitObj as StockApiItem['kit'])?.isActive ?? true,
        createdAt: (kitObj as StockApiItem['kit'])?.createdAt ?? '',
        updatedAt: (kitObj as StockApiItem['kit'])?.updatedAt ?? '',
      }
      : undefined,
    userId: userObj
      ? {
        id: toNumber((userObj as StockApiItem['user'])?.id, 0),
        firstName: (userObj as StockApiItem['user'])?.firstName,
        lastName: (userObj as StockApiItem['user'])?.lastName,
        phone: (userObj as StockApiItem['user'])?.phone,
        email: (userObj as StockApiItem['user'])?.email,
      }
      : undefined,
    status: res.status,
    createdAt: res.createdAt ?? '',
    updatedAt: res.updatedAt ?? '',
  }
}

/**
 * GET /stocks/my-stock — Giriş yapan kullanıcının (diyetisyen) stok bilgisini getirir.
 */
export async function getMyStock(): Promise<Stock> {
  const { data } = await api.get<StockResponse | { data?: StockResponse }>('/stocks/my-stock')
  const body = (data && typeof data === 'object' && 'data' in data ? (data as { data?: StockResponse }).data : data) ?? data
  return mapStockResponse(body as StockResponse)
}

/**
 * GET /stocks/my-stock — Diyetisyenin stok listesi.
 * API tek obje veya dizi dönebilir; her zaman Stock[] döndürür.
 */
export async function getMyStockList(): Promise<Stock[]> {
  const { data } = await api.get<StockResponse | StockResponse[] | { data?: StockResponse | StockResponse[] }>('/stocks/my-stock')
  const raw = (data && typeof data === 'object' && 'data' in data ? (data as { data?: StockResponse | StockResponse[] }).data : data) ?? data
  const list = Array.isArray(raw) ? raw : [raw]
  return (list as StockResponse[]).map((item) => mapStockResponse(item))
}

/**
 * POST /stocks/approved-to-stock — Barkod ile stok onayı; diyetisyen kiti teslim alır.
 * Body: { barcode: string } (tek string, dizi değil)
 */
export async function approveToStock(barcode: string): Promise<Stock> {
  const { data } = await api.post<StockResponse | { data?: StockResponse }>('/stocks/approved-to-stock', {
    barcode,
  })
  const body = (data && typeof data === 'object' && 'data' in data ? (data as { data?: StockResponse }).data : data) ?? data
  return mapStockResponse(body as StockResponse)
}

export interface GetStocksParams {
  page?: number
  limit?: number
  search?: string
  sort?: 'asc' | 'desc'
  /** Diyetisyen ID; gönderilmezse admin stoğu (tüm stok) döner. */
  user?: number
}

export interface GetStocksResult {
  data: Stock[]
  totalItems: number
  totalPages: number
  currentPage: number
}

/** GET /stocks API yanıtı: data.items + data.totalItems, totalPages, currentPage */
interface GetStocksApiResponse {
  success?: boolean
  message?: string
  data?: {
    totalItems?: number
    totalPages?: number
    currentPage?: string | number
    items?: StockApiItem[]
  }
}

/**
 * GET /stocks — Tüm stokları sayfalama/arama/sıralama ile listeler (admin).
 */
export async function getStocks(params?: GetStocksParams): Promise<GetStocksResult> {
  const { data } = await api.get<GetStocksApiResponse>('/stocks', {
    params: params
      ? {
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        ...(params.search != null && params.search !== '' && { search: params.search }),
        ...(params.sort != null && { sort: params.sort }),
        ...(params.user != null && params.user !== undefined && { user: params.user }),
      }
      : undefined,
  })
  const payload = data?.data
  const top = data as { items?: StockApiItem[]; totalItems?: number; totalPages?: number; currentPage?: number | string } | undefined
  // Backend farklı formatlarda dönebilir: data.data.items | data.data = dizi | data.items (üst seviye)
  const rawItems = Array.isArray(payload)
    ? payload
    : (payload && typeof payload === 'object' && 'items' in payload
      ? (payload as { items?: StockApiItem[] }).items
      : top?.items) ?? []
  const items = Array.isArray(rawItems) ? rawItems : []
  const totalItems = Array.isArray(payload)
    ? payload.length
    : Number(
      (payload && typeof payload === 'object' && 'totalItems' in payload
        ? (payload as { totalItems?: number }).totalItems
        : top?.totalItems) ?? 0
    ) || 0
  const totalPages = Number(
    (payload && typeof payload === 'object' && 'totalPages' in payload
      ? (payload as { totalPages?: number }).totalPages
      : top?.totalPages) ?? 1
  ) || 1
  const currentPageRaw = payload && typeof payload === 'object' && 'currentPage' in payload
    ? (payload as { currentPage?: number | string }).currentPage
    : top?.currentPage
  const currentPage = typeof currentPageRaw === 'string' ? parseInt(currentPageRaw, 10) : Number(currentPageRaw) || 1
  return {
    data: items.map((item) => mapStockApiItem(item)),
    totalItems: Number.isNaN(totalItems) ? 0 : totalItems,
    totalPages: Number.isNaN(totalPages) ? 1 : totalPages,
    currentPage: Number.isNaN(currentPage) ? 1 : currentPage,
  }
}
