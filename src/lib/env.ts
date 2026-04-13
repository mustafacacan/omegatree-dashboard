const DEFAULT_API_BASE_URL = 'http://localhost:3005/api'

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL
  if (typeof raw !== 'string' || !raw.trim()) return DEFAULT_API_BASE_URL
  return raw.trim()
}

export function getApiOrigin(): string {
  return new URL(getApiBaseUrl()).origin
}
