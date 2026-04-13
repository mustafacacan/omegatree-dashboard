import { useState, useEffect, useMemo } from 'react'
import { Document, Page } from 'react-pdf'
import { setPdfWorker } from '@/lib/pdf-worker'
import { FileText, Loader2 } from 'lucide-react'
import { getApiOrigin } from '@/lib/env'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

export interface PdfViewerProps {
  /** PDF URL */
  file?: string | null
  /** Optional title above viewer */
  title?: string
  /** Max height for scroll container (default 70vh) */
  maxHeight?: string
  className?: string
  /** Rendering strategy. 'auto' tries react-pdf then falls back; 'iframe' uses browser preview only. */
  mode?: 'auto' | 'iframe'
}

export function PdfViewer({ file, title, maxHeight = '70vh', className = '', mode = 'auto' }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [workerSet, setWorkerSet] = useState(false)
  const [useIframeFallback, setUseIframeFallback] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [iframeError, setIframeError] = useState(false)

  const resolvedUrl = useMemo(() => {
    const raw = (file || '').trim()
    if (!raw) return raw
    if (/^(data:|blob:|https?:\/\/)/i.test(raw)) return raw

    const origin = getApiOrigin()

    if (raw.startsWith('/')) return `${origin}${raw}`
    return `${origin}/${raw}`
  }, [file])

  useEffect(() => {
    setPdfWorker()
    setWorkerSet(true)
  }, [])

  useEffect(() => {
    setNumPages(null)
    setUseIframeFallback(false)
    setIframeLoaded(false)
    setIframeError(false)
  }, [resolvedUrl])

  const url = resolvedUrl

  if (!url) {
    return (
      <div className={className}>
        {title && (
          <h3 className="text-sm font-semibold text-surface-800 mb-3">{title}</h3>
        )}
        <div className="rounded-lg border border-surface-200 bg-surface-50">
          <div className="flex flex-col items-center justify-center p-6">
            <FileText className="h-10 w-10 text-surface-400 mb-2" />
            <p className="text-sm text-surface-600">PDF bulunamadi.</p>
            <p className="text-xs text-surface-500 mt-1">Rapor dosyasi henuz olusmamis olabilir.</p>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'iframe') {
    return (
      <div className={className}>
        {title && (
          <h3 className="text-sm font-semibold text-surface-800 mb-3">{title}</h3>
        )}
        <div className="rounded-lg border border-surface-200 bg-surface-50 overflow-hidden" style={{ height: maxHeight }}>
          <iframe
            title={title || 'PDF'}
            src={url}
            className="w-full h-full"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    )
  }

  const onLoadSuccess = ({ numPages: n }: { numPages: number }) => setNumPages(n)
  const onLoadError = () => {
    setUseIframeFallback(true)
  }

  if (!workerSet) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-surface-100 ${className}`} style={{ minHeight: 400 }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (useIframeFallback) {
    return (
      <div className={className}>
        {title && (
          <h3 className="text-sm font-semibold text-surface-800 mb-3">{title}</h3>
        )}

        {iframeError ? (
          <div className="rounded-lg border border-surface-200 bg-surface-50">
            <div className="flex flex-col items-center justify-center p-6">
              <FileText className="h-10 w-10 text-surface-400 mb-2" />
              <p className="text-sm text-surface-600">PDF önizlemesi açılamadı.</p>
              <p className="text-xs text-surface-500 mt-1">Dosya bağlantısını kontrol edip tekrar deneyin.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-surface-200 bg-surface-50 overflow-hidden relative" style={{ height: maxHeight }}>
            {!iframeLoaded ? (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
              </div>
            ) : null}
            <iframe
              title={title || 'PDF'}
              src={url}
              className="w-full h-full"
              referrerPolicy="no-referrer"
              onLoad={() => setIframeLoaded(true)}
              onError={() => setIframeError(true)}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      {title && (
        <h3 className="text-sm font-semibold text-surface-800 mb-3">{title}</h3>
      )}
      <div
        className="overflow-auto rounded-lg border border-surface-200 bg-surface-50"
        style={{ maxHeight }}
      >
        <Document
          file={url}
          onLoadSuccess={onLoadSuccess}
          onLoadError={onLoadError}
          loading={
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          }
        >
          {numPages !== null &&
            Array.from({ length: numPages }, (_, i) => (
              <Page
                key={i}
                pageNumber={i + 1}
                width={Math.min(window.innerWidth * 0.85, 600)}
                className="!mb-4"
                renderTextLayer
                renderAnnotationLayer
              />
            ))}
        </Document>
      </div>
    </div>
  )
}
