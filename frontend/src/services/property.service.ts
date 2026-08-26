import { api } from './api'
import type { Property } from '@/types'

type ListResponse = { success: boolean; data: { properties: Property[] } }
type OneResponse = { success: boolean; data: { property: Property } }

export async function listProperties() {
  const { data } = await api.get<ListResponse>('/properties')
  return data.data.properties
}

export async function getProperty(id: string) {
  const { data } = await api.get<OneResponse>(`/properties/${id}`)
  return data.data.property
}

export async function createProperty(payload: {
  name: string
  type: string
  address: string
  city: string
  state: string
  pin: string
  rooms?: number
  bathrooms?: number
  status?: string
  roomList?: Property['roomList']
}) {
  const { data } = await api.post<OneResponse>('/properties', payload)
  return data.data.property
}

export async function updateProperty(id: string, payload: Partial<Property>) {
  const { data } = await api.put<OneResponse>(`/properties/${id}`, payload)
  return data.data.property
}

export async function deleteProperty(id: string) {
  await api.delete(`/properties/${id}`)
}
