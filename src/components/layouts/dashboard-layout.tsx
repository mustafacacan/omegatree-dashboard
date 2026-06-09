import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/sidebar.store'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function DashboardLayout() {
  const { collapsed, setMobileOpen } = useSidebarStore()
  const location = useLocation()

  // Route değişince mobil menüyü kapat (mobileOpen dependency yok — açılışta anında kapanma bug'ı)
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, setMobileOpen])

  return (
    <div className="min-h-screen relative overflow-x-clip bg-surface-100">
      <Sidebar />

      <div
        className={cn(
          'relative z-10 min-w-0 transition-all duration-300 ease-out',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
        )}
      >
        <Header />

        <main className="px-4 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-8">
          <div key={location.pathname} className="mx-auto w-full min-w-0 max-w-[1360px] animate-in-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
