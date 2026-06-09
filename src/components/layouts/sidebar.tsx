import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/sidebar.store'
import { useCurrentRole } from '@/stores/auth.store'
import { UserRole } from '@/utils/constants'
import { ROUTES, ROLE_HOME } from '@/utils/routes'
import { useAdminSidebarBadges } from '@/hooks/use-admin-sidebar-badges'
import {
  formatSidebarBadgeCount,
  getAdminSidebarBadgeForHref,
} from '@/lib/admin-sidebar-counts'
import { Tooltip, TooltipProvider } from '@/components/ui'
import {
  LayoutDashboard,
  Users,
  Factory,
  DollarSign,
  Package,
  ShoppingCart,
  UserPlus,
  FlaskConical,
  Boxes,
  Truck,
  BarChart3,
  ChevronLeft,
  TreePine,
  TestTubes,
  FileCheck,
  BookOpen,
  ClipboardList,
  RotateCcw,
  Settings,
  History,
  Landmark,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

interface NavGroup {
  title: string
  items: NavItem[]
}

function getNavGroups(role: UserRole): NavGroup[] {
  switch (role) {
    case UserRole.ADMIN:
      return [
        { title: '', items: [{ label: 'Dashboard', href: ROUTES.YONETICI, icon: LayoutDashboard }] },
        { title: 'Yonetim', items: [
          { label: 'Kullanicilar', href: ROUTES.YONETICI_KULLANICILAR, icon: Users },
          { label: 'Uretim Merkezi', href: ROUTES.YONETICI_URETIM, icon: Factory },
          { label: 'Fiyatlandirma', href: ROUTES.YONETICI_FIYATLANDIRMA, icon: DollarSign },
        ]},
        { title: 'Operasyon', items: [
          { label: 'Stok Takibi', href: ROUTES.YONETICI_STOK, icon: Package },
          { label: 'Iade Talepleri', href: ROUTES.YONETICI_IADELER, icon: RotateCcw },
          { label: 'Siparisler', href: ROUTES.YONETICI_SIPARISLER, icon: ShoppingCart },
          { label: 'Laboratuvarlar', href: ROUTES.YONETICI_LABORATUVARLAR, icon: TestTubes },
          { label: 'Diyetisyenler', href: ROUTES.YONETICI_DIYETISYENLER, icon: Users },
          { label: 'Danisanlar', href: ROUTES.YONETICI_DANISANLAR, icon: UserPlus },
          { label: 'Uzmanlar', href: ROUTES.YONETICI_UZMANLAR, icon: BookOpen },
          { label: 'Rapor Onaylari', href: ROUTES.YONETICI_RAPORLAR, icon: FileCheck },
          { label: 'Islem Kayitlari', href: ROUTES.YONETICI_ISLEM_KAYITLARI, icon: ClipboardList },
        ]},
        { title: 'Sistem', items: [
          { label: 'Banka Bilgileri', href: ROUTES.YONETICI_BANKA_BILGILERI, icon: Landmark },
          { label: 'Ayarlar', href: ROUTES.YONETICI_AYARLAR, icon: Settings },
        ]},
      ]
    case UserRole.DIETITIAN:
      return [
        { title: '', items: [{ label: 'Dashboard', href: ROUTES.DIYETISYEN, icon: LayoutDashboard }] },
        { title: 'Danisanlar', items: [
          { label: 'Danisanlarim', href: ROUTES.DIYETISYEN_DANISANLAR, icon: Users },
        ]},
        { title: 'Kit & Stok', items: [
          { label: 'Kitlerim', href: ROUTES.DIYETISYEN_KITLER, icon: FlaskConical },
          { label: 'Stogum', href: ROUTES.DIYETISYEN_STOK, icon: Boxes },
          { label: 'Iadelerim', href: ROUTES.DIYETISYEN_IADE_KITLER, icon: RotateCcw },
          { label: 'Siparis Ver', href: ROUTES.DIYETISYEN_SIPARISLER, icon: Truck },
          { label: 'Siparis Gecmisim', href: ROUTES.DIYETISYEN_SIPARIS_GECMISI, icon: History },
        ]},
        { title: 'Sonuclar', items: [{ label: 'Sonuclar', href: ROUTES.DIYETISYEN_RAPORLAR, icon: BarChart3 }] },
        { title: 'Hesap', items: [{ label: 'Ayarlar', href: ROUTES.DIYETISYEN_AYARLAR, icon: Settings }] },
      ]
    case UserRole.LAB:
      return [
        { title: '', items: [{ label: 'Dashboard', href: ROUTES.LABORATUVAR, icon: LayoutDashboard }] },
        { title: 'Laboratuvar', items: [
          { label: 'Numune Havuzu', href: ROUTES.LABORATUVAR_HAVUZ, icon: TestTubes },
          { label: 'Analizler', href: ROUTES.LABORATUVAR_ANALIZ, icon: FlaskConical },
          { label: 'Sonuclar', href: ROUTES.LABORATUVAR_SONUCLAR, icon: ClipboardList },
          { label: 'Ayarlar', href: ROUTES.LABORATUVAR_AYARLAR, icon: Settings },
        ]},
      ]
    case UserRole.SPECIALIST:
      return [
        { title: '', items: [{ label: 'Dashboard', href: ROUTES.UZMAN, icon: LayoutDashboard }] },
        { title: 'Raporlama', items: [
          { label: 'Analizler', href: ROUTES.UZMAN_ANALIZLER, icon: FlaskConical },
          { label: 'Atanan Analizler', href: ROUTES.UZMAN_ATAMALAR, icon: BookOpen },
          { label: 'Sonuclar', href: ROUTES.UZMAN_SONUCLAR, icon: ClipboardList },
        ]},
        { title: 'Hesap', items: [{ label: 'Ayarlar', href: ROUTES.UZMAN_AYARLAR, icon: Settings }] },
      ]
    case UserRole.DANISAN:
      return [
        { title: '', items: [{ label: 'Ana Sayfa', href: ROUTES.DANISAN, icon: LayoutDashboard }] },
        { title: 'Takip', items: [
          { label: 'Kit Durumum', href: ROUTES.DANISAN_KIT, icon: Package },
          { label: 'Sonuclar', href: ROUTES.DANISAN_RAPORLAR, icon: FileCheck },
        ]},
        { title: 'Hesap', items: [
          { label: 'Bilgilerim', href: ROUTES.DANISAN_BILGILERIM, icon: BookOpen },
          { label: 'Ayarlar', href: ROUTES.DANISAN_AYARLAR, icon: Settings },
        ] },
      ]
    default:
      return []
  }
}


export function Sidebar() {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebarStore()
  const role = useCurrentRole()
  const location = useLocation()
  const { counts: adminBadgeCounts } = useAdminSidebarBadges()

  if (!role) return null

  const navGroups = getNavGroups(role)
  const isAdmin = role === UserRole.ADMIN

  const getBadgeCount = (href: string): number => {
    if (!isAdmin) return 0
    return getAdminSidebarBadgeForHref(href, adminBadgeCounts)
  }

  return (
    <TooltipProvider>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-30 lg:hidden transition-opacity duration-300 bg-black/25',
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-[100dvh] flex w-[min(88vw,320px)] flex-col bg-panel border-r border-surface-200 shadow-sidebar',
          'transition-all duration-300 ease-out will-change-transform',
          collapsed ? 'lg:w-[72px]' : 'lg:w-[260px]',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'pb-[env(safe-area-inset-bottom)]'
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex items-center h-16 px-4 border-b border-surface-200',
            collapsed ? 'justify-center' : 'gap-3'
          )}
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-xl shrink-0 bg-primary-500">
            <TreePine className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden min-w-0">
              <h1 className="text-[13px] font-semibold leading-tight truncate text-surface-900">OmegaTree</h1>
              <p className="text-[8px] leading-tight text-surface-500">Kit Takip</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 overscroll-contain">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {!collapsed && group.title && (
                <p className="text-[8px] font-semibold uppercase tracking-wider mb-2 px-3 text-surface-500">
                  {group.title}
                </p>
              )}
              {collapsed && group.title && (
                <div className="h-px my-2 mx-2 bg-surface-200" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const roleRoot = ROLE_HOME[role]
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== roleRoot && location.pathname.startsWith(item.href))
                  const badgeCount = getBadgeCount(item.href)

                  const linkContent = (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'relative flex items-center gap-3 rounded-xl px-3 py-2 text-[12px] font-medium transition-colors duration-200',
                        isActive
                          ? 'bg-primary-100 text-primary-800'
                          : 'text-surface-700 hover:bg-surface-100 hover:text-surface-900'
                      )}
                    >
                      {isActive && !collapsed && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary-500"
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                      <span className="relative shrink-0">
                        <item.icon
                          className={cn('h-5 w-5', isActive ? 'text-primary-600' : 'text-surface-500')}
                        />
                        {collapsed && badgeCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-0.5 text-[9px] font-bold leading-none text-white">
                            {formatSidebarBadgeCount(badgeCount)}
                          </span>
                        )}
                      </span>
                      {!collapsed && (
                        <span className="truncate flex-1">{item.label}</span>
                      )}
                      {!collapsed && badgeCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-100 px-1 text-[10px] font-bold text-primary-700">
                          {formatSidebarBadgeCount(badgeCount)}
                        </span>
                      )}
                    </NavLink>
                  )

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href} content={item.label} side="right">
                        {linkContent}
                      </Tooltip>
                    )
                  }

                  return <div key={item.href}>{linkContent}</div>
                })}
              </div>
            </div>
          ))}
        </nav>

       
        {/* Collapse toggle */}
        <div className="hidden lg:block p-3 border-t border-surface-200">
          <button
            type="button"
            onClick={toggle}
            className={cn(
              'flex items-center gap-3 w-full rounded-xl px-3 py-2 text-[11px] transition-all duration-200 text-surface-500 hover:bg-surface-100 hover:text-surface-800',
              collapsed && 'justify-center'
            )}
          >
            <ChevronLeft
              className={cn(
                'h-5 w-5 transition-transform duration-300 shrink-0',
                collapsed && 'rotate-180'
              )}
            />
            {!collapsed && <span>Daralt</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
