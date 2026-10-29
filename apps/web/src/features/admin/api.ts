import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Page } from '#/features/cases/api'
import { buildQuery } from '#/features/cases/api'
import { apiClient } from '#/lib/api-client'

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
    queryKey: ['admin', 'users'],
    queryFn: () => apiClient.get<{ items: AdminUser[] }>('/admin/users').then((data) => data.items),
  })
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UserInput) =>
      apiClient.post<TemporaryPasswordResult>('/admin/users', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] })
    },
  })
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UserInput }) =>
      apiClient.patch<AdminUser>(`/admin/users/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] })
    },
  })
}

export function useResetAdminPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<TemporaryPasswordResult>(`/admin/users/${id}/reset-password`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] })
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
    queryKey: ['admin', 'audit', filters],
    queryFn: () => apiClient.get<Page<AuditLogEntry>>(`/admin/audit${buildQuery(filters)}`),
  })
}
