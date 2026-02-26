import { useState, useEffect } from 'react'
import { Document, Page } from 'react-pdf'
import { setPdfWorker } from '@/lib/pdf-worker'
import { FileText, Loader2 } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

/** Demo PDF when no report URL is provided (backend will supply real pdfUrl) */
export const DEMO_PDF_URL = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'

export interface PdfViewerProps {
  /** PDF URL; if not set, uses demo PDF for preview */
  file?: string | null
  /** Optional title above viewer */
  title?: string
  /** Max height for scroll container (default 70vh) */
  maxHeight?: string
  className?: string
}

export function PdfViewer({ file, title, maxHeight = '70vh', className = '' }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [workerSet, setWorkerSet] = useState(false)

  const url = file || DEMO_PDF_URL

  useEffect(() => {
    setPdfWorker()
    setWorkerSet(true)
  }, [])

  const onLoadSuccess = ({ numPages: n }: { numPages: number }) => setNumPages(n)
  const onLoadError = () => setError('PDF yuklenemedi.')

  if (!workerSet) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-surface-100 ${className}`} style={{ minHeight: 400 }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-lg bg-surface-100 p-8 ${className}`}>
        <FileText className="h-12 w-12 text-surface-400 mb-3" />
        <p className="text-sm text-surface-600">{error}</p>
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
