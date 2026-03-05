import { api } from '@/lib/axios'
import type { User } from '@/types/user.types'
import { UserRole, UserStatus } from '@/utils/constants'
import type { components } from '@/types/openapi'

/** API'den gelen kullanıcı tipi (openapi UserResponse) */
type ApiUser = components['schemas']['UserResponse']

/** API rol string'ini uygulama UserRole tipine çevirir */
function mapApiRoleToAppRole(apiRole: string | undefined): UserRole {
  const roleMap: Record<string, UserRole> = {
    admin: UserRole.ADMIN,
    dietician: UserRole.DIETITIAN,
    laboratory: UserRole.LAB,
    expert: UserRole.SPECIALIST,
    client: UserRole.DANISAN,
  }
  const normalized = (apiRole ?? '').toLowerCase()
  return roleMap[normalized] ?? UserRole.DANISAN
}

/** API UserResponse → uygulama User tipine dönüştürür */
function mapApiUserToAppUser(apiUser: ApiUser): User {
  return {
    id: String(apiUser.id ?? ''),
    email: apiUser.email ?? '',
    firstName: apiUser.firstName ?? '',
    lastName: apiUser.lastName ?? '',
    phone: apiUser.phone,
    role: mapApiRoleToAppRole(apiUser.role),
    status: UserStatus.ACTIVE,
    createdAt: apiUser.createdAt ?? new Date().toISOString(),
    updatedAt: apiUser.updatedAt ?? new Date().toISOString(),
  }
}

/** Login API cevabı: { success, message, data: { user, token } } */
export interface LoginResponse {
  success?: boolean
  message?: string
  data?: {
    user?: ApiUser
    token?: string
    access_token?: string
  }
}

/**
 * E-posta veya telefon ile giriş yapar.
 * API: POST /auth/login body: { loginKey, password }
 * Cevap: { success, message, data: { user, token } }
 */
export async function login(loginKey: string, password: string): Promise<{ user: User; token: string }> {
  const { data: res } = await api.post<LoginResponse>('/auth/login', { loginKey, password })

  const payload = (res?.data ?? res) as { token?: string; access_token?: string; user?: ApiUser } | undefined
  const token = payload?.token ?? payload?.access_token

  if (!token) {
    throw new Error('Sunucudan token alınamadı')
  }

  let apiUser: ApiUser | undefined = payload?.user

  if (!apiUser) {
    const profileRes = await api.get<ApiUser | { data?: ApiUser }>('/users/profile')
    const profileData = profileRes.data
    apiUser = (profileData && typeof profileData === 'object' && 'data' in profileData)
      ? (profileData as { data: ApiUser }).data
      : (profileData as ApiUser)
  }

  const user = mapApiUserToAppUser(apiUser)
  return { user, token }
}

/**
 * Giriş yapmış kullanıcının profilini getirir (token gerekir).
 * API: GET /users/profile
 */
export async function getProfile(): Promise<User> {
  const { data } = await api.get<ApiUser>('/users/profile')
  return mapApiUserToAppUser(data)
}

/** Kayıt isteği: API sadece dietician | client kabul ediyor; şifre backend'de sonra belirlenebilir */
export interface RegisterPayload {
  firstName: string
  lastName: string
  email?: string | null
  phone: string
  role: 'dietician' | 'client'
  gender: 'male' | 'female'
}

/**
 * Yeni kullanıcı kaydı. Admin onayı beklenir.
 * API: POST /auth/register body: { firstName, lastName, email, role, phone, gender }
 */
export async function register(payload: RegisterPayload): Promise<void> {
  await api.post('/auth/register', {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email ?? undefined,
    phone: payload.phone,
    role: payload.role,
    gender: payload.gender,
  })
}

/**
 * Şifremi unuttum: telefona SMS kodu gönderir.
 * API: POST /auth/forgot-password body: { phone }
 */
export async function forgotPassword(phone: string): Promise<void> {
  await api.post('/auth/forgot-password', { phone })
}

/**
 * SMS kodu ve yeni şifre ile şifre sıfırlama.
 * API: POST /auth/reset-password body: { phone, code, newPassword, rePassword }
 */
export async function resetPassword(phone: string, code: string, newPassword: string, rePassword: string): Promise<void> {
  await api.post('/auth/reset-password', { phone, code, newPassword, rePassword })
}

/**
 * Giriş yapmış kullanıcının şifresini değiştirir.
 * API: POST /auth/change-password body: { oldPassword, newPassword, rePassword }
 */
export async function changePassword(oldPassword: string, newPassword: string, rePassword: string): Promise<void> {
  await api.post('/auth/change-password', { oldPassword, newPassword, rePassword })
}
