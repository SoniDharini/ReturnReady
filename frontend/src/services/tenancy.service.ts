import { api } from './api'
import type { Tenancy } from '@/types'

type ListResponse = { success: boolean; data: { tenancies: Tenancy[] } }
type OneResponse = { success: boolean; data: { tenancy: Tenancy } }

export async function listTenancies() {
  const { data } = await api.get<ListResponse>('/tenancies')
  return data.data.tenancies
}

export async function getTenancy(id: string) {
  const { data } = await api.get<OneResponse>(`/tenancies/${id}`)
  return data.data.tenancy
}

export async function createTenancy(payload: {
  propertyId: string
  tenantName: string
  tenantEmail: string
  tenantPhone: string
  moveIn: string
  moveOut: string
  rent: number
  deposit: number
}) {
  const { data } = await api.post<OneResponse>('/tenancies', payload)
  return data.data.tenancy
}

export async function cancelInvitation(id: string) {
  const { data } = await api.post<OneResponse>(`/tenancies/${id}/cancel-invite`)
  return data.data.tenancy
}

export async function resendInvitation(id: string) {
  const { data } = await api.post<OneResponse>(`/tenancies/${id}/resend-invite`)
  return data.data.tenancy
}

export async function updateTenancy(
  id: string,
  payload: Partial<{
    moveIn: string
    moveOut: string
    actualMoveOut: string | null
    moveOutReason: string
    moveOutNotes: string
    occupancyStatus: string
    tenantPhone: string
    changeReason: string
  }>,
) {
  const { data } = await api.patch<OneResponse>(`/tenancies/${id}`, payload)
  return data.data.tenancy
}

export async function startMoveOut(
  id: string,
  payload: { actualMoveOut: string; moveOutReason: string; moveOutNotes?: string },
) {
  const { data } = await api.post<OneResponse>(`/tenancies/${id}/start-move-out`, payload)
  return data.data.tenancy
}
