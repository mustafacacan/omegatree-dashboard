import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { PdfViewer } from '@/components/shared/pdf-viewer'
import { Shield } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow.store'

/**
 * Guvenli paylasim linki ile acildiginda: rapor icerigi + PDF goruntuleme.
 * reportId (RPT-00149) ile store'dan barkod bulunur, reportContent gosterilir.
 */
export function ShareReportPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const kits = useWorkflowStore((s) => s.kits)

  const isValid = Boolean(reportId && token && token.startsWith('sec_'))

  const kit = useMemo(() => {
    if (!reportId || !isValid) return null
    const suffix = reportId.replace(/^RPT-/, '')
    return kits.find((k) => {
      const parts = k.barcode.split('-')
      return parts[parts.length - 1] === suffix || `RPT-${parts[parts.length - 1]}` === reportId
    }) ?? null
  }, [kits, reportId, isValid])

  const content = kit?.reportContent

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
          <div className="space-y-4">
            {content && (content.generalEvaluation || content.nutritionAdvice || content.supplementAdvice) && (
              <div className="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
                {content.generalEvaluation && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">Genel Degerlendirme</h4>
                    <p className="text-sm text-surface-800 whitespace-pre-wrap">{content.generalEvaluation}</p>
                  </div>
                )}
                {content.nutritionAdvice && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">Beslenme Onerileri</h4>
                    <p className="text-sm text-surface-800 whitespace-pre-wrap">{content.nutritionAdvice}</p>
                  </div>
                )}
                {content.supplementAdvice && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">Takviye Onerileri</h4>
                    <p className="text-sm text-surface-800 whitespace-pre-wrap">{content.supplementAdvice}</p>
                  </div>
                )}
              </div>
            )}
            <PdfViewer
              file={content?.pdfUrl}
              maxHeight="85vh"
              className="mt-4"
            />
          </div>
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
