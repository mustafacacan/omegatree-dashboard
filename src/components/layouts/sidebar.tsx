import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/sidebar.store'
import { useCurrentRole, useCurrentUser } from '@/stores/auth.store'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useLaboratoriesStore } from '@/stores/laboratories.store'
import { UserRole, KitStatus } from '@/utils/constants'
import { ROUTES, ROLE_HOME } from '@/utils/routes'
import { Tooltip, TooltipProvider } from '@/components/ui'
import {
  LayoutDashboard,
  Users,
  Factory,
  DollarSign,
  Package,
  ShoppingCart,
  CreditCard,
  Shield,
  FileText,
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
  MapPin,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
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
          { label: 'Cari Hesaplar', href: ROUTES.YONETICI_CARI, icon: CreditCard },
          { label: 'Laboratuvarlar', href: ROUTES.YONETICI_LABORATUVARLAR, icon: TestTubes },
          { label: 'Rapor Onaylari', href: ROUTES.YONETICI_RAPORLAR, icon: FileCheck },
        ]},
        { title: 'Sistem', items: [
          { label: 'Sablonlar', href: ROUTES.YONETICI_SABLONLAR, icon: FileText },
          { label: 'Denetim Izi', href: ROUTES.YONETICI_DENETIM, icon: Shield },
          { label: 'Ayarlar', href: ROUTES.YONETICI_AYARLAR, icon: Settings },
        ]},
      ]
    case UserRole.DIETITIAN:
      return [
        { title: '', items: [{ label: 'Dashboard', href: ROUTES.DIYETISYEN, icon: LayoutDashboard }] },
        { title: 'Danisanlar', items: [
          { label: 'Danisanlarim', href: ROUTES.DIYETISYEN_DANISANLAR, icon: Users },
          { label: 'Yeni Danisan Ekle', href: ROUTES.DIYETISYEN_DANISANLAR_YENI, icon: UserPlus },
        ]},
        { title: 'Kit & Stok', items: [
          { label: 'Kitlerim', href: ROUTES.DIYETISYEN_KITLER, icon: FlaskConical },
          { label: 'Stogum', href: ROUTES.DIYETISYEN_STOK, icon: Boxes },
          { label: 'Siparis Ver', href: ROUTES.DIYETISYEN_SIPARISLER, icon: Truck },
        ]},
        { title: 'Sonuclar', items: [{ label: 'Raporlar', href: ROUTES.DIYETISYEN_RAPORLAR, icon: BarChart3 }] },
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
          { label: 'Atanan Analizler', href: ROUTES.UZMAN_ATAMALAR, icon: BookOpen },
          { label: 'Raporlarim', href: ROUTES.UZMAN_RAPORLAR, icon: FileCheck },
        ]},
        { title: 'Hesap', items: [{ label: 'Ayarlar', href: ROUTES.UZMAN_AYARLAR, icon: Settings }] },
      ]
    case UserRole.DANISAN:
      return [
        { title: '', items: [{ label: 'Panelim', href: ROUTES.DANISAN, icon: LayoutDashboard }] },
        { title: 'Takip', items: [
          { label: 'Kit Durumum', href: ROUTES.DANISAN_KIT, icon: Package },
          { label: 'Raporlarim', href: ROUTES.DANISAN_RAPORLAR, icon: FileCheck },
        ]},
        { title: 'Hesap', items: [{ label: 'Ayarlar', href: ROUTES.DANISAN_AYARLAR, icon: Settings }] },
      ]
    default:
      return []
  }
}

/* Nutrigo warm palette */
const W = {
  olive: '#8B9A4B',
  oliveDark: '#6B7A3B',
  oliveLight: '#EEF2DE',
  cream: '#F9F7F3',
  creamDark: '#F0EDE7',
  warmBorder: '#E8E4DE',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
  warmGrayLight: '#B5AFA5',
}

