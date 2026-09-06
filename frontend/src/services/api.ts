import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const ACCESS_TOKEN_KEY = 'rr_access_token'

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string | null) {
  if (token) sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
  else sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const api = axios.create({
  baseURL,
  withCredentials: true,
})

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  } else if (config.data != null && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

let refreshPromise: Promise<string> | null = null

function isAuthRequest(url?: string) {
  const path = url || ''
  return (
    path.includes('/auth/login') ||
    path.includes('/auth/register') ||
    path.includes('/auth/refresh') ||
    path.includes('/invitations/activate')
  )
}

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise
  refreshPromise = refreshClient
    .post<{ success: boolean; data: { accessToken: string } }>('/auth/refresh')
    .then(({ data }) => {
      const token = data.data.accessToken
      setAccessToken(token)
      return token
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as RetryConfig | undefined
    if (!original || error.response?.status !== 401 || original._retry || isAuthRequest(original.url)) {
      return Promise.reject(error)
    }

    original._retry = true
    try {
      const token = await refreshAccessToken()
      original.headers = original.headers || {}
      original.headers.Authorization = `Bearer ${token}`
      return api(original)
    } catch {
      setAccessToken(null)
      return Promise.reject(error)
    }
  },
)

export type ApiErrorBody = {
  success?: boolean
  message?: string
  errors?: Record<string, string>
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  const err = error as AxiosError<ApiErrorBody>
  if (!err.response) {
    return 'Unable to connect to the server. Please try again.'
  }
  const data = err.response.data
  if (data?.errors) {
    const first = Object.values(data.errors)[0]
    if (first) return first
  }
  return data?.message || fallback
}
