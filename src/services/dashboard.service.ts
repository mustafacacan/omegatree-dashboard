import { api } from '@/lib/axios'

export type AdminDashboardResponse = {
    success?: boolean
    message?: string
    data?: AdminDashboardData
}

export type AdminDashboardData = {
    cards?: {
        totalKits?: number
        activeDieticians?: number
        pendingOrders?: number
        totalRevenue?: number
    }
    revenueTrend?: {
        months?: Array<{
            key?: string
            label?: string
            total?: number
        }>
        changePercent?: number | null
    }
    kits?: {
        total?: number
        byStatus?: Array<{
            status?: string
            label?: string
            count?: number
            percent?: number
        }>
    }
    weeklyKits?: {
        total?: number
        days?: Array<{
            key?: string
            label?: string
            count?: number
        }>
    }
    liveActivity?: Array<{
        id?: number
        type?: string
        message?: string
        actorName?: string
        actorRole?: string
        createdAt?: string
    }>
    recentKitMovements?: Array<{
        id?: number
        status?: string
        statusLabel?: string
        createdAt?: string
        kit?: { id?: number; name?: string }
        dietician?: { id?: number; name?: string }
        laboratory?: { id?: number; name?: string }
    }>
    topDieticians?: Array<{
        dieticianId?: number
        name?: string
        kitCount?: number
    }>
}

/** GET /dashboard/admin — Admin dashboard aggregates */
export async function getAdminDashboard(): Promise<AdminDashboardData> {
    const { data } = await api.get<AdminDashboardResponse>('/dashboard/admin')
    return data?.data ?? {}
}

export type AdminSidebarCountsData = {
    pendingOrders?: number
    pendingReturnRequests?: number
    pendingReportApprovals?: number
    pendingUsers?: number
}

type AdminSidebarCountsResponse = {
    success?: boolean
    message?: string
    data?: AdminSidebarCountsData
}

/** GET /dashboard/admin/sidebar-counts — lightweight admin sidebar badge counts */
export async function getAdminSidebarCounts(): Promise<AdminSidebarCountsData> {
    const { data } = await api.get<AdminSidebarCountsResponse>('/dashboard/admin/sidebar-counts')
    return data?.data ?? {}
}
