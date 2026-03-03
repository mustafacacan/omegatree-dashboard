import { api } from '@/lib/axios'
import type { components } from '@/types/openapi'

type OrderResponse = components['schemas']['OrderResponse']
type CreateOrderBody = components['schemas']['CreateOrder']
type Pagination = components['schemas']['Pagination']

/** API'den dönen sipariş satırı (GET /orders response.data.items[]) */
export interface OrderItem {
  id: number
  userId?: number
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
    totalItems: dataObj && typeof dataObj === 'object' && 'totalItems' in dataObj ? Number((dataObj as { totalItems?: number }).totalItems) ?? 0 : list.length,
    totalPages: dataObj && typeof dataObj === 'object' && 'totalPages' in dataObj ? Number((dataObj as { totalPages?: number }).totalPages) ?? 1 : 1,
    currentPage: dataObj && typeof dataObj === 'object' && 'currentPage' in dataObj ? Number((dataObj as { currentPage?: number }).currentPage) ?? 1 : 1,
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
