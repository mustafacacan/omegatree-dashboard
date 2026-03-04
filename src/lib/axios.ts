import axios, { type AxiosRequestConfig } from 'axios'
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

// Her istekte token varsa Authorization: Bearer <token> header'ı eklenir
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (config.baseURL?.includes('ngrok')) {
      config.headers['Ngrok-Skip-Browser-Warning'] = 'true'
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const skipAuthRedirect = (error.config as ApiRequestConfig)?.skipAuthRedirect
    if (error.response?.status === 401 && !skipAuthRedirect) {
      useAuthStore.getState().logout()
      window.location.href = '/giris'
    }
    return Promise.reject(error)
  }
)

export default api
