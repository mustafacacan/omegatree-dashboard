const DEFAULT_API_BASE_URL = 'http://localhost:3005/api'
const DEFAULT_MINIO_BUCKET = 'omega'

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL
  if (typeof raw !== 'string' || !raw.trim()) return DEFAULT_API_BASE_URL
  return raw.trim()
}

export function getApiOrigin(): string {
  return new URL(getApiBaseUrl()).origin
}

export function getCdnBaseUrl(): string | null {
  const raw = import.meta.env.VITE_CDN_URL
  if (typeof raw !== 'string' || !raw.trim()) return null
  return raw.trim().replace(/\/$/, '')
}

export function getMinioBucket(): string {
  const raw = import.meta.env.VITE_MINIO_BUCKET
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return DEFAULT_MINIO_BUCKET
}
