export interface AuditLog {
  id: string
  userId: string
  userName: string
  userRole: string
  action: string
  entity: string
  entityId: string
  details: string
  ipAddress: string
  userAgent?: string
  timestamp: string
}

export interface AuditFilters {
  search?: string
  userId?: string
  entity?: string
  action?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}
