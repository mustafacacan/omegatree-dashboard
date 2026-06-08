import { api } from '@/lib/axios'
import type { User } from '@/types/user.types'
import { UserRole, UserStatus } from '@/utils/constants'
import type { components } from '@/types/openapi'

type ApiUser = components['schemas']['UserResponse']
type CreateUserBody = components['schemas']['CreateUser']
type UpdateUserBody = components['schemas']['UpdateUser']

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/** API rol string → uygulama UserRole */
function mapApiRoleToAppRole(apiRole: string | undefined): UserRole {
  const roleMap: Record<string, UserRole> = {
    admin: UserRole.ADMIN,
    dietician: UserRole.DIETITIAN,
    laboratory: UserRole.LAB,
    expert: UserRole.SPECIALIST,
    client: UserRole.DANISAN,
  }
  return roleMap[(apiRole ?? '').toLowerCase()] ?? UserRole.DANISAN
}

/** Uygulama UserRole → API rol string */
function mapAppRoleToApiRole(role: UserRole): CreateUserBody['role'] {
  const roleMap: Record<UserRole, CreateUserBody['role']> = {
    [UserRole.ADMIN]: 'admin',
    [UserRole.DIETITIAN]: 'dietician',
    [UserRole.LAB]: 'laboratory',
    [UserRole.SPECIALIST]: 'expert',
    [UserRole.DANISAN]: 'client',
  }
  return roleMap[role] ?? 'client'
}

/** API UserResponse (+ isVerified, deletedAt backend) → User */
function mapApiUserToAppUser(apiUser: ApiUser & { isVerified?: boolean; deletedAt?: string | null }): User {
  const isVerified = apiUser.isVerified
  const status = isVerified === false ? UserStatus.PENDING : UserStatus.ACTIVE
  return {
    id: String(apiUser.id ?? ''),
    email: apiUser.email ?? '',
    firstName: apiUser.firstName ?? '',
    lastName: apiUser.lastName ?? '',
    companyName: (apiUser as ApiUser & { companyName?: string | null }).companyName ?? null,
    phone: apiUser.phone,
    role: mapApiRoleToAppRole(apiUser.role),
    status,
    createdAt: apiUser.createdAt ?? new Date().toISOString(),
    updatedAt: apiUser.updatedAt ?? new Date().toISOString(),
    gender: (apiUser as ApiUser & { gender?: string }).gender as 'male' | 'female' | undefined,
    isVerified,
    deletedAt: (apiUser as ApiUser & { deletedAt?: string | null }).deletedAt,
  }
}

export interface GetUsersParams {
  page?: number
  limit?: number
  /** API rol filtresi (örn: 'expert') veya app rolü (örn: UserRole.SPECIALIST) */
  role?: UserRole | CreateUserBody['role']
  search?: string
  /** Backend: GET /users?isVerified=true|false */
  isVerified?: boolean
}

export interface GetUsersResponse {
  users: User[]
  total?: number
}

export interface GetUsersWithPaginationResult {
  items: User[]
  totalItems: number
  totalPages: number
  currentPage: number
}

function isAppUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole)
}

/** GET /users — backend: { success, message, data: { items, totalItems, totalPages, currentPage } } */
export async function getUsers(params?: GetUsersParams): Promise<GetUsersResponse> {
  const queryParams =
    params != null
      ? {
        page: params.page ?? 1,
        limit: params.limit ?? 50,
        ...(params.search != null && String(params.search).trim()
          ? { search: String(params.search).trim() }
          : {}),
        ...(params.isVerified === true || params.isVerified === false
          ? { isVerified: params.isVerified ? 'true' : 'false' }
          : {}),
        ...(params.role != null
          ? {
            role: isAppUserRole(params.role)
              ? mapAppRoleToApiRole(params.role)
              : params.role,
          }
          : {}),
      }
      : undefined

  const { data } = await api.get<{
    success?: boolean
    message?: string
    data?: {
      items?: (ApiUser & { isVerified?: boolean; gender?: string; deletedAt?: string | null })[]
      totalItems?: number
      totalPages?: number
      currentPage?: string | number
    }
  }>('/users', {
    params: queryParams,
  })
  const list = data?.data?.items ?? []
  return {
    users: list.map(mapApiUserToAppUser),
    total: data?.data?.totalItems ?? list.length,
  }
}

