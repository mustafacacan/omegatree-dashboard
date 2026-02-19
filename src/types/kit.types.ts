import type { KitStatus } from '@/utils/constants'

export interface Kit {
  id: string
  barcode: string
  status: KitStatus
  assignedDietitianId?: string
  assignedDietitianName?: string
  clientId?: string
  clientName?: string
  damagePhotoUrl?: string
  damageNote?: string
  trackingNumber?: string
  createdAt: string
  updatedAt: string
  statusHistory: KitStatusHistory[]
}

export interface KitStatusHistory {
  id: string
  kitId: string
  fromStatus: KitStatus
  toStatus: KitStatus
  changedBy: string
  changedByName: string
  note?: string
  timestamp: string
}

export interface KitFilters {
  search?: string
  status?: KitStatus
  dietitianId?: string
  clientId?: string
  page?: number
  limit?: number
}

export interface BarcodeGenerateRequest {
  quantity: number
  prefix?: string
}

export interface KitAssignRequest {
  kitIds: string[]
  dietitianId: string
}

export interface DamageReportRequest {
  kitId: string
  photoUrl: string
  note: string
}
