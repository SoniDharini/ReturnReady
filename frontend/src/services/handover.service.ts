import { api } from './api'
import type {
  ChangeRequestType,
  ComplianceStatus,
  ConditionCategory,
  PropertyChangeMessage,
  PropertyChangeRequest,
  TenancyCondition,
} from '@/types'

type ConditionsResponse = {
  success: boolean
  data: {
    conditions: TenancyCondition[]
    conditionsAccepted: boolean
    conditionsAcceptedAt?: string | null
    locked: boolean
  }
}

type ConditionResponse = { success: boolean; data: { condition: TenancyCondition } }
type RequestsResponse = {
  success: boolean
  data: {
    requests: PropertyChangeRequest[]
    rooms: Array<{ id: string; name: string; type?: string }>
    tenancy: {
      id: string
      propertyName: string
      tenantName: string
      ownerName: string
      stage: string
    }
  }
}
type RequestResponse = { success: boolean; data: { request: PropertyChangeRequest } }
type PendingResponse = { success: boolean; data: { requests: PropertyChangeRequest[] } }

export async function listConditions(tenancyId: string) {
  const { data } = await api.get<ConditionsResponse>(`/tenancies/${tenancyId}/conditions`)
  return data.data
}

export const getConditions = listConditions

export async function createCondition(
  tenancyId: string,
  payload: {
    title: string
    description?: string
    category?: ConditionCategory
    isMandatory?: boolean
    requiresTenantAcceptance?: boolean
  },
) {
  const { data } = await api.post<ConditionResponse>(`/tenancies/${tenancyId}/conditions`, payload)
  return data.data.condition
}

export async function updateCondition(
  conditionId: string,
  payload: Partial<{
    title: string
    description: string
    category: ConditionCategory
    isMandatory: boolean
    requiresTenantAcceptance: boolean
  }>,
) {
  const { data } = await api.patch<ConditionResponse>(`/conditions/${conditionId}`, payload)
  return data.data.condition
}

export async function deleteCondition(conditionId: string) {
  await api.delete(`/conditions/${conditionId}`)
}

export async function acceptConditions(tenancyId: string) {
  const { data } = await api.post<ConditionsResponse>(`/tenancies/${tenancyId}/conditions/accept`)
  return data.data
}

export async function reviewConditionCompliance(
  conditionId: string,
  payload: { complianceStatus: ComplianceStatus; complianceNotes?: string; evidenceDataUrl?: string },
) {
  const { data } = await api.post<ConditionResponse>(
    `/conditions/${conditionId}/compliance`,
    payload,
  )
  return data.data.condition
}

export async function listChangeRequests(tenancyId: string) {
  const { data } = await api.get<RequestsResponse>(`/tenancies/${tenancyId}/change-requests`)
  return data.data
}

export async function listPendingChangeRequests() {
  const { data } = await api.get<PendingResponse>('/change-requests/pending')
  return data.data.requests
}

export async function getChangeRequest(requestId: string) {
  const { data } = await api.get<RequestResponse>(`/change-requests/${requestId}`)
  return data.data.request
}

export async function createChangeRequest(
  tenancyId: string,
  payload: {
    title: string
    description?: string
    reason?: string
    changeType?: ChangeRequestType
    roomId?: string
    roomName?: string
    evidenceDataUrl?: string
  },
) {
  const { data } = await api.post<RequestResponse>(
    `/tenancies/${tenancyId}/change-requests`,
    payload,
  )
  return data.data.request
}

export async function approveChangeRequest(
  requestId: string,
  payload: { ownerNotes?: string; ownerConditions?: string },
) {
  const { data } = await api.post<RequestResponse>(
    `/change-requests/${requestId}/approve`,
    payload,
  )
  return data.data.request
}

export async function rejectChangeRequest(
  requestId: string,
  payload: { ownerNotes?: string; reason?: string },
) {
  const { data } = await api.post<RequestResponse>(`/change-requests/${requestId}/reject`, payload)
  return data.data.request
}

export async function completeChangeRequest(
  requestId: string,
  payload?: { note?: string; evidenceDataUrl?: string },
) {
  const { data } = await api.post<RequestResponse>(
    `/change-requests/${requestId}/complete`,
    payload || {},
  )
  return data.data.request
}

export async function cancelChangeRequest(requestId: string) {
  const { data } = await api.post<RequestResponse>(`/change-requests/${requestId}/cancel`)
  return data.data.request
}

export async function reviewChangeCompliance(
  requestId: string,
  payload: { complianceStatus: ComplianceStatus; complianceNotes?: string; evidenceDataUrl?: string },
) {
  const { data } = await api.post<RequestResponse>(
    `/change-requests/${requestId}/compliance`,
    payload,
  )
  return data.data.request
}

export const getChangeRequests = listChangeRequests
export const getChangeRequestById = getChangeRequest

type ChatResponse = {
  success: boolean
  data: {
    tenancy: {
      id: string
      propertyName: string
      tenantName: string
      ownerName: string
      stage: string
    }
    rooms: Array<{ id: string; name: string }>
    messages: PropertyChangeMessage[]
    requests: PropertyChangeRequest[]
  }
}

export async function getPropertyChangeChat(tenancyId: string) {
  const { data } = await api.get<ChatResponse>(`/tenancies/${tenancyId}/property-change-chat`)
  return data.data
}

export async function sendPropertyChangeMessage(
  tenancyId: string,
  payload: { text?: string; evidenceDataUrl?: string },
) {
  const { data } = await api.post<{ success: boolean; data: { message: PropertyChangeMessage } }>(
    `/tenancies/${tenancyId}/property-change-chat/messages`,
    payload,
  )
  return data.data.message
}

export async function acceptOwnerConditions(requestId: string) {
  const { data } = await api.post<RequestResponse>(
    `/change-requests/${requestId}/accept-conditions`,
  )
  return data.data.request
}
