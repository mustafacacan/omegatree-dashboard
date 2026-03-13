import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, useCurrentUser } from '@/stores/auth.store'
import { useSidebarStore } from '@/stores/sidebar.store'
import { useThemeStore } from '@/stores/theme.store'
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui'
import { USER_ROLE_LABELS } from '@/utils/constants'
import { ROUTES, ROLE_HOME } from '@/utils/routes'
import {
  LogOut,
  Settings,
  User,
  Menu,
  X,
  Moon,
  Sun,
} from 'lucide-react'


function getPageTitle(pathname: string): string {
  if (pathname === ROUTES.YONETICI) return 'Yonetici Paneli'
  if (pathname.startsWith(ROUTES.YONETICI_KULLANICILAR)) return 'Kullanici Yonetimi'
  if (pathname.startsWith(ROUTES.YONETICI_URETIM)) return 'Uretim Merkezi'
  if (pathname.startsWith(ROUTES.YONETICI_FIYATLANDIRMA)) return 'Fiyatlandirma'
  if (pathname.startsWith(ROUTES.YONETICI_STOK)) return 'Stok Takibi'
  if (pathname.startsWith(ROUTES.YONETICI_IADELER)) return 'Iade Talepleri'
  if (pathname.startsWith(ROUTES.YONETICI_SIPARISLER)) return 'Siparisler'
  if (pathname.startsWith(ROUTES.YONETICI_LABORATUVARLAR)) return 'Laboratuvarlar'
  if (pathname.startsWith(ROUTES.YONETICI_DIYETISYENLER)) return 'Diyetisyenler'
  if (pathname.startsWith(ROUTES.YONETICI_SABLONLAR)) return 'Sablonlar'
  if (pathname.startsWith(ROUTES.YONETICI_RAPORLAR)) return 'Rapor Onaylari'
  if (pathname.startsWith(ROUTES.YONETICI_BILDIRIMLER)) return 'Bildirimler'

  if (pathname === ROUTES.DIYETISYEN) return 'Diyetisyen Paneli'
  if (pathname.startsWith(ROUTES.DIYETISYEN_DANISANLAR_YENI)) return 'Yeni Danisan Ekle'
  if (pathname.includes(ROUTES.DIYETISYEN_DANISANLAR + '/') && pathname.endsWith('/duzenle')) return 'Danisan Duzenle'
  if (pathname.includes(ROUTES.DIYETISYEN_DANISANLAR + '/')) return 'Danisan Detayi'
  if (pathname.startsWith(ROUTES.DIYETISYEN_DANISANLAR)) return 'Danisanlarim'
  if (pathname.startsWith(ROUTES.DIYETISYEN_KITLER)) return 'Kit Islemleri'
  if (pathname.startsWith(ROUTES.DIYETISYEN_STOK)) return 'Stogum'
  if (pathname.startsWith(ROUTES.DIYETISYEN_SIPARIS_GECMISI)) return 'Siparis Gecmisim'
  if (pathname.startsWith(ROUTES.DIYETISYEN_SIPARISLER)) return 'Siparis Ver'
  if (pathname.startsWith(ROUTES.DIYETISYEN_RAPORLAR)) return 'Raporlar'
  if (pathname.startsWith(ROUTES.DIYETISYEN_BILDIRIMLER)) return 'Bildirimler'

  if (pathname === ROUTES.LABORATUVAR) return 'Laboratuvar Paneli'
  if (pathname.startsWith(ROUTES.LABORATUVAR_HAVUZ)) return 'Numune Havuzu'
  if (pathname.startsWith(ROUTES.LABORATUVAR_ANALIZ)) return 'Analizler'
  if (pathname.startsWith(ROUTES.LABORATUVAR_SONUCLAR)) return 'Sonuclar'
  if (pathname.startsWith(ROUTES.LABORATUVAR_BILDIRIMLER)) return 'Bildirimler'

  if (pathname === ROUTES.UZMAN) return 'Uzman Paneli'
  if (pathname.startsWith(ROUTES.UZMAN_ANALIZLER)) return 'Analizler'
  if (pathname.startsWith(ROUTES.UZMAN_ATAMALAR)) return 'Atanan Analizler'
  if (pathname.startsWith(ROUTES.UZMAN_RAPORLAR_DUZENLEYICI)) return 'Rapor Editoru'
  if (pathname.startsWith(ROUTES.UZMAN_SONUCLAR)) return 'Sonuclar'
  if (pathname.startsWith(ROUTES.UZMAN_BILDIRIMLER)) return 'Bildirimler'

  if (pathname === ROUTES.DANISAN) return 'Danisan Paneli'
  if (pathname.startsWith(ROUTES.DANISAN_KIT)) return 'Kit Durumum'
  if (pathname.startsWith(ROUTES.DANISAN_RAPORLAR)) return 'Raporlarim'
  if (pathname.startsWith(ROUTES.DANISAN_BILDIRIMLER)) return 'Bildirimler'

  return 'Panel'
}

export function Header() {
  const user = useCurrentUser()
  const { logout } = useAuthStore()
  const { mobileOpen, setMobileOpen } = useSidebarStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)
  const roleBasePath = user ? ROLE_HOME[user.role] : '/'

  if (!user) return null

  return (
    <header
      className="sticky top-0 z-30 h-16 bg-panel/90 dark:bg-surface-100/90 backdrop-blur-md border-b border-surface-200 shadow-sm"
    >
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="lg:hidden p-2.5 rounded-xl transition-colors text-surface-700"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="min-w-0">
            <h2 className="text-[15px] sm:text-[17px] font-semibold truncate text-surface-900">
              {pageTitle}
            </h2>
            <p className="hidden sm:block text-[11px] truncate text-surface-500">
              {USER_ROLE_LABELS[user.role]} paneli
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl transition-colors text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-200"
            title={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
            aria-label={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Divider */}
          <div className="h-6 w-px mx-1.5 bg-surface-200" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-xl py-1.5 px-2.5 transition-colors hover:bg-surface-100"
              >
                <Avatar
                  name={`${user.firstName} ${user.lastName}`}
                  src={user.avatarUrl}
                  size="sm"
                />
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-[13px] font-medium leading-tight text-surface-900">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-[11px] leading-tight text-surface-500">
                    {USER_ROLE_LABELS[user.role]}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-surface-900">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-surface-500">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`${roleBasePath}/profil`)}>
                <User className="mr-2 h-4 w-4" /> Kullanici Profili
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`${roleBasePath}/ayarlar`)}>
                <Settings className="mr-2 h-4 w-4" /> Ayarlar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { logout(); navigate(ROUTES.GIRIS) }}
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
