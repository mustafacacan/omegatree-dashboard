export const UserRole = {
  ADMIN: 'ADMIN',
  DIETITIAN: 'DIETITIAN',
  LAB: 'LAB',
  SPECIALIST: 'SPECIALIST',
  DANISAN: 'DANISAN',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const UserStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]

export const KitStatus = {
  IN_STOCK: 'IN_STOCK',
  ASSIGNED: 'ASSIGNED',
  DELIVERED: 'DELIVERED',
  CLIENT_RECEIVED: 'CLIENT_RECEIVED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  DAMAGED: 'DAMAGED',
  SAMPLE_SENT: 'SAMPLE_SENT',
  LAB_PENDING: 'LAB_PENDING',
  REJECTED: 'REJECTED',
  IN_ANALYSIS: 'IN_ANALYSIS',
  ANALYSIS_COMPLETE: 'ANALYSIS_COMPLETE',
  SPECIALIST_POOL: 'SPECIALIST_POOL',
  REPORT_READY: 'REPORT_READY',
  ADMIN_APPROVAL: 'ADMIN_APPROVAL',
  COMPLETED: 'COMPLETED',
} as const
export type KitStatus = (typeof KitStatus)[keyof typeof KitStatus]

export const OrderStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

export const PaymentStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  REFUNDED: 'REFUNDED',
} as const
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

export const SampleStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  IN_ANALYSIS: 'IN_ANALYSIS',
  COMPLETED: 'COMPLETED',
} as const
export type SampleStatus = (typeof SampleStatus)[keyof typeof SampleStatus]

export const ReportStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REVISION: 'REVISION',
} as const
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus]

export const KIT_STATUS_LABELS: Record<KitStatus, string> = {
  [KitStatus.IN_STOCK]: 'Stokta',
  [KitStatus.ASSIGNED]: 'Zimmetlendi',
  [KitStatus.DELIVERED]: 'Teslim Edildi',
  [KitStatus.CLIENT_RECEIVED]: 'Danisan Teslim Aldi',
  [KitStatus.RETURN_REQUESTED]: 'Iade Talebi',
  [KitStatus.DAMAGED]: 'Hasarli',
  [KitStatus.SAMPLE_SENT]: 'Numune Gonderildi',
  [KitStatus.LAB_PENDING]: 'Lab Bekliyor',
  [KitStatus.REJECTED]: 'Reddedildi',
  [KitStatus.IN_ANALYSIS]: 'Analizde',
  [KitStatus.ANALYSIS_COMPLETE]: 'Analiz Tamamlandi',
  [KitStatus.SPECIALIST_POOL]: 'Uzman Havuzunda',
  [KitStatus.REPORT_READY]: 'Rapor Hazir',
  [KitStatus.ADMIN_APPROVAL]: 'Admin Onayinda',
  [KitStatus.COMPLETED]: 'Tamamlandi',
}

export const KIT_STATUS_COLORS: Record<KitStatus, string> = {
  [KitStatus.IN_STOCK]: 'bg-surface-100 text-surface-600',
  [KitStatus.ASSIGNED]: 'bg-primary-50 text-primary-700',
  [KitStatus.DELIVERED]: 'bg-green-50 text-green-700',
  [KitStatus.CLIENT_RECEIVED]: 'bg-green-50 text-green-700',
  [KitStatus.RETURN_REQUESTED]: 'bg-amber-50 text-amber-700',
  [KitStatus.DAMAGED]: 'bg-red-50 text-red-700',
  [KitStatus.SAMPLE_SENT]: 'bg-violet-50 text-violet-700',
  [KitStatus.LAB_PENDING]: 'bg-amber-50 text-amber-700',
  [KitStatus.REJECTED]: 'bg-red-50 text-red-700',
  [KitStatus.IN_ANALYSIS]: 'bg-orange-50 text-orange-700',
  [KitStatus.ANALYSIS_COMPLETE]: 'bg-primary-50 text-primary-700',
  [KitStatus.SPECIALIST_POOL]: 'bg-violet-50 text-violet-700',
  [KitStatus.REPORT_READY]: 'bg-green-50 text-green-700',
  [KitStatus.ADMIN_APPROVAL]: 'bg-amber-50 text-amber-700',
  [KitStatus.COMPLETED]: 'bg-green-50 text-green-700',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.DIETITIAN]: 'Diyetisyen',
  [UserRole.LAB]: 'Laboratuvar',
  [UserRole.SPECIALIST]: 'Uzman',
  [UserRole.DANISAN]: 'Danisan',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Beklemede',
  [OrderStatus.PAID]: 'Odendi',
  [OrderStatus.SHIPPED]: 'Kargoda',
  [OrderStatus.DELIVERED]: 'Teslim Edildi',
  [OrderStatus.CANCELLED]: 'Iptal Edildi',
}

// API: /dietician-client-kits status labels (lowercase)
export type DieticianClientKitStatusApi =
  | 'in_client'
  | 'in_laboratory'
  | 'in_expert'
  | 'delivered'
  | 'cancelled'
  | 'completed'

export const DIETICIAN_CLIENT_KIT_STATUS_LABELS: Record<DieticianClientKitStatusApi, string> = {
  delivered: 'Teslim Edildi',
  in_client: 'Danisanda',
  in_laboratory: 'Laboratuvarda',
  in_expert: 'Uzmanda',
  completed: 'Tamamlandi',
  cancelled: 'Iptal Edildi',
}

export function getDieticianClientKitStatusLabel(status?: string): string {
  if (!status) return '—'
  const key = status as DieticianClientKitStatusApi
  return DIETICIAN_CLIENT_KIT_STATUS_LABELS[key] ?? status
}
