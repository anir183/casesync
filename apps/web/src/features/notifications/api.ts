import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'
import { QUERY_KEY } from '#/lib/query-keys'
import { buildQuery } from '#/lib/utils'

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

export const notificationKeys = {
  root: [QUERY_KEY.notifications] as const,
  list: (filters: NotificationFilters) => [QUERY_KEY.notifications, 'list', filters] as const,
}

export function useNotifications(
  filters: NotificationFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: () => apiClient.get<NotificationListResponse>(`/notifications${buildQuery(filters)}`),
    enabled: options.enabled ?? true,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<AppNotification>(`/notifications/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.root })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post<{ updated: number }>('/notifications/read-all'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.root })
    },
  })
}
