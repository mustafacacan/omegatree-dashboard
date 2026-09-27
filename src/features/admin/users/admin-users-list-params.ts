import type { GetUsersParams } from '@/services/users.service'
import type { UserRole } from '@/utils/constants'
import { UserStatus } from '@/utils/constants'
import type { User } from '@/types/user.types'

export type AdminUsersTab = 'all' | 'active' | 'pending' | 'inactive'

export function buildAdminUsersListParams(args: {
  userTab: AdminUsersTab
  page: number
  limit: number
  roleFilter: string
  search?: string
}): GetUsersParams {
  const { userTab, page, limit, roleFilter, search } = args
  const trimmedSearch = search?.trim()

  const base: GetUsersParams = {
    page,
    limit,
    search: trimmedSearch || undefined,
    role: roleFilter !== 'all' ? (roleFilter as UserRole) : undefined,
  }

  if (userTab === 'all') {
    return { ...base, status: 'all' }
  }

  if (userTab === 'inactive') {
    return { ...base, status: 'inactive' }
  }

  return {
    ...base,
    status: 'active',
    isVerified: userTab === 'pending' ? false : true,
  }
}

/** Pasif sekme: yalnızca soft-delete (deletedAt) kayıtları. */
export function isPassiveAdminUser(user: User): boolean {
  return Boolean(user.deletedAt) || user.status === UserStatus.SUSPENDED
}

export function filterUsersForAdminTab(users: User[], userTab: AdminUsersTab): User[] {
  if (userTab === 'inactive') {
    return users.filter(isPassiveAdminUser)
  }
  if (userTab === 'active') {
    return users.filter(
      (u) => !u.deletedAt && u.status === UserStatus.ACTIVE && u.isVerified !== false,
    )
  }
  if (userTab === 'pending') {
    return users.filter(
      (u) => !u.deletedAt && (u.status === UserStatus.PENDING || u.isVerified === false),
    )
  }
  return users
}
