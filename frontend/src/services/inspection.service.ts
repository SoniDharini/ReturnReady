import { api } from './api'
import { resolveMediaUrl } from './property.service'
import type {
  AccessItem,
  Inspection,
  InspectionDetail,
  InspectionEvidence,
  InspectionItem,
  InspectionReview,
  MeterReading,
} from '@/types'

type DetailResponse = { success: boolean; data: InspectionDetail }
type ReviewResponse = { success: boolean; data: InspectionReview }
type ListResponse = { success: boolean; data: { inspections: Inspection[] } }

export function resolveInspectionImageUrl(pathOrUrl?: string) {
  return resolveMediaUrl(pathOrUrl)
}

export async function listMyInspections() {
  const { data } = await api.get<ListResponse>('/inspections')
  return data.data.inspections
}

export async function listTenancyInspections(tenancyId: string) {
  const { data } = await api.get<ListResponse>(`/inspections/tenancies/${tenancyId}`)
  return data.data.inspections
}

export async function createMoveInInspection(tenancyId: string) {
  const { data } = await api.post<DetailResponse>(`/inspections/tenancies/${tenancyId}`, {
    type: 'MOVE_IN',
  })
  return data.data
}

export async function createMoveOutInspection(tenancyId: string) {
  const { data } = await api.post<DetailResponse>(`/inspections/tenancies/${tenancyId}`, {
    type: 'MOVE_OUT',
  })
  return data.data
}

export async function getInspection(inspectionId: string) {
  const { data } = await api.get<DetailResponse>(`/inspections/${inspectionId}`)
  return data.data
}

export async function updateInspectionStep(inspectionId: string, currentStepIndex: number) {
  const { data } = await api.patch<DetailResponse>(`/inspections/${inspectionId}`, {
    currentStepIndex,
  })
  return data.data
}

export async function updateInspectionItem(
  itemId: string,
  payload: {
    condition?: InspectionItem['condition']
    notes?: string
    issueDescription?: string
  },
) {
  const { data } = await api.patch<{ success: boolean; data: { item: InspectionItem } }>(
    `/inspections/items/${itemId}`,
    payload,
  )
  return data.data.item
}

export async function uploadItemEvidence(itemId: string, file: File, caption = '') {
  const formData = new FormData()
  formData.append('image', file)
  if (caption) formData.append('caption', caption)

  const { data } = await api.post<{
    success: boolean
    data: { evidence: InspectionEvidence }
  }>(`/inspections/items/${itemId}/evidence`, formData)
  return data.data.evidence
}

export async function deleteEvidence(evidenceId: string) {
  await api.delete(`/inspections/evidence/${evidenceId}`)
}

export async function addMeterReading(
  inspectionId: string,
  payload: {
    type: MeterReading['type']
    customTypeName?: string
    reading: string
    unit?: string
    meterNumber?: string
    notes?: string
  },
) {
  const { data } = await api.post<{ success: boolean; data: { meter: MeterReading } }>(
    `/inspections/${inspectionId}/meters`,
    payload,
  )
  return data.data.meter
}

export async function updateMeterReading(
  meterId: string,
  payload: Partial<{
    type: MeterReading['type']
    customTypeName: string
    reading: string
    unit: string
    meterNumber: string
    notes: string
  }>,
  imageFile?: File,
) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) formData.append(key, String(value))
  })
  if (imageFile) formData.append('image', imageFile)

  const { data } = await api.patch<{ success: boolean; data: { meter: MeterReading } }>(
    `/inspections/meters/${meterId}`,
    formData,
  )
  return data.data.meter
}

export async function deleteMeterReading(meterId: string) {
  await api.delete(`/inspections/meters/${meterId}`)
}

export async function addAccessItem(
  inspectionId: string,
  payload: { name: string; quantity: number; notes?: string },
) {
  const { data } = await api.post<{ success: boolean; data: { accessItem: AccessItem } }>(
    `/inspections/${inspectionId}/access-items`,
    payload,
  )
  return data.data.accessItem
}

export async function updateAccessItem(
  itemId: string,
  payload: { name?: string; quantity?: number; notes?: string },
) {
  const { data } = await api.patch<{ success: boolean; data: { accessItem: AccessItem } }>(
    `/inspections/access-items/${itemId}`,
    payload,
  )
  return data.data.accessItem
}

export async function deleteAccessItem(itemId: string) {
  await api.delete(`/inspections/access-items/${itemId}`)
}

export async function getInspectionReview(inspectionId: string) {
  const { data } = await api.get<ReviewResponse>(`/inspections/${inspectionId}/review`)
  return data.data
}

export async function submitInspection(inspectionId: string) {
  const { data } = await api.post<DetailResponse>(`/inspections/${inspectionId}/submit`)
  return data.data
}

export async function approveInspection(inspectionId: string) {
  const { data } = await api.post<DetailResponse>(`/inspections/${inspectionId}/approve`)
  return data.data
}
