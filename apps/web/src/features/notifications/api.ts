import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'

export interface AppNotification {
  id: string
  type: string
  referenceId?: string
  caseId?: string
  link?: string
  channel?: string
  title?: string
  message?: string
  readAt?: string
  createdAt: string
}

export interface NotificationFilters {
  unread?: string
  type?: string
  page?: number
  pageSize?: number
}

interface NotificationListResponse {
  items: AppNotification[]
  total: number
  page: number
  pageSize: number
  unreadCount: number
}

export const NOTIFICATION_QUERY_KEY = ['notifications', 'list'] as const

function buildQuery(filters: NotificationFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function useNotifications(
  filters: NotificationFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...NOTIFICATION_QUERY_KEY, filters],
    queryFn: () => apiClient.get<NotificationListResponse>(`/notifications${buildQuery(filters)}`),
    enabled: options.enabled ?? true,
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
