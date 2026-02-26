import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, useCurrentUser } from '@/stores/auth.store'
import { useSidebarStore } from '@/stores/sidebar.store'
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui'
import { NotificationDropdown } from '@/features/auth/components/notification-dropdown'
import { USER_ROLE_LABELS } from '@/utils/constants'
import {
  LogOut,
  Settings,
  User,
  Menu,
  X,
} from 'lucide-react'

/* Nutrigo warm palette */
const W = {
  olive: '#8B9A4B',
  oliveLight: '#EEF2DE',
  orange: '#E8913A',
  orangeLight: '#FDF0E2',
  cream: '#F9F7F3',
  creamDark: '#F0EDE7',
  warmBorder: '#E8E4DE',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
  warmGrayLight: '#B5AFA5',
}

function getBasePath(pathname: string): string {
  if (pathname.startsWith('/admin')) return '/admin'
  if (pathname.startsWith('/dietitian')) return '/dietitian'
  if (pathname.startsWith('/lab')) return '/lab'
  if (pathname.startsWith('/specialist')) return '/specialist'
  if (pathname.startsWith('/danisan')) return '/danisan'
  return '/'
}

function getPageTitle(pathname: string): string {
  if (pathname === '/admin') return 'Admin Dashboard'
  if (pathname.startsWith('/admin/users')) return 'Kullanici Yonetimi'
  if (pathname.startsWith('/admin/production')) return 'Uretim Merkezi'
  if (pathname.startsWith('/admin/pricing')) return 'Fiyatlandirma'
  if (pathname.startsWith('/admin/stock')) return 'Stok Takibi'
  if (pathname.startsWith('/admin/returns')) return 'Iade Talepleri'
  if (pathname.startsWith('/admin/orders')) return 'Siparisler'
  if (pathname.startsWith('/admin/cari')) return 'Cari Hesaplar'
  if (pathname.startsWith('/admin/templates')) return 'Sablonlar'
  if (pathname.startsWith('/admin/audit')) return 'Denetim Izi'
  if (pathname.startsWith('/admin/reports')) return 'Rapor Onaylari'
  if (pathname.startsWith('/admin/notifications')) return 'Bildirimler'

  if (pathname === '/dietitian') return 'Diyetisyen Dashboard'
  if (pathname.startsWith('/dietitian/clients/new')) return 'Yeni Danisan Ekle'
  if (pathname.includes('/dietitian/clients/') && pathname.endsWith('/edit')) return 'Danisan Duzenle'
  if (pathname.includes('/dietitian/clients/')) return 'Danisan Detayi'
  if (pathname.startsWith('/dietitian/clients')) return 'Danisanlarim'
  if (pathname.startsWith('/dietitian/kits')) return 'Kit Islemleri'
  if (pathname.startsWith('/dietitian/stock')) return 'Stogum'
  if (pathname.startsWith('/dietitian/orders')) return 'Siparislerim'
  if (pathname.startsWith('/dietitian/reports')) return 'Raporlar'
  if (pathname.startsWith('/dietitian/notifications')) return 'Bildirimler'

  if (pathname === '/lab') return 'Laboratuvar Dashboard'
  if (pathname.startsWith('/lab/pool')) return 'Numune Havuzu'
  if (pathname.startsWith('/lab/analysis')) return 'Analizler'
  if (pathname.startsWith('/lab/results')) return 'Sonuclar'
  if (pathname.startsWith('/lab/notifications')) return 'Bildirimler'

  if (pathname === '/specialist') return 'Uzman Dashboard'
  if (pathname.startsWith('/specialist/assignments')) return 'Atanan Analizler'
  if (pathname.startsWith('/specialist/reports/editor')) return 'Rapor Editoru'
  if (pathname.startsWith('/specialist/reports')) return 'Raporlarim'
  if (pathname.startsWith('/specialist/notifications')) return 'Bildirimler'

  if (pathname === '/danisan') return 'Danisan Paneli'
  if (pathname.startsWith('/danisan/kit')) return 'Kit Durumum'
  if (pathname.startsWith('/danisan/raporlar')) return 'Raporlarim'
  if (pathname.startsWith('/danisan/notifications')) return 'Bildirimler'

  return 'Panel'
}

export function Header() {
  const user = useCurrentUser()
  const { logout } = useAuthStore()
  const { mobileOpen, setMobileOpen } = useSidebarStore()
  const navigate = useNavigate()
  const location = useLocation()
  const basePath = getBasePath(location.pathname)
  const pageTitle = getPageTitle(location.pathname)

  if (!user) return null

  return (
    <header
      className="sticky top-0 z-30 h-16"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${W.warmBorder}`,
      }}
    >
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="lg:hidden p-2.5 rounded-xl transition-colors"
            style={{ color: W.text }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="min-w-0">
            <h2 className="text-[15px] sm:text-[17px] font-semibold truncate" style={{ color: W.dark }}>
              {pageTitle}
            </h2>
            <p className="hidden sm:block text-[11px] truncate" style={{ color: W.textLight }}>
              {USER_ROLE_LABELS[user.role]} paneli
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Notification dropdown */}
          <NotificationDropdown />

          {/* Divider */}
          <div className="h-6 w-px mx-1.5" style={{ background: W.warmBorder }} />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-xl py-1.5 px-2.5 transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.background = W.cream }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <Avatar
                  name={`${user.firstName} ${user.lastName}`}
                  src={user.avatarUrl}
                  size="sm"
                />
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-[13px] font-medium leading-tight" style={{ color: W.dark }}>
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-[11px] leading-tight" style={{ color: W.textLight }}>
                    {USER_ROLE_LABELS[user.role]}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium" style={{ color: W.dark }}>{user.firstName} {user.lastName}</p>
                  <p className="text-xs" style={{ color: W.textLight }}>{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`${basePath}/profile`)}>
                <User className="mr-2 h-4 w-4" /> Kullanici Profili
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`${basePath}/settings`)}>
                <Settings className="mr-2 h-4 w-4" /> Ayarlar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { logout(); navigate('/login') }}
                className="text-danger focus:text-danger"
              >
                <LogOut className="mr-2 h-4 w-4" /> Cikis Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
