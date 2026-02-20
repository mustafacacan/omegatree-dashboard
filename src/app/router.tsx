import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { UserRole } from '@/utils/constants'

// Layouts
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { RouteErrorFallback } from '@/components/shared/route-error-fallback'
import { PageLoader } from '@/components/shared/page-loader'

// Auth (kept eager - these are entry points)
import { RoleGuard, AuthRedirect, PendingApprovalPage } from '@/features/auth/components/role-guard'
import { LoginPage } from '@/features/auth/pages/login-page'
import { RegisterPage } from '@/features/auth/pages/register-page'
import { KvkkConsentPage } from '@/features/auth/pages/kvkk-consent-page'

// Lazy-loaded pages
const ProfilePage = lazy(() => import('@/features/auth/pages/profile-page').then(m => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() => import('@/features/auth/pages/settings-page').then(m => ({ default: m.SettingsPage })))
const NotificationsPage = lazy(() => import('@/features/auth/pages/notifications-page').then(m => ({ default: m.NotificationsPage })))

// Admin
const AdminDashboardPage = lazy(() => import('@/features/admin/dashboard/admin-dashboard-page').then(m => ({ default: m.AdminDashboardPage })))
const UsersListPage = lazy(() => import('@/features/admin/users/pages/users-list-page').then(m => ({ default: m.UsersListPage })))
const ProductionCenterPage = lazy(() => import('@/features/admin/production/pages/production-center-page').then(m => ({ default: m.ProductionCenterPage })))
const PricingPage = lazy(() => import('@/features/admin/pricing/pages/pricing-page').then(m => ({ default: m.PricingPage })))
const StockPage = lazy(() => import('@/features/admin/stock/pages/stock-page').then(m => ({ default: m.StockPage })))
const OrdersPage = lazy(() => import('@/features/admin/orders/pages/orders-page').then(m => ({ default: m.OrdersPage })))
const CariPage = lazy(() => import('@/features/admin/cari/pages/cari-page').then(m => ({ default: m.CariPage })))
const AuditLogsPage = lazy(() => import('@/features/admin/audit/pages/audit-logs-page').then(m => ({ default: m.AuditLogsPage })))
const TemplatesPage = lazy(() => import('@/features/admin/templates/pages/templates-page').then(m => ({ default: m.TemplatesPage })))
const ReturnRequestsPage = lazy(() => import('@/features/admin/returns/pages/return-requests-page').then(m => ({ default: m.ReturnRequestsPage })))
const LaboratoriesPage = lazy(() => import('@/features/admin/laboratories/pages/laboratories-page').then(m => ({ default: m.LaboratoriesPage })))

// Dietitian
const DietitianDashboardPage = lazy(() => import('@/features/dietitian/dashboard/dietitian-dashboard-page').then(m => ({ default: m.DietitianDashboardPage })))
const ClientsListPage = lazy(() => import('@/features/dietitian/clients/pages/clients-list-page').then(m => ({ default: m.ClientsListPage })))
const ClientFormPage = lazy(() => import('@/features/dietitian/clients/pages/client-form-page').then(m => ({ default: m.ClientFormPage })))
const ClientDetailPage = lazy(() => import('@/features/dietitian/clients/pages/client-detail-page').then(m => ({ default: m.ClientDetailPage })))
const KitsPage = lazy(() => import('@/features/dietitian/kits/pages/kits-page').then(m => ({ default: m.KitsPage })))
const MyStockPage = lazy(() => import('@/features/dietitian/stock/pages/my-stock-page').then(m => ({ default: m.MyStockPage })))
const DietitianOrderPage = lazy(() => import('@/features/dietitian/orders/pages/order-page').then(m => ({ default: m.DietitianOrderPage })))
const ReportsPage = lazy(() => import('@/features/dietitian/reports/pages/reports-page').then(m => ({ default: m.ReportsPage })))

// Laboratory
const LabDashboardPage = lazy(() => import('@/features/laboratory/dashboard/lab-dashboard-page').then(m => ({ default: m.LabDashboardPage })))
const SamplePoolPage = lazy(() => import('@/features/laboratory/pool/pages/sample-pool-page').then(m => ({ default: m.SamplePoolPage })))
const AnalysisPage = lazy(() => import('@/features/laboratory/analysis/pages/analysis-page').then(m => ({ default: m.AnalysisPage })))
const ResultsPage = lazy(() => import('@/features/laboratory/results/pages/results-page').then(m => ({ default: m.ResultsPage })))

// Specialist
const SpecialistDashboardPage = lazy(() => import('@/features/specialist/dashboard/specialist-dashboard-page').then(m => ({ default: m.SpecialistDashboardPage })))
const AssignmentsPage = lazy(() => import('@/features/specialist/assignments/pages/assignments-page').then(m => ({ default: m.AssignmentsPage })))
const ReportEditorPage = lazy(() => import('@/features/specialist/reports/pages/report-editor-page').then(m => ({ default: m.ReportEditorPage })))

// Danisan
const DanisanPortalPage = lazy(() => import('@/features/danisan/pages/danisan-portal-page').then(m => ({ default: m.DanisanPortalPage })))
const DanisanKitPage = lazy(() => import('@/features/danisan/pages/danisan-kit-page').then(m => ({ default: m.DanisanKitPage })))
const DanisanRaporlarPage = lazy(() => import('@/features/danisan/pages/danisan-raporlar-page').then(m => ({ default: m.DanisanRaporlarPage })))

function SuspensePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  // Auth routes
  {
    errorElement: <RouteErrorFallback />,
    element: (
      <AuthRedirect>
        <AuthLayout />
      </AuthRedirect>
    ),
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },

  // Special auth pages
  { path: '/kvkk-consent', element: <KvkkConsentPage /> },
  { path: '/pending-approval', element: <PendingApprovalPage /> },

  // Admin routes
  {
    errorElement: <RouteErrorFallback />,
    element: (
      <RoleGuard allowedRoles={[UserRole.ADMIN]}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { path: '/admin', element: <SuspensePage><AdminDashboardPage /></SuspensePage> },
      { path: '/admin/profile', element: <SuspensePage><ProfilePage /></SuspensePage> },
      { path: '/admin/settings', element: <SuspensePage><SettingsPage /></SuspensePage> },
      { path: '/admin/notifications', element: <SuspensePage><NotificationsPage /></SuspensePage> },
      { path: '/admin/users', element: <SuspensePage><UsersListPage /></SuspensePage> },
      { path: '/admin/production', element: <SuspensePage><ProductionCenterPage /></SuspensePage> },
      { path: '/admin/pricing', element: <SuspensePage><PricingPage /></SuspensePage> },
      { path: '/admin/stock', element: <SuspensePage><StockPage /></SuspensePage> },
      { path: '/admin/returns', element: <SuspensePage><ReturnRequestsPage /></SuspensePage> },
      { path: '/admin/orders', element: <SuspensePage><OrdersPage /></SuspensePage> },
      { path: '/admin/cari', element: <SuspensePage><CariPage /></SuspensePage> },
      { path: '/admin/laboratories', element: <SuspensePage><LaboratoriesPage /></SuspensePage> },
      { path: '/admin/audit', element: <SuspensePage><AuditLogsPage /></SuspensePage> },
      { path: '/admin/templates', element: <SuspensePage><TemplatesPage /></SuspensePage> },
    ],
  },

  // Dietitian routes
  {
    errorElement: <RouteErrorFallback />,
    element: (
      <RoleGuard allowedRoles={[UserRole.DIETITIAN]}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { path: '/dietitian', element: <SuspensePage><DietitianDashboardPage /></SuspensePage> },
      { path: '/dietitian/profile', element: <SuspensePage><ProfilePage /></SuspensePage> },
      { path: '/dietitian/settings', element: <SuspensePage><SettingsPage /></SuspensePage> },
      { path: '/dietitian/notifications', element: <SuspensePage><NotificationsPage /></SuspensePage> },
      { path: '/dietitian/clients', element: <SuspensePage><ClientsListPage /></SuspensePage> },
      { path: '/dietitian/clients/new', element: <SuspensePage><ClientFormPage /></SuspensePage> },
      { path: '/dietitian/clients/:clientId', element: <SuspensePage><ClientDetailPage /></SuspensePage> },
      { path: '/dietitian/clients/:clientId/edit', element: <SuspensePage><ClientFormPage /></SuspensePage> },
      { path: '/dietitian/kits', element: <SuspensePage><KitsPage /></SuspensePage> },
      { path: '/dietitian/stock', element: <SuspensePage><MyStockPage /></SuspensePage> },
      { path: '/dietitian/orders', element: <SuspensePage><DietitianOrderPage /></SuspensePage> },
      { path: '/dietitian/reports', element: <SuspensePage><ReportsPage /></SuspensePage> },
    ],
  },

  // Lab routes
  {
    errorElement: <RouteErrorFallback />,
    element: (
      <RoleGuard allowedRoles={[UserRole.LAB]}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { path: '/lab', element: <SuspensePage><LabDashboardPage /></SuspensePage> },
      { path: '/lab/profile', element: <SuspensePage><ProfilePage /></SuspensePage> },
      { path: '/lab/settings', element: <SuspensePage><SettingsPage /></SuspensePage> },
      { path: '/lab/notifications', element: <SuspensePage><NotificationsPage /></SuspensePage> },
      { path: '/lab/pool', element: <SuspensePage><SamplePoolPage /></SuspensePage> },
      { path: '/lab/analysis', element: <SuspensePage><AnalysisPage /></SuspensePage> },
      { path: '/lab/results', element: <SuspensePage><ResultsPage /></SuspensePage> },
    ],
  },

  // Specialist routes
  {
    errorElement: <RouteErrorFallback />,
    element: (
      <RoleGuard allowedRoles={[UserRole.SPECIALIST]}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { path: '/specialist', element: <SuspensePage><SpecialistDashboardPage /></SuspensePage> },
      { path: '/specialist/profile', element: <SuspensePage><ProfilePage /></SuspensePage> },
      { path: '/specialist/settings', element: <SuspensePage><SettingsPage /></SuspensePage> },
      { path: '/specialist/notifications', element: <SuspensePage><NotificationsPage /></SuspensePage> },
      { path: '/specialist/assignments', element: <SuspensePage><AssignmentsPage /></SuspensePage> },
      { path: '/specialist/reports', element: <SuspensePage><ReportEditorPage /></SuspensePage> },
    ],
  },

  // Danisan (client) routes
  {
    errorElement: <RouteErrorFallback />,
    element: (
      <RoleGuard allowedRoles={[UserRole.DANISAN]}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { path: '/danisan', element: <SuspensePage><DanisanPortalPage /></SuspensePage> },
      { path: '/danisan/profile', element: <SuspensePage><ProfilePage /></SuspensePage> },
      { path: '/danisan/settings', element: <SuspensePage><SettingsPage /></SuspensePage> },
      { path: '/danisan/notifications', element: <SuspensePage><NotificationsPage /></SuspensePage> },
      { path: '/danisan/kit', element: <SuspensePage><DanisanKitPage /></SuspensePage> },
      { path: '/danisan/raporlar', element: <SuspensePage><DanisanRaporlarPage /></SuspensePage> },
    ],
  },

  // Root redirect
  { path: '/', element: <Navigate to="/login" replace /> },

  // 404
  {
    path: '*',
    element: (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-surface-200 mb-4">404</h1>
          <p className="text-surface-500 mb-6">Sayfa bulunamadi</p>
          <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Ana Sayfaya Don
          </a>
        </div>
      </div>
    ),
  },
])