/** GET /users — sayfalı sonuç + meta */
export async function getUsersWithPagination(params?: GetUsersParams): Promise<GetUsersWithPaginationResult> {
  const page = params?.page ?? 1
  const limit = params?.limit ?? 50
  const search = params?.search != null && String(params.search).trim() ? String(params.search).trim() : undefined

  const queryParams =
    params != null
      ? {
        page,
        limit,
        ...(search ? { search } : {}),
        ...(params.isVerified === true || params.isVerified === false
          ? { isVerified: params.isVerified ? 'true' : 'false' }
          : {}),
        ...(params.role != null
          ? {
            role: isAppUserRole(params.role)
              ? mapAppRoleToApiRole(params.role)
              : params.role,
          }
          : {}),
      }
      : { page, limit }

  const { data } = await api.get<{
    success?: boolean
    message?: string
    data?: {
      items?: (ApiUser & { isVerified?: boolean; gender?: string; deletedAt?: string | null })[]
      totalItems?: number
      totalPages?: number
      currentPage?: string | number
    }
  }>('/users', {
    params: queryParams,
  })

  const list = data?.data?.items ?? []
  const items = list.map(mapApiUserToAppUser)
  const totalItems = Number(data?.data?.totalItems ?? items.length) || 0
  const totalPages = Number(data?.data?.totalPages ?? Math.max(1, Math.ceil(totalItems / Math.max(1, limit)))) || 1
  const currentPageRaw = data?.data?.currentPage
  const currentPage =
    typeof currentPageRaw === 'string'
      ? parseInt(currentPageRaw, 10) || page
      : Number(currentPageRaw) || page

  return { items, totalItems, totalPages, currentPage }
}

/** GET /users/{id} — tek kullanıcı */
export async function getUser(id: string): Promise<User> {
  const { data } = await api.get<ApiUser & { isVerified?: boolean }>(`/users/${id}`)
  return mapApiUserToAppUser(data)
}

/** POST /users — yeni kullanıcı (admin) */
export async function createUser(payload: {
  firstName?: string
  lastName?: string
  phone: string
  email?: string
  companyName?: string
  role: UserRole
  gender: 'male' | 'female'
  identityNumber?: string
}): Promise<User> {
  const body: Record<string, unknown> = {
    phone: payload.phone,
    email: payload.email,
    role: mapAppRoleToApiRole(payload.role),
    gender: payload.gender,
    identityNumber: payload.identityNumber,
  }
  const firstName = normalizeOptionalText(payload.firstName)
  const lastName = normalizeOptionalText(payload.lastName)
  const companyName = normalizeOptionalText(payload.companyName)
  const email = normalizeOptionalText(payload.email)
  const identityNumber = normalizeOptionalText(payload.identityNumber)

  if (firstName) body.firstName = firstName
  if (lastName) body.lastName = lastName
  if (companyName) body.companyName = companyName
  if (email) body.email = email
  if (identityNumber) body.identityNumber = identityNumber

  const { data } = await api.post<ApiUser & { isVerified?: boolean }>('/users', body)
  return mapApiUserToAppUser(data)
}

/** PUT /users/{id} — kullanıcı güncelle */
export async function updateUser(
  id: string,
  payload: {
    firstName?: string
    lastName?: string
    companyName?: string
    phone?: string
    email?: string
    role?: UserRole
    identityNumber?: string
  }
): Promise<User> {
  const body: UpdateUserBody = {}
  const firstName = normalizeOptionalText(payload.firstName)
  const lastName = normalizeOptionalText(payload.lastName)
  const companyName = normalizeOptionalText(payload.companyName)
  const phone = normalizeOptionalText(payload.phone)
  const email = normalizeOptionalText(payload.email)
  const identityNumber = normalizeOptionalText(payload.identityNumber)

  if (firstName) body.firstName = firstName
  if (lastName) body.lastName = lastName
  if (companyName) body.companyName = companyName
  if (phone) body.phone = phone
  if (email) body.email = email
  if (payload.role != null) body.role = mapAppRoleToApiRole(payload.role)
  if (identityNumber) body.identityNumber = identityNumber

  const { data } = await api.put<ApiUser & { isVerified?: boolean }>(`/users/${id}`, body)
  return mapApiUserToAppUser(data)
}

/** DELETE /users/{id} — kullanıcı sil */
export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`)
}

/** POST /auth/verify/{userId} — kayıt onayı (admin) */
export async function verifyUser(userId: string): Promise<void> {
  await api.post(`/auth/verify/${userId}`)
}
