import type { QueryClient } from '@tanstack/react-query'
import { ROUTES } from '@/utils/routes'

export const ADMIN_SIDEBAR_COUNTS_QUERY_KEY = ['admin', 'sidebar-counts'] as const

export type AdminSidebarCounts = {
  pendingOrders: number
  pendingReturnRequests: number
  pendingReportApprovals: number
  pendingUsers: number
}

const EMPTY_COUNTS: AdminSidebarCounts = {
  pendingOrders: 0,
  pendingReturnRequests: 0,
  pendingReportApprovals: 0,
  pendingUsers: 0,
}

export function normalizeAdminSidebarCounts(data: unknown): AdminSidebarCounts {
  const source =
    data && typeof data === 'object' && 'data' in (data as object)
      ? (data as { data?: unknown }).data
      : data

  if (!source || typeof source !== 'object') return EMPTY_COUNTS

  const record = source as Record<string, unknown>
  const toCount = (value: unknown) => {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  }

  return {
    pendingOrders: toCount(record.pendingOrders),
    pendingReturnRequests: toCount(record.pendingReturnRequests),
    pendingReportApprovals: toCount(record.pendingReportApprovals),
    pendingUsers: toCount(record.pendingUsers),
  }
}

export function getAdminSidebarBadgeForHref(
  href: string,
  counts: AdminSidebarCounts
): number {
  switch (href) {
    case ROUTES.YONETICI_KULLANICILAR:
      return counts.pendingUsers
    case ROUTES.YONETICI_IADELER:
      return counts.pendingReturnRequests
    case ROUTES.YONETICI_SIPARISLER:
      return counts.pendingOrders
    case ROUTES.YONETICI_RAPORLAR:
      return counts.pendingReportApprovals
    default:
      return 0
  }
}

export function formatSidebarBadgeCount(count: number): string {
  if (count > 99) return '99+'
  return String(count)
}

export function invalidateAdminSidebarCounts(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ADMIN_SIDEBAR_COUNTS_QUERY_KEY })
}
