import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES, getBasePath } from '@/utils/routes'
import { Button } from '@/components/ui'
import { OmegaTreeLogo } from '@/components/shared/omega-tree-logo'
import { Home, ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const basePath = getBasePath(location.pathname)
  const canGoBack = basePath && basePath !== '/'

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-panel shadow-lg overflow-hidden">
        <div className="p-8 text-center">
          <div className="mb-6 flex justify-center">
            <OmegaTreeLogo variant="auth" />
          </div>
          <p className="text-5xl font-black text-surface-300 dark:text-surface-600 mb-2">404</p>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">
            Sayfa bulunamadi
          </h1>
          <p className="mt-2 text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
            Aradiginiz sayfa kaldirilmis, tasinmis veya adresi yanlis olabilir. Ana sayfaya donup
            tekrar deneyebilirsiniz.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
            {canGoBack && (
              <Button variant="outline" onClick={() => navigate(basePath)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Panele don
              </Button>
            )}
            <Button variant="primary" onClick={() => navigate(ROUTES.GIRIS)}>
              <Home className="h-4 w-4 mr-2" />
              Giris sayfasina don
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
