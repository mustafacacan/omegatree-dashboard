import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { TreePine } from 'lucide-react'
import { useThemeStore } from '@/stores/theme.store'
import { publicAssetUrl } from '@/lib/media-url'

const LOGIN_BG_URL = publicAssetUrl('asset/img/home-one-bg.jpg')

export function AuthLayout() {
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    return () => {
      const theme = useThemeStore.getState().theme
      if (theme === 'dark') document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }
  }, [])

  return (
    <div className="min-h-screen flex" style={{ background: '#F9F7F3' }}>
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-[640px] xl:w-[740px] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${LOGIN_BG_URL}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(157,176,104,0.35),transparent_50%)]" />

        <div className="relative z-10 flex w-full flex-col justify-between py-10 pl-14 pr-6 xl:pl-20 xl:pr-8">
          <div className="flex items-center gap-3 self-start">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary-500/95 backdrop-blur-sm">
              <TreePine className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">OmegaTree</h1>
              <p className="text-[11px] tracking-wide text-white/75">Kit Takip Sistemi</p>
            </div>
          </div>

          <div className="ml-auto w-full max-w-md space-y-6">
            <div className="max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
              <h2 className="text-3xl font-semibold text-white leading-tight">
                Analiz süreçlerinizi
                <br />
                <span className="text-primary-200">uçtan uca yönetin.</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/80">
                Barkod tabanlı kit takibi, kör analiz protokolü ve gerçek zamanlı bildirimlerle profesyonel laboratuvar yönetimi.
              </p>
            </div>

            <div className="max-w-md rounded-2xl border border-white/20 bg-black/20 p-4 backdrop-blur-sm space-y-3">
              <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-white/70">
                Neler Sunuyor?
              </p>
              <div className="space-y-2.5">
                {[
                  'Barkod doğrulama ile hızlı kit teslim alma',
                  'Laboratuvara gönderim ve durum takibini tek ekrandan yönetme',
                  'Hasarlı kitler için kanıt dosyalı iade talebi oluşturma',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary-200" />
                    <p className="text-[13px] leading-relaxed text-white/90">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-white/65 w-full text-center">
            &copy; {new Date().getFullYear()} OmegaTree Sağlık Teknolojileri
          </p>
        </div>
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
