import { api } from '@/lib/axios'
import type { components } from '@/types/openapi'

type StockResponse = components['schemas']['StockResponse']

/** Stok durumu: available | used | expired | approval_pending */
export type StockStatus = 'available' | 'used' | 'expired' | 'approval_pending'

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
    id: Number(item.id) ?? 0,
    kitId: kit
      ? {
          id: Number(kit.id) ?? 0,
          barcode: kit.barcode ?? '',
          name: kit.name ?? '',
          isActive: kit.isActive ?? true,
          createdAt: kit.createdAt ?? '',
          updatedAt: kit.updatedAt ?? '',
        }
      : undefined,
    userId: user
      ? {
          id: Number(user.id) ?? 0,
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
    id: Number(res.id) ?? 0,
    kitId: kitObj
      ? {
          id: Number(kitObj.id) ?? 0,
          barcode: (kitObj as StockApiItem['kit'])?.barcode ?? '',
          name: (kitObj as StockApiItem['kit'])?.name ?? '',
          isActive: (kitObj as StockApiItem['kit'])?.isActive ?? true,
          createdAt: (kitObj as StockApiItem['kit'])?.createdAt ?? '',
          updatedAt: (kitObj as StockApiItem['kit'])?.updatedAt ?? '',
        }
      : undefined,
    userId: userObj
      ? {
          id: Number(userObj.id) ?? 0,
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
        }
      : undefined,
  })
  const payload = data?.data
  const items = payload?.items ?? []
  const totalItems = payload?.totalItems ?? 0
  const totalPages = payload?.totalPages ?? 1
  const currentPage = typeof payload?.currentPage === 'string' ? parseInt(payload.currentPage, 10) : (payload?.currentPage ?? 1)
  return {
    data: items.map((item) => mapStockApiItem(item)),
    totalItems,
    totalPages: Number.isNaN(totalPages) ? 1 : totalPages,
    currentPage: Number.isNaN(currentPage) ? 1 : currentPage,
  }
}
