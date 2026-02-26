/**
 * PDF.js worker setup for react-pdf (Vite).
 * Call once at app init or before first PDF render.
 */
import { pdfjs } from 'react-pdf'

export function setPdfWorker() {
  if (typeof window === 'undefined') return
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()
  } catch {
    // Fallback: unpkg (same major as pdfjs-dist in react-pdf)
    const v = (pdfjs as { version?: string }).version || '4.0.379'
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${v}/build/pdf.worker.min.mjs`
  }
}
