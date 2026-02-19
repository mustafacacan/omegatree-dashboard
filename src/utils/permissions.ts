import { UserRole } from './constants'

export type Permission =
  | 'users.view'
  | 'users.manage'
  | 'users.approve'
  | 'production.view'
  | 'production.manage'
  | 'pricing.view'
  | 'pricing.manage'
  | 'stock.view_all'
  | 'stock.view_own'
  | 'stock.manage'
  | 'orders.view_all'
  | 'orders.view_own'
  | 'orders.create'
  | 'orders.manage'
  | 'cari.view'
  | 'cari.manage'
  | 'audit.view'
  | 'clients.view_all'
  | 'clients.view_own'
  | 'clients.manage'
  | 'kits.assign'
  | 'kits.receive'
  | 'kits.damage_report'
  | 'lab.pool'
  | 'lab.accept_reject'
  | 'lab.upload_results'
  | 'specialist.assignments'
  | 'specialist.create_report'
  | 'reports.view_own'
  | 'reports.approve'
  | 'templates.manage'
  | 'notifications.view'

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    'users.view', 'users.manage', 'users.approve',
    'production.view', 'production.manage',
    'pricing.view', 'pricing.manage',
    'stock.view_all', 'stock.manage',
    'orders.view_all', 'orders.manage',
    'cari.view', 'cari.manage',
    'audit.view',
    'clients.view_all',
    'reports.approve',
    'templates.manage',
    'notifications.view',
  ],
  [UserRole.DIETITIAN]: [
    'stock.view_own',
    'orders.view_own', 'orders.create',
    'clients.view_own', 'clients.manage',
    'kits.assign', 'kits.receive', 'kits.damage_report',
    'reports.view_own',
    'notifications.view',
  ],
  [UserRole.LAB]: [
    'lab.pool', 'lab.accept_reject', 'lab.upload_results',
    'notifications.view',
  ],
  [UserRole.SPECIALIST]: [
    'specialist.assignments', 'specialist.create_report',
    'notifications.view',
  ],
  [UserRole.DANISAN]: [
    'reports.view_own',
    'notifications.view',
  ],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}
