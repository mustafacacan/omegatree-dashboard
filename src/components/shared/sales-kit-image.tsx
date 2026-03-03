import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/axios'

/** Ngrok URL'leri tarayıcıda direkt yüklenmez; header ile fetch edip blob URL gösterir */
export function SalesKitImage({
  url,
  alt,
  className,
  onError,
}: {
  url: string
  alt: string
  className?: string
  onError?: () => void
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const blobUrlRef = useRef<string | null>(null)
  const isNgrok = /ngrok-free\.dev|ngrok\.io|ngrok\./.test(url)

  useEffect(() => {
    if (!url || !isNgrok) return
    setFailed(false)
    api
      .get(url, { responseType: 'blob', headers: { 'Ngrok-Skip-Browser-Warning': 'true' } })
      .then((res) => {
        const blob = res.data as Blob
        if (blob?.size) {
          const u = URL.createObjectURL(blob)
          blobUrlRef.current = u
          setBlobUrl(u)
        } else setFailed(true)
      })
      .catch(() => setFailed(true))
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      setBlobUrl(null)
    }
  }, [url, isNgrok])

  if (failed) return null
  if (isNgrok && blobUrl) return <img src={blobUrl} alt={alt} className={className} onError={onError} />
  if (!isNgrok && url) return <img src={url} alt={alt} className={className} onError={onError} />
  return null
}
