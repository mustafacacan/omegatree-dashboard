import { useState } from 'react'
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { ROUTES } from '@/utils/routes'
import { AlertTriangle, ChevronDown, ChevronUp, Copy, Home, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

function getStatusTitle(status: number): string {
  if (status === 404) return 'Sayfa bulunamadi'
  if (status >= 500) return 'Sunucu hatasi'
  if (status === 403) return 'Erisim engellendi'
  if (status === 401) return 'Oturum gerekli'
  if (status >= 400) return 'Istek hatasi'
  return 'Sayfa yuklenemedi'
}

function getStatusDescription(status: number): string {
  if (status === 404) return 'Aradiginiz sayfa kaldirilmis, tasinmis veya adresi yanlis olabilir.'
  if (status >= 500) return 'Sunucu gecici olarak yanit veremiyor. Lutfen kisa sure sonra tekrar deneyin.'
  if (status === 403) return 'Bu sayfaya erisim yetkiniz bulunmuyor.'
  if (status === 401) return 'Bu islemi yapmak icin giris yapmaniz gerekiyor.'
  if (status >= 400) return 'Istek gecerli degil veya sunucu tarafindan reddedildi.'
  return 'Beklenmeyen bir hata olustu.'
}

export function RouteErrorFallback() {
  const error = useRouteError()
  const navigate = useNavigate()
  const [showDetails, setShowDetails] = useState(false)

  const isRouteError = isRouteErrorResponse(error)
  const status = isRouteError ? error.status : null
  const statusText = isRouteError ? error.statusText : null
  const errorData = isRouteError && error.data != null ? error.data : null
  const errorMessage = error instanceof Error ? error.message : null
  const errorStack = error instanceof Error ? error.stack : null
  const genericMessage = !isRouteError && !(error instanceof Error)
    ? 'Beklenmeyen bir hata olustu.'
    : null

  const title = status != null ? getStatusTitle(status) : 'Sayfa yuklenemedi'
  const description =
    status != null
      ? getStatusDescription(status)
      : errorMessage ?? genericMessage ?? 'Lutfen sayfayi yenileyin veya giris sayfasindan devam edin.'

  const detailLines: string[] = []
  if (status != null) detailLines.push(`Durum: ${status} ${statusText ?? ''}`.trim())
  if (errorMessage) detailLines.push(`Mesaj: ${errorMessage}`)
  if (errorData && typeof errorData === 'string') detailLines.push(String(errorData))
  else if (errorData && typeof errorData === 'object') {
    try {
      detailLines.push(JSON.stringify(errorData, null, 2))
    } catch {
      detailLines.push(String(errorData))
    }
  }
  if (errorStack) detailLines.push(`\n${errorStack}`)
  const detailText = detailLines.join('\n')

  const handleCopy = () => {
    const payload = [
      `[${new Date().toISOString()}]`,
      title,
      description,
      '',
      '--- Detay ---',
      detailText || '(yok)',
    ].join('\n')
    navigator.clipboard.writeText(payload).then(
      () => toast.success('Hata detayi panoya kopyalandi'),
      () => toast.error('Kopyalama basarisiz')
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-100 px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-surface-200 bg-panel shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              {status != null && (
                <p className="text-sm font-mono font-semibold text-surface-500 dark:text-surface-400">
                  HTTP {status}
                  {statusText ? ` — ${statusText}` : ''}
                </p>
              )}
              <h1 className="mt-1 text-xl font-bold text-surface-900 dark:text-surface-100">
                {title}
              </h1>
              <p className="mt-2 text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* Collapsible technical details */}
        {detailText.trim() && (
          <div className="border-t border-surface-200 px-6">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full py-3 flex items-center justify-between gap-2 text-left text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200"
            >
              Teknik detaylar
              {showDetails ? (
                <ChevronUp className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" />
              )}
            </button>
            {showDetails && (
              <div className="pb-4">
                <pre className="p-4 rounded-xl bg-surface-100 dark:bg-surface-200/80 text-xs text-surface-700 dark:text-surface-300 overflow-x-auto max-h-48 overflow-y-auto font-mono whitespace-pre-wrap break-words">
                  {detailText.trim()}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleCopy}
                >
                  <Copy className="h-3.5 w-3.5 mr-2" />
                  Detayi kopyala
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="p-6 pt-4 flex flex-wrap items-center justify-center gap-2 bg-surface-50/50 dark:bg-surface-200/20">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Geri don
          </Button>
          <Button variant="primary" onClick={() => navigate(ROUTES.GIRIS)}>
            <Home className="h-4 w-4 mr-2" />
            Giris sayfasina git
          </Button>
          {detailText.trim() && !showDetails && (
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Detayi kopyala
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
