import type { UserRole, UserStatus } from '@/utils/constants'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: UserRole
  status: UserStatus
  avatarUrl?: string
  kvkkConsentDate?: string
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  role: UserRole
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken: string
}

export interface UserFilters {
  search?: string
  role?: UserRole
  status?: UserStatus
  page?: number
  limit?: number
}
