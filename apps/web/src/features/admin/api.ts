import type { Page } from '@casesync/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'
import { QUERY_KEY } from '#/lib/query-keys'
import { buildQuery } from '#/lib/utils'

export const adminKeys = {
  users: [QUERY_KEY.admin, 'users'] as const,
  audit: [QUERY_KEY.admin, 'audit'] as const,
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role?: string
  bureauId?: string
  regionId?: string
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export interface UserInput {
  name: string
  email?: string
  role: string
  bureauId?: string | null
  regionId?: string | null
  active?: boolean
}

export interface TemporaryPasswordResult {
  user: AdminUser
  temporaryPassword: string
}

export interface AuditLogEntry {
  id: string
  actorId: string
  actorName?: string
  action: string
  entityType: string
  entityId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  metadata?: Record<string, unknown>
  createdAt: string
}

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users,
    queryFn: () => apiClient.get<{ items: AdminUser[] }>('/admin/users').then((data) => data.items),
  })
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UserInput) =>
      apiClient.post<TemporaryPasswordResult>('/admin/users', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users })
      void queryClient.invalidateQueries({ queryKey: adminKeys.audit })
    },
  })
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UserInput }) =>
      apiClient.patch<AdminUser>(`/admin/users/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users })
      void queryClient.invalidateQueries({ queryKey: adminKeys.audit })
    },
  })
}

export function useResetAdminPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<TemporaryPasswordResult>(`/admin/users/${id}/reset-password`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.audit })
    },
  })
}

export interface AuditFilters {
  entityType?: string
  action?: string
  page?: number
  pageSize?: number
}

export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: [...adminKeys.audit, filters],
    queryFn: () => apiClient.get<Page<AuditLogEntry>>(`/admin/audit${buildQuery(filters)}`),
  })
}
