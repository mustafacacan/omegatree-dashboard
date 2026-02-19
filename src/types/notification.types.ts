export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  link?: string
  createdAt: string
}

export type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_SHIPPED'
  | 'KIT_ASSIGNED'
  | 'KIT_DELIVERED'
  | 'KIT_DAMAGED'
  | 'SAMPLE_RECEIVED'
  | 'SAMPLE_REJECTED'
  | 'ANALYSIS_COMPLETE'
  | 'REPORT_READY'
  | 'REPORT_APPROVED'
  | 'USER_APPROVED'
  | 'STOCK_LOW'
  | 'SYSTEM'
