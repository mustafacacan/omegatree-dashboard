import { useQuery } from '@tanstack/react-query'
import { getAdminSidebarCounts } from '@/services/dashboard.service'
import {
  ADMIN_SIDEBAR_COUNTS_QUERY_KEY,
  normalizeAdminSidebarCounts,
  type AdminSidebarCounts,
} from '@/lib/admin-sidebar-counts'
import { UserRole } from '@/utils/constants'
import { useCurrentRole } from '@/stores/auth.store'

const EMPTY_COUNTS: AdminSidebarCounts = {
  pendingOrders: 0,
  pendingReturnRequests: 0,
  pendingReportApprovals: 0,
  pendingUsers: 0,
}

export function useAdminSidebarBadges() {
  const role = useCurrentRole()
  const isAdmin = role === UserRole.ADMIN

  const query = useQuery({
    queryKey: ADMIN_SIDEBAR_COUNTS_QUERY_KEY,
    queryFn: async () => normalizeAdminSidebarCounts(await getAdminSidebarCounts()),
    enabled: isAdmin,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })

  return {
    counts: query.data ?? EMPTY_COUNTS,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
