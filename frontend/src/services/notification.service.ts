import { api } from './api'
import type { AppNotification } from '@/types'

type ListResponse = {
  success: boolean
  data: { notifications: AppNotification[]; unreadCount: number }
}

export async function listNotifications() {
  const { data } = await api.get<ListResponse>('/notifications')
  return data.data
}

export async function markNotificationRead(id: string) {
  await api.patch(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead() {
  await api.patch('/notifications/read-all')
}
