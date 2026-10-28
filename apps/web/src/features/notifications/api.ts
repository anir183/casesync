import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'

export interface AppNotification {
  id: string
  type: string
  referenceId?: string
  title?: string
  message?: string
  readAt?: string
  createdAt: string
}

interface NotificationListResponse {
  items: AppNotification[]
  unreadCount: number
}

const NOTIFICATION_QUERY_KEY = ['notifications', 'list'] as const

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEY,
    queryFn: () => apiClient.get<NotificationListResponse>('/notifications'),
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<AppNotification>(`/notifications/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post<{ updated: number }>('/notifications/read-all'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
