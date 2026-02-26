import { useParams, useSearchParams } from 'react-router-dom'
import { PdfViewer } from '@/components/shared/pdf-viewer'
import { Shield } from 'lucide-react'

/**
 * Güvenli paylaşım linki ile açıldığında: sadece PDF görüntüleme.
 * Sistem dışına çıkmadan, indirme veya e-posta olmadan; link veya QR ile erişilir.
 */
export function ShareReportPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const isValid = Boolean(reportId && token && token.startsWith('sec_'))

  return (
    <div className="min-h-screen bg-surface-100 flex flex-col">
      <header className="bg-white border-b border-surface-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary-500" />
          <span className="text-sm font-medium text-surface-700">
            Bu rapor guvenli link ile paylasildi — sadece goruntuleme
          </span>
        </div>
      </header>
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {isValid ? (
          <PdfViewer
            file={undefined}
            maxHeight="85vh"
            className="mt-4"
          />
        ) : (
          <div className="mt-12 text-center">
            <p className="text-surface-600">Gecersiz veya eksik paylasim linki.</p>
            <p className="text-sm text-surface-500 mt-1">
              Dogru linki veya QR kodu kullandiginizdan emin olun.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
