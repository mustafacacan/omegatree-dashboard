import { Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/sidebar.store'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function DashboardLayout() {
  const { collapsed } = useSidebarStore()
  const location = useLocation()

  return (
    <div className="min-h-screen relative" style={{ background: '#F4F6EE' }}>
      <Sidebar />

      <div
        className={cn(
          'relative z-10 transition-all duration-300 ease-out',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
        )}
      >
        <Header />

        <main className="p-6 lg:p-8">
          <div key={location.pathname} className="mx-auto max-w-[1360px] animate-in-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
