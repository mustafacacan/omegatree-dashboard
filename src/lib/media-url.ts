import { getApiBaseUrl, getCdnBaseUrl, getMinioBucket } from '@/lib/env'

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '')
}

/** CDN gateway download URL — mirrors backend `getFileUrl`. */
export function getFileUrl(fileName: string): string | null {
  const key = fileName?.trim()
  if (!key) return null

  const cdnUrl = getCdnBaseUrl()
  if (!cdnUrl) return null

  const prefix = encodeURIComponent(key)
  return `${cdnUrl}/api/v1/buckets/${getMinioBucket()}/objects/download?preview=true&prefix=${prefix}`
}

/** localhost, internal MinIO or presigned dev URLs — not usable in production browser. */
function isNonPublicMediaUrl(url: string): boolean {
  try {
    const { hostname, port, pathname } = new URL(url)
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true
    if (port === '9000' || port === '9001') return true
    if (/^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./.test(hostname)) return true
    if (pathname.includes('/uploads/')) return true
    if (url.includes('X-Amz-Algorithm=') || url.includes('X-Amz-Credential=')) return true
  } catch {
    return false
  }
  return false
}

/** Object key from CDN/MinIO/API url or explicit filename field. */
export function extractObjectKey(
  url: string | undefined | null,
  filename?: string | undefined | null,
): string | null {
  const fromField = filename?.trim()
  if (fromField) return fromField

  if (!url?.trim()) return null
  const raw = url.trim()

  try {
    const parsed = new URL(raw)
    const prefix = parsed.searchParams.get('prefix')
    if (prefix) return decodeURIComponent(prefix)

    const parts = parsed.pathname.split('/').filter(Boolean)
    const bucket = getMinioBucket()
    if (parts.length >= 2 && parts[0] === bucket) {
      return parts.slice(1).join('/')
    }
    if (parts.length >= 2) {
      return parts.slice(1).join('/')
    }
    if (parts.length === 1) return parts[0]
  } catch {
    // relative path below
  }

  const clean = raw.replace(/^\//, '')
  const uploadsMatch = clean.match(/^uploads\/(.+)$/i)
  if (uploadsMatch) return uploadsMatch[1]

  return clean || null
}

function resolveRelativeMediaUrl(url: string): string {
  const apiBase = getApiBaseUrl()
  const base = trimTrailingSlash(String(apiBase).replace(/\/api\/?$/, ''))
  if (url.startsWith('undefined') || url.startsWith('undefined/')) {
    const fixed = url.replace(/^undefined\/?/, '/')
    return `${base}${fixed.startsWith('/') ? '' : '/'}${fixed}`
  }
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`
}

/**
 * Resolves a media URL for display.
 * When VITE_CDN_URL is set, always serves via CDN using object key (production-safe).
 */
export function resolveMediaUrl(
  url: string | undefined | null,
  filename?: string | undefined | null,
): string | null {
  const objectKey = extractObjectKey(url, filename)
  const cdnUrl = getCdnBaseUrl()

  if (cdnUrl && objectKey) {
    return getFileUrl(objectKey)
  }

  if (url && typeof url === 'string' && url.trim()) {
    const u = url.trim()
    if (u.startsWith('data:') || u.startsWith('blob:')) return u

    if (u.startsWith('http://') || u.startsWith('https://')) {
      if (isNonPublicMediaUrl(u) && objectKey && cdnUrl) {
        return getFileUrl(objectKey)
      }
      return u
    }

    return resolveRelativeMediaUrl(u)
  }

  if (objectKey && cdnUrl) return getFileUrl(objectKey)
  return null
}

/** Static public asset path (Vite `public/` folder). */
export function publicAssetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const clean = relativePath.replace(/^\//, '')
  return `${normalizedBase}${clean}`
}
