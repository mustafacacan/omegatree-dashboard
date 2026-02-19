import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'

export function RouteErrorFallback() {
  const error = useRouteError()
  const navigate = useNavigate()

  const message = isRouteErrorResponse(error)
    ? `${error.status} - ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Beklenmeyen bir hata olustu.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-surface-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-surface-900">Sayfa Yuklenemedi</h1>
        <p className="mt-2 text-sm text-surface-500">{message}</p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Geri Don
          </Button>
          <Button variant="primary" onClick={() => navigate('/login')}>
            Giris Sayfasina Git
          </Button>
        </div>
      </div>
    </div>
  )
}
