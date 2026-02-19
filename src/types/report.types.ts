import type { ReportStatus, SampleStatus } from '@/utils/constants'

export interface LabSample {
  id: string
  kitId: string
  kitBarcode: string
  status: SampleStatus
  rejectReason?: string
  rejectPhotoUrl?: string
  resultFileUrl?: string
  labUserId?: string
  labUserName?: string
  acceptedAt?: string
  completedAt?: string
  createdAt: string
}

export interface Report {
  id: string
  kitId: string
  kitBarcode: string
  specialistId: string
  specialistName: string
  status: ReportStatus
  pdfUrl?: string
  adminNote?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  clientCode: string
  firstName: string
  lastName: string
  phone: string
  email?: string
  address?: string
  birthDate?: string
  dietitianId: string
  dietitianName?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ClientFilters {
  search?: string
  dietitianId?: string
  page?: number
  limit?: number
}

export interface AnamnesisForm {
  id: string
  clientId: string
  height?: number
  weight?: number
  bmi?: number
  bloodType?: string
  allergies?: string
  medications?: string
  chronicDiseases?: string
  familyHistory?: string
  dietaryHabits?: string
  exerciseFrequency?: string
  sleepPattern?: string
  stressLevel?: string
  notes?: string
  createdAt: string
}