export function Sidebar() {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebarStore()
  const role = useCurrentRole()
  const user = useCurrentUser()
  const location = useLocation()
  const kits = useWorkflowStore((s) => s.kits)
  const orders = useWorkflowStore((s) => s.orders)
  const laboratories = useLaboratoriesStore((s) => s.laboratories)
  const returnRequestCount = kits.filter((k) => k.status === KitStatus.RETURN_REQUESTED).length
  const pendingOrderCount = orders.filter((o) => o.assignedBarcodes.length < o.qty).length
  const pendingReportApprovalCount = kits.filter(
    (k) => k.status === KitStatus.ADMIN_APPROVAL && (k.reportStatus === 'ADMIN_APPROVAL' || !k.reportStatus)
  ).length
  const assignedLab = role === UserRole.DIETITIAN && user?.id
    ? laboratories.find((l) => l.assignedDietitians.includes(user.id))
    : null

  if (!role) return null

  const navGroups = getNavGroups(role)

  const getBadge = (item: NavItem): number | undefined => {
    if (item.href === ROUTES.YONETICI_IADELER) return returnRequestCount
    if (item.href === ROUTES.YONETICI_SIPARISLER) return pendingOrderCount
    if (item.href === ROUTES.YONETICI_RAPORLAR) return pendingReportApprovalCount
    return item.badge
  }

  return (
    <TooltipProvider>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-30 lg:hidden transition-opacity duration-300',
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{ background: 'rgba(45,42,38,0.25)' }}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen flex flex-col',
          'transition-all duration-300 ease-out',
          collapsed ? 'w-[72px]' : 'w-[260px]',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          background: '#FFFFFF',
          borderRight: `1px solid ${W.warmBorder}`,
        }}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex items-center h-16 px-4',
            collapsed ? 'justify-center' : 'gap-3'
          )}
          style={{ borderBottom: `1px solid ${W.creamDark}` }}
        >
          <div
            className="flex items-center justify-center h-10 w-10 rounded-xl shrink-0"
            style={{ background: W.olive }}
          >
            <TreePine className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden min-w-0">
              <h1 className="text-[13px] font-semibold leading-tight truncate" style={{ color: W.dark }}>OmegaTree</h1>
              <p className="text-[8px] leading-tight" style={{ color: W.textLight }}>Kit Takip</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {!collapsed && group.title && (
                <p
                  className="text-[8px] font-semibold uppercase tracking-wider mb-2 px-3"
                  style={{ color: W.warmGrayLight }}
                >
                  {group.title}
                </p>
              )}
              {collapsed && group.title && (
                <div className="h-px my-2 mx-2" style={{ background: W.creamDark }} />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const roleRoot = ROLE_HOME[role]
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== roleRoot && location.pathname.startsWith(item.href))
                  const badge = getBadge(item)

                  const linkContent = (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-200"
                      style={
                        isActive
                          ? { background: W.oliveLight, color: W.oliveDark }
                          : { color: W.text }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = W.cream
                          e.currentTarget.style.color = W.dark
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = W.text
                        }
                      }}
                    >
                      <item.icon
                        className="h-5 w-5 shrink-0"
                        style={{ color: isActive ? W.olive : W.warmGrayLight }}
                      />
                      {!collapsed && (
                        <span className="truncate flex-1">{item.label}</span>
                      )}
                      {!collapsed && badge != null && badge > 0 && (
                        <span
                          className="flex h-5 min-w-5 items-center justify-center rounded-full text-[8px] font-bold px-1"
                          style={{ background: W.oliveLight, color: W.olive }}
                        >
                          {badge}
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

        {/* Diyetisyen: Atanan laboratuvar adresi (her sayfada görünür) */}
        {role === UserRole.DIETITIAN && (
          <div className="px-3 pb-2" style={{ borderTop: `1px solid ${W.creamDark}` }}>
            {collapsed ? (
              assignedLab && (
                <Tooltip
                  content={
                    <span className="block max-w-[220px] text-left">
                      <strong>{assignedLab.name}</strong>
                      <br />
                      {assignedLab.address}, {assignedLab.district ?? ''} {assignedLab.city}
                    </span>
                  }
                  side="right"
                >
                  <div
                    className="flex justify-center py-2 rounded-xl"
                    style={{ background: W.oliveLight }}
                  >
                    <MapPin className="h-5 w-5 shrink-0" style={{ color: W.olive }} />
                  </div>
                </Tooltip>
              )
            ) : assignedLab ? (
              <div
                className="rounded-xl p-3 border"
                style={{ background: W.oliveLight, borderColor: W.warmBorder }}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" style={{ color: W.olive }} />
                  <div className="min-w-0">
                    <p className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: W.textLight }}>Laboratuvarim</p>
                    <p className="text-[10px] font-semibold mt-0.5 truncate" style={{ color: W.dark }} title={assignedLab.name}>{assignedLab.name}</p>
                    <p className="text-[9px] mt-1 leading-snug line-clamp-2" style={{ color: W.text }} title={`${assignedLab.address}${assignedLab.district ? `, ${assignedLab.district}` : ''} / ${assignedLab.city}`}>
                      {assignedLab.address}
                      {assignedLab.district ? `, ${assignedLab.district}` : ''} / {assignedLab.city}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-3 border" style={{ background: W.cream, borderColor: W.warmBorder }}>
                <p className="text-[9px]" style={{ color: W.textLight }}>Atanmis laboratuvar yok.</p>
              </div>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <div className="p-3" style={{ borderTop: `1px solid ${W.creamDark}` }}>
          <button
            type="button"
            onClick={toggle}
            className={cn(
              'flex items-center gap-3 w-full rounded-xl px-3 py-2 text-[11px] transition-all duration-200',
              collapsed && 'justify-center'
            )}
            style={{ color: W.warmGrayLight }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = W.cream
              e.currentTarget.style.color = W.text
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = W.warmGrayLight
            }}
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
