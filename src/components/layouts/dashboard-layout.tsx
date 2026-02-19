import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/sidebar.store'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function DashboardLayout() {
  const { collapsed } = useSidebarStore()

  return (
    <div className="min-h-screen" style={{ background: '#F4F6EE' }}>
      <Sidebar />

      <div
        className={cn(
          'transition-all duration-300 ease-out',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
        )}
      >
        <Header />

        <main className="p-4 lg:p-6">
          <div className="mx-auto max-w-[1360px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
