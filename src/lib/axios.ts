import axios, { AxiosHeaders, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth.store'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api'

/** 401 alındığında otomatik çıkış yapma (örn. adres API'si henüz yoksa) */
export interface ApiRequestConfig extends AxiosRequestConfig {
  skipAuthRedirect?: boolean
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const AUTH_EXPIRED_TOAST_KEY = 'omegatree-auth-expired'
let last401HandledAt = 0
let isHandling401 = false

function getAuthToken(): string | null {
  const fromStore = useAuthStore.getState().token
  if (fromStore) return fromStore

  // Zustand persist rehydrate gecikirse ilk istekler tokensiz gidebilir.
  // Bu durumda localStorage'daki persist kaydindan token'i okumaya calisiriz.
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem('omegatree-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: { token?: unknown } } | null
    const token = parsed?.state?.token
    return typeof token === 'string' && token.trim() ? token : null
  } catch {
    return null
  }
}

// Her istekte token varsa Authorization: Bearer <token> header'ı eklenir
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken()
    const headers = (config.headers ??= new AxiosHeaders())

    if (token) {
      if (headers instanceof AxiosHeaders) {
        headers.set('Authorization', `Bearer ${token}`)
      } else {
        ; (headers as Record<string, unknown>)['Authorization'] = `Bearer ${token}`
      }
    }

    if (config.baseURL?.includes('ngrok')) {
      if (headers instanceof AxiosHeaders) {
        headers.set('Ngrok-Skip-Browser-Warning', 'true')
      } else {
        ; (headers as Record<string, unknown>)['Ngrok-Skip-Browser-Warning'] = 'true'
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const config = (error?.config ?? {}) as ApiRequestConfig

    // If we have a token and backend responds 401, treat as session expiration globally.
    // (Many service calls set skipAuthRedirect=true; token-expiry should still log out everywhere.)
    if (status === 401) {
      const token = getAuthToken()
      const hasToken = Boolean(token)

      const url = String(config.url ?? '')
      const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register')

      if (hasToken && !isAuthCall) {
        const now = Date.now()
        if (!isHandling401 && now - last401HandledAt > 1000) {
          isHandling401 = true
          last401HandledAt = now

          try {
            window.sessionStorage?.setItem(AUTH_EXPIRED_TOAST_KEY, '1')
          } catch {
            // ignore
          }

          useAuthStore.getState().logout()

          if (typeof window !== 'undefined' && window.location?.pathname !== '/giris') {
            window.location.href = '/giris'
          }

          // Allow future 401 handling after navigation settles.
          setTimeout(() => {
            isHandling401 = false
          }, 1500)
        }
      } else {
        // Respect explicit opt-out only when we don't have an authenticated session.
        const skipAuthRedirect = config.skipAuthRedirect
        if (!skipAuthRedirect && typeof window !== 'undefined' && window.location?.pathname !== '/giris') {
          window.location.href = '/giris'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
