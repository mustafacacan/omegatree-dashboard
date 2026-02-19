import type { OrderStatus, PaymentStatus } from '@/utils/constants'

export interface Order {
  id: string
  dietitianId: string
  dietitianName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  orderStatus: OrderStatus
  paymentStatus: PaymentStatus
  trackingNumber?: string
  shippingAddress: string
  note?: string
  createdAt: string
  updatedAt: string
}

export interface OrderCreateRequest {
  quantity: number
  shippingAddress: string
  note?: string
}

export interface OrderFilters {
  search?: string
  status?: OrderStatus
  dietitianId?: string
  page?: number
  limit?: number
}

export interface CariTransaction {
  id: string
  dietitianId: string
  type: 'PAYMENT' | 'KIT_PURCHASE' | 'REFUND' | 'ADJUSTMENT'
  amount: number
  description: string
  orderId?: string
  createdAt: string
}

export interface CariAccount {
  dietitianId: string
  dietitianName: string
  totalPaid: number
  totalPurchased: number
  balance: number
  transactions: CariTransaction[]
}
