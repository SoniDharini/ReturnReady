import axios, { type AxiosError } from 'axios'

const ACCESS_TOKEN_KEY = 'rr_access_token'

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string | null) {
  if (token) sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
  else sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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

export async function refreshAccessToken() {
  const { data } = await api.post<{
    success: boolean
    data: { accessToken: string }
  }>('/auth/refresh')
  setAccessToken(data.data.accessToken)
  return data.data.accessToken
}
