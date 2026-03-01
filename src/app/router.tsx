import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { UserRole } from '@/utils/constants'
import { ROUTES } from '@/utils/routes'

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
import { NotFoundPage } from '@/features/auth/pages/not-found-page'

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
const ReportApprovalsPage = lazy(() => import('@/features/admin/reports/pages/report-approvals-page').then(m => ({ default: m.ReportApprovalsPage })))

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
const SpecialistReportsListPage = lazy(() => import('@/features/specialist/reports/pages/reports-list-page').then(m => ({ default: m.SpecialistReportsListPage })))
const ReportEditorPage = lazy(() => import('@/features/specialist/reports/pages/report-editor-page').then(m => ({ default: m.ReportEditorPage })))

// Danisan
const DanisanPortalPage = lazy(() => import('@/features/danisan/pages/danisan-portal-page').then(m => ({ default: m.DanisanPortalPage })))
const DanisanKitPage = lazy(() => import('@/features/danisan/pages/danisan-kit-page').then(m => ({ default: m.DanisanKitPage })))
const DanisanRaporlarPage = lazy(() => import('@/features/danisan/pages/danisan-raporlar-page').then(m => ({ default: m.DanisanRaporlarPage })))

// Public: güvenli paylaşım linki — sadece PDF görüntüleme (auth yok)
const ShareReportPage = lazy(() => import('@/features/share/pages/share-report-page').then(m => ({ default: m.ShareReportPage })))

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
      { path: ROUTES.GIRIS, element: <LoginPage /> },
      { path: ROUTES.KAYIT, element: <RegisterPage /> },
    ],
  },

  // Special auth pages
  { path: ROUTES.KVKK_ONAY, element: <KvkkConsentPage /> },
  { path: ROUTES.ONAY_BEKLIYOR, element: <PendingApprovalPage /> },

  // Admin (Yonetici) routes
  {
    errorElement: <RouteErrorFallback />,
    element: (
      <RoleGuard allowedRoles={[UserRole.ADMIN]}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { path: ROUTES.YONETICI, element: <SuspensePage><AdminDashboardPage /></SuspensePage> },
      { path: ROUTES.YONETICI_PROFIL, element: <SuspensePage><ProfilePage /></SuspensePage> },
      { path: ROUTES.YONETICI_AYARLAR, element: <SuspensePage><SettingsPage /></SuspensePage> },
      { path: ROUTES.YONETICI_BILDIRIMLER, element: <SuspensePage><NotificationsPage /></SuspensePage> },
      { path: ROUTES.YONETICI_KULLANICILAR, element: <SuspensePage><UsersListPage /></SuspensePage> },
      { path: ROUTES.YONETICI_URETIM, element: <SuspensePage><ProductionCenterPage /></SuspensePage> },
      { path: ROUTES.YONETICI_FIYATLANDIRMA, element: <SuspensePage><PricingPage /></SuspensePage> },
      { path: ROUTES.YONETICI_STOK, element: <SuspensePage><StockPage /></SuspensePage> },
      { path: ROUTES.YONETICI_IADELER, element: <SuspensePage><ReturnRequestsPage /></SuspensePage> },
      { path: ROUTES.YONETICI_SIPARISLER, element: <SuspensePage><OrdersPage /></SuspensePage> },
      { path: ROUTES.YONETICI_CARI, element: <SuspensePage><CariPage /></SuspensePage> },
      { path: ROUTES.YONETICI_LABORATUVARLAR, element: <SuspensePage><LaboratoriesPage /></SuspensePage> },
      { path: ROUTES.YONETICI_RAPORLAR, element: <SuspensePage><ReportApprovalsPage /></SuspensePage> },
      { path: ROUTES.YONETICI_DENETIM, element: <SuspensePage><AuditLogsPage /></SuspensePage> },
      { path: ROUTES.YONETICI_SABLONLAR, element: <SuspensePage><TemplatesPage /></SuspensePage> },
    ],
  },

  // Dietitian (Diyetisyen) routes
  {
    errorElement: <RouteErrorFallback />,
    element: (
      <RoleGuard allowedRoles={[UserRole.DIETITIAN]}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { path: ROUTES.DIYETISYEN, element: <SuspensePage><DietitianDashboardPage /></SuspensePage> },
      { path: ROUTES.DIYETISYEN_PROFIL, element: <SuspensePage><ProfilePage /></SuspensePage> },
      { path: ROUTES.DIYETISYEN_AYARLAR, element: <SuspensePage><SettingsPage /></SuspensePage> },
      { path: ROUTES.DIYETISYEN_BILDIRIMLER, element: <SuspensePage><NotificationsPage /></SuspensePage> },
      { path: ROUTES.DIYETISYEN_DANISANLAR, element: <SuspensePage><ClientsListPage /></SuspensePage> },
      { path: ROUTES.DIYETISYEN_DANISANLAR_YENI, element: <SuspensePage><ClientFormPage /></SuspensePage> },
      { path: `${ROUTES.DIYETISYEN_DANISANLAR}/:clientId`, element: <SuspensePage><ClientDetailPage /></SuspensePage> },
      { path: `${ROUTES.DIYETISYEN_DANISANLAR}/:clientId/duzenle`, element: <SuspensePage><ClientFormPage /></SuspensePage> },
      { path: ROUTES.DIYETISYEN_KITLER, element: <SuspensePage><KitsPage /></SuspensePage> },
      { path: ROUTES.DIYETISYEN_STOK, element: <SuspensePage><MyStockPage /></SuspensePage> },
      { path: ROUTES.DIYETISYEN_SIPARISLER, element: <SuspensePage><DietitianOrderPage /></SuspensePage> },
      { path: ROUTES.DIYETISYEN_RAPORLAR, element: <SuspensePage><ReportsPage /></SuspensePage> },
    ],
  },

  // Lab (Laboratuvar) routes
  {
    errorElement: <RouteErrorFallback />,
    element: (
      <RoleGuard allowedRoles={[UserRole.LAB]}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { path: ROUTES.LABORATUVAR, element: <SuspensePage><LabDashboardPage /></SuspensePage> },
      { path: ROUTES.LABORATUVAR_PROFIL, element: <SuspensePage><ProfilePage /></SuspensePage> },
      { path: ROUTES.LABORATUVAR_AYARLAR, element: <SuspensePage><SettingsPage /></SuspensePage> },
      { path: ROUTES.LABORATUVAR_BILDIRIMLER, element: <SuspensePage><NotificationsPage /></SuspensePage> },
      { path: ROUTES.LABORATUVAR_HAVUZ, element: <SuspensePage><SamplePoolPage /></SuspensePage> },
      { path: ROUTES.LABORATUVAR_ANALIZ, element: <SuspensePage><AnalysisPage /></SuspensePage> },
      { path: ROUTES.LABORATUVAR_SONUCLAR, element: <SuspensePage><ResultsPage /></SuspensePage> },
    ],
  },

  // Specialist (Uzman) routes
  {
    errorElement: <RouteErrorFallback />,
    element: (
      <RoleGuard allowedRoles={[UserRole.SPECIALIST]}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { path: ROUTES.UZMAN, element: <SuspensePage><SpecialistDashboardPage /></SuspensePage> },
      { path: ROUTES.UZMAN_PROFIL, element: <SuspensePage><ProfilePage /></SuspensePage> },
      { path: ROUTES.UZMAN_AYARLAR, element: <SuspensePage><SettingsPage /></SuspensePage> },
      { path: ROUTES.UZMAN_BILDIRIMLER, element: <SuspensePage><NotificationsPage /></SuspensePage> },
      { path: ROUTES.UZMAN_ATAMALAR, element: <SuspensePage><AssignmentsPage /></SuspensePage> },
      { path: ROUTES.UZMAN_RAPORLAR, element: <SuspensePage><SpecialistReportsListPage /></SuspensePage> },
      { path: ROUTES.UZMAN_RAPORLAR_DUZENLEYICI, element: <SuspensePage><ReportEditorPage /></SuspensePage> },
    ],
  },

  // Danisan routes
  {
    errorElement: <RouteErrorFallback />,
    element: (
      <RoleGuard allowedRoles={[UserRole.DANISAN]}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { path: ROUTES.DANISAN, element: <SuspensePage><DanisanPortalPage /></SuspensePage> },
      { path: ROUTES.DANISAN_PROFIL, element: <SuspensePage><ProfilePage /></SuspensePage> },
      { path: ROUTES.DANISAN_AYARLAR, element: <SuspensePage><SettingsPage /></SuspensePage> },
      { path: ROUTES.DANISAN_BILDIRIMLER, element: <SuspensePage><NotificationsPage /></SuspensePage> },
      { path: ROUTES.DANISAN_KIT, element: <SuspensePage><DanisanKitPage /></SuspensePage> },
      { path: ROUTES.DANISAN_RAPORLAR, element: <SuspensePage><DanisanRaporlarPage /></SuspensePage> },
    ],
  },

  // Public: guvenli rapor paylasim linki (token query ile; sadece PDF goruntuleme)
  {
    path: `${ROUTES.PAYLAS}/:reportId`,
    element: <SuspensePage><ShareReportPage /></SuspensePage>,
  },

  // Root redirect
  { path: '/', element: <Navigate to={ROUTES.GIRIS} replace /> },

  // 404
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
