import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/sidebar.store'
import { useCurrentRole } from '@/stores/auth.store'
import { useWorkflowStore } from '@/stores/workflow.store'
import { UserRole, KitStatus } from '@/utils/constants'
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
        { title: '', items: [{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard }] },
        { title: 'Yonetim', items: [
          { label: 'Kullanicilar', href: '/admin/users', icon: Users },
          { label: 'Uretim Merkezi', href: '/admin/production', icon: Factory },
          { label: 'Fiyatlandirma', href: '/admin/pricing', icon: DollarSign },
        ]},
        { title: 'Operasyon', items: [
          { label: 'Stok Takibi', href: '/admin/stock', icon: Package },
          { label: 'Iade Talepleri', href: '/admin/returns', icon: RotateCcw },
          { label: 'Siparisler', href: '/admin/orders', icon: ShoppingCart },
          { label: 'Cari Hesaplar', href: '/admin/cari', icon: CreditCard },
          { label: 'Laboratuvarlar', href: '/admin/laboratories', icon: TestTubes },
        ]},
        { title: 'Sistem', items: [
          { label: 'Sablonlar', href: '/admin/templates', icon: FileText },
          { label: 'Denetim Izi', href: '/admin/audit', icon: Shield },
        ]},
      ]
    case UserRole.DIETITIAN:
      return [
        { title: '', items: [{ label: 'Dashboard', href: '/dietitian', icon: LayoutDashboard }] },
        { title: 'Danisanlar', items: [
          { label: 'Danisanlarim', href: '/dietitian/clients', icon: Users },
          { label: 'Yeni Danisan Ekle', href: '/dietitian/clients/new', icon: UserPlus },
        ]},
        { title: 'Kit & Stok', items: [
          { label: 'Kitlerim', href: '/dietitian/kits', icon: FlaskConical },
          { label: 'Stogum', href: '/dietitian/stock', icon: Boxes },
          { label: 'Siparis Ver', href: '/dietitian/orders', icon: Truck },
        ]},
        { title: 'Sonuclar', items: [{ label: 'Raporlar', href: '/dietitian/reports', icon: BarChart3 }] },
      ]
    case UserRole.LAB:
      return [
        { title: '', items: [{ label: 'Dashboard', href: '/lab', icon: LayoutDashboard }] },
        { title: 'Laboratuvar', items: [
          { label: 'Numune Havuzu', href: '/lab/pool', icon: TestTubes },
          { label: 'Analizler', href: '/lab/analysis', icon: FlaskConical },
          { label: 'Sonuclar', href: '/lab/results', icon: ClipboardList },
        ]},
      ]
    case UserRole.SPECIALIST:
      return [
        { title: '', items: [{ label: 'Dashboard', href: '/specialist', icon: LayoutDashboard }] },
        { title: 'Raporlama', items: [
          { label: 'Atanan Analizler', href: '/specialist/assignments', icon: BookOpen },
          { label: 'Raporlarim', href: '/specialist/reports', icon: FileCheck },
        ]},
      ]
    case UserRole.DANISAN:
      return [
        { title: '', items: [{ label: 'Panelim', href: '/danisan', icon: LayoutDashboard }] },
        { title: 'Takip', items: [
          { label: 'Kit Durumum', href: '/danisan/kit', icon: Package },
          { label: 'Raporlarim', href: '/danisan/raporlar', icon: FileCheck },
        ]},
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
  const location = useLocation()
  const kits = useWorkflowStore((s) => s.kits)
  const returnRequestCount = kits.filter((k) => k.status === KitStatus.RETURN_REQUESTED).length

  if (!role) return null

  const navGroups = getNavGroups(role)

  const getBadge = (item: NavItem): number | undefined => {
    if (item.href === '/admin/returns') return returnRequestCount
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
              <h1 className="text-[15px] font-semibold leading-tight truncate" style={{ color: W.dark }}>OmegaTree</h1>
              <p className="text-[10px] leading-tight" style={{ color: W.textLight }}>Kit Takip</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {!collapsed && group.title && (
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-3"
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
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== '/' + role.toLowerCase() &&
                      location.pathname.startsWith(item.href))
                  const badge = getBadge(item)

                  const linkContent = (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200"
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
                          className="flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold px-1"
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

        {/* Collapse toggle */}
        <div className="p-3" style={{ borderTop: `1px solid ${W.creamDark}` }}>
          <button
            type="button"
            onClick={toggle}
            className={cn(
              'flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200',
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
