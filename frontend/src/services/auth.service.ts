import { api, setAccessToken } from './api'
import type { AuthUser, Invitation } from '@/types'

type AuthResponse = {
  success: boolean
  message?: string
  data: {
    user: AuthUser
    accessToken: string
  }
}

type MeResponse = {
  success: boolean
  data: { user: AuthUser }
}

export async function registerOwner(payload: {
  name: string
  email: string
  phone: string
  password: string
}) {
  const { data } = await api.post<AuthResponse>('/auth/register', payload)
  setAccessToken(data.data.accessToken)
  return data.data
}

export async function login(payload: { email: string; password: string }) {
  const { data } = await api.post<AuthResponse>('/auth/login', payload)
  setAccessToken(data.data.accessToken)
  return data.data
}

export async function fetchMe() {
  const { data } = await api.get<MeResponse>('/auth/me')
  return data.data.user
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } finally {
    setAccessToken(null)
  }
}

export async function getInvitation(token: string) {
  const { data } = await api.get<{ success: boolean; data: { invitation: Invitation } }>(
    `/invitations/${token}`,
  )
  return data.data.invitation
}

export async function activateTenant(payload: {
  token: string
  password: string
}) {
  const { data } = await api.post<AuthResponse>('/invitations/activate', payload)
  setAccessToken(data.data.accessToken)
  return data.data
}
