import { api } from '@/lib/axios'
import type { components } from '@/types/openapi'

type OrderResponse = components['schemas']['OrderResponse']
type CreateOrderBody = components['schemas']['CreateOrder']
type Pagination = components['schemas']['Pagination']

/** API'den dönen sipariş satırı (GET /orders response.data.items[]) */
export interface OrderItem {
  id: number
  orderNumber?: string
  userId?: number
  addressId?: number
  salesKitId?: number
  quantity: number
  unitPrice?: string | number
  totalPrice?: string | number
  status?: string
  paymenStatus?: string
  paymentMethod?: string
  dekontMediaId?: number | null
  createdAt?: string
  updatedAt?: string
  user?: {
    id?: number
    firstName?: string
    lastName?: string
    phone?: string
  }
  salesKit?: {
    id?: number
    name?: string
    price?: string | number
    quantity?: number
  }
  address?: {
    id?: number
    city?: string
    district?: string
    fullAddress?: string
  }
}

/** GET /orders yanıtı: success, message, data: { totalItems, totalPages, currentPage, items } */
export interface OrdersListResponse {
  success?: boolean
  message?: string
  data?: {
    totalItems?: number
    totalPages?: number
    currentPage?: number
    items?: OrderItem[]
  }
}

export type Order = OrderItem

export interface GetOrdersParams {
  page?: Pagination
}

export interface GetOrdersResult {
  items: OrderItem[]
  totalItems: number
  totalPages: number
  currentPage: number
}

export interface CreateOrderParams {
  quantity: number
  paymentMethod: CreateOrderBody['paymentMethod']
  isPaid?: boolean
  /** Teslimat adresi (ayarlardan seçilen); backend destekliyorsa kullanılır */
  addressId?: number
}

export interface UploadOrderDekontParams {
  orderId: number
  file: File
}

/** Create a new order (dietitian places order for a sales kit) */
export async function createOrder(
  salesKitId: number,
  params: CreateOrderParams
): Promise<OrderResponse> {
  const form = new FormData()
  form.append('quantity', String(params.quantity))
  form.append('paymentMethod', params.paymentMethod)
  if (params.isPaid !== undefined) {
    form.append('isPaid', String(params.isPaid))
  }
  if (params.addressId != null) {
    form.append('addressId', String(params.addressId))
  }
  const { data } = await api.post<OrderResponse>(
    `/orders/create/${salesKitId}`,
    form,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
  return data
}

/** Get all orders — response: { success, message, data: { totalItems, totalPages, currentPage, items } } */
export async function getOrders(params?: GetOrdersParams): Promise<OrderItem[]> {
  const { data } = await api.get<OrdersListResponse>('/orders', {
    params: params?.page ? { page: params.page } : undefined,
  })
  const dataObj = data?.data
  const items = dataObj && typeof dataObj === 'object' && 'items' in dataObj ? (dataObj as { items?: OrderItem[] }).items : undefined
  return Array.isArray(items) ? items : []
}

/** Get orders with pagination info (admin tablo sayfalama için) */
export async function getOrdersWithPagination(params?: GetOrdersParams): Promise<GetOrdersResult> {
  const { data } = await api.get<OrdersListResponse>('/orders', {
    params: params?.page ? { page: params.page } : undefined,
  })
  const dataObj = data?.data
  const items = dataObj && typeof dataObj === 'object' && 'items' in dataObj ? (dataObj as { items?: OrderItem[] }).items : undefined
  const list = Array.isArray(items) ? items : []
  return {
    items: list,
    totalItems: dataObj && typeof dataObj === 'object' && 'totalItems' in dataObj ? (Number((dataObj as { totalItems?: number }).totalItems) || 0) : list.length,
    totalPages: dataObj && typeof dataObj === 'object' && 'totalPages' in dataObj ? (Number((dataObj as { totalPages?: number }).totalPages) || 1) : 1,
    currentPage: dataObj && typeof dataObj === 'object' && 'currentPage' in dataObj ? (Number((dataObj as { currentPage?: number }).currentPage) || 1) : 1,
  }
}

/** Get a single order by ID */
export async function getOrderById(id: number): Promise<OrderResponse> {
  const { data } = await api.get<OrderResponse>(`/orders/${id}`)
  return data
}

/** Update order status (admin) */
export async function updateOrderStatus(
  id: number,
  status: 'pending' | 'completed' | 'cancelled'
): Promise<OrderResponse> {
  const { data } = await api.put<OrderResponse>(`/orders/update-status/${id}`, {
    status,
  })
  return data
}

/** Upload dekont (receipt) file for an existing order.
 *
 * Note: This endpoint is not present in the current OpenAPI spec, but backend
 * commonly supports updating an order with multipart/form-data similar to other
 * modules (e.g. damaged-kits, laboratory-kits).
 */
export async function uploadOrderDekont(params: UploadOrderDekontParams): Promise<OrderItem | null> {
  const form = new FormData()
  form.append('dekontMediaId', params.file)

  const { data } = await api.put<unknown>(`/add-dekont/${params.orderId}`, form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  const body =
    data && typeof data === 'object' && data !== null && 'data' in data
      ? (data as { data?: unknown }).data
      : data

  if (!body || typeof body !== 'object') return null
  return body as OrderItem
}
