import { getApiBaseUrl } from '@/lib/env'

const DEFAULT_MINIO_BUCKET = 'omega'

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '')
}

/** CDN gateway download URL — mirrors backend `getFileUrl`. */
export function getFileUrl(fileName: string): string | null {
  const key = fileName?.trim()
  if (!key) return null

  const cdnUrl = trimTrailingSlash(
    (import.meta.env.VITE_CDN_URL as string | undefined)?.trim() || '',
  )
  if (!cdnUrl) return null

  const bucket =
    (import.meta.env.VITE_MINIO_BUCKET as string | undefined)?.trim() ||
    DEFAULT_MINIO_BUCKET
  const prefix = encodeURIComponent(key)

  return `${cdnUrl}/api/v1/buckets/${bucket}/objects/download?preview=true&prefix=${prefix}`
}

/**
 * Resolves a media URL for display.
 * Prefers API `url`; falls back to CDN URL from `filename` when configured.
 */
export function resolveMediaUrl(
  url: string | undefined | null,
  filename?: string | undefined | null,
): string | null {
  if (url && typeof url === 'string' && url.trim()) {
    const u = url.trim()
    if (u.startsWith('http://') || u.startsWith('https://')) return u

    const apiBase = getApiBaseUrl()
    const base = String(apiBase).replace(/\/api\/?$/, '')
    if (u.startsWith('undefined') || u.startsWith('undefined/')) {
      const fixed = u.replace(/^undefined\/?/, '/')
      return `${base}${fixed.startsWith('/') ? '' : '/'}${fixed}`
    }
    return `${base}${u.startsWith('/') ? '' : '/'}${u}`
  }

  if (filename) return getFileUrl(filename)
  return null
}
