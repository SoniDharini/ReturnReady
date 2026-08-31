import { api } from './api'
import type { Property, PropertyRoom } from '@/types'

type ListResponse = { success: boolean; data: { properties: Property[] } }
type OneResponse = { success: boolean; data: { property: Property } }

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  '',
)

export function resolveMediaUrl(pathOrUrl?: string) {
  if (!pathOrUrl) return ''
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('blob:')) {
    return pathOrUrl
  }
  return `${API_ORIGIN}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`
}

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
  roomList?: PropertyRoom[]
}) {
  const { data } = await api.post<OneResponse>('/properties', payload)
  return data.data.property
}

export async function updateProperty(
  id: string,
  payload: Partial<{
    name: string
    type: string
    address: string
    city: string
    state: string
    pin: string
    rooms: number
    bathrooms: number
    status: string
    roomList: PropertyRoom[]
  }>,
) {
  const { data } = await api.put<OneResponse>(`/properties/${id}`, payload)
  return data.data.property
}

export async function deleteProperty(id: string) {
  const { data } = await api.delete<{
    success: boolean
    message: string
    data: { archived: boolean }
  }>(`/properties/${id}`)
  return { archived: data.data.archived, message: data.message }
}

export async function uploadPropertyImages(
  propertyId: string,
  files: File[],
  captions: string[] = [],
) {
  const formData = new FormData()
  files.forEach((file) => formData.append('images', file))
  captions.forEach((caption) => formData.append('captions', caption))

  const { data } = await api.post<OneResponse>(`/properties/${propertyId}/images`, formData)
  return data.data.property
}

export async function updatePropertyImageCaption(
  propertyId: string,
  imageId: string,
  caption: string,
) {
  const { data } = await api.patch<OneResponse>(
    `/properties/${propertyId}/images/${imageId}`,
    { caption },
  )
  return data.data.property
}

export async function deletePropertyImage(propertyId: string, imageId: string) {
  const { data } = await api.delete<OneResponse>(
    `/properties/${propertyId}/images/${imageId}`,
  )
  return data.data.property
}
