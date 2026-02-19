import { Outlet } from 'react-router-dom'
import { TreePine } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex" style={{ background: '#F9F7F3' }}>
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between p-10 relative overflow-hidden" style={{ background: '#2D2A26' }}>
        {/* Subtle organic pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Warm decorative glow */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #8B9A4B 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl" style={{ background: '#8B9A4B' }}>
            <TreePine className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">OmegaTree</h1>
            <p className="text-[11px] tracking-wide" style={{ color: '#9C968D' }}>Kit Takip Sistemi</p>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-semibold text-white leading-tight">
              Analiz sureclerinizi
              <br />
              <span style={{ color: '#9DB068' }}>uctan uca yonetin.</span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed max-w-sm" style={{ color: '#9C968D' }}>
              Barkod tabanli kit takibi, kor analiz protokolu ve gercek zamanli bildirimlerle profesyonel laboratuvar yonetimi.
            </p>
          </div>

          {/* Clean stats */}
          <div className="flex gap-10">
            {[
              { value: '10K+', label: 'Analiz' },
              { value: '500+', label: 'Diyetisyen' },
              { value: '%99.9', label: 'Uptime' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B665E' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs" style={{ color: '#6B665E' }}>
          &copy; {new Date().getFullYear()} OmegaTree Saglik Teknolojileri
        </p>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-[400px]">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
