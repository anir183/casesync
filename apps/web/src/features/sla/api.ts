import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'

export interface SlaConfig {
  id: string
  bureauId?: string
  bureauName?: string
  category?: string
  regionId?: string
  regionName?: string
  slaDays: number
  pendingReminderDays?: number
  reminderDays?: number[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface SlaSettings {
  defaultSlaDays: number
  pendingReminderDays: number
  reminderDays: number[]
  timezone: string
}

export interface SlaConfigList {
  items: SlaConfig[]
  settings: SlaSettings
}

export interface SlaConfigInput {
  bureauId?: string | null
  category?: string | null
  regionId?: string | null
  slaDays?: number
  pendingReminderDays?: number | null
  reminderDays?: string | number[] | null
  active?: boolean
}

export interface SlaJobCounts {
  backfilledDeadlines: number
  scannedCases: number
  pendingCases: number
  approachingCases: number
  overdueCases: number
  notificationsCreated: number
  errors: number
}

export interface JobRun {
  id: string
  jobName: string
  trigger: string
  status: string
  startedAt: string
  finishedAt?: string
  counts?: SlaJobCounts
  error?: string
}

export const slaKeys = {
  list: ['sla', 'configs'] as const,
  runs: ['jobs', 'runs', 'SLA_SCAN'] as const,
}

export function useSlaConfigs() {
  return useQuery({
    queryKey: slaKeys.list,
    queryFn: () => apiClient.get<SlaConfigList>('/sla-configs'),
  })
}

export function useCreateSlaConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SlaConfigInput) => apiClient.post<SlaConfig>('/sla-configs', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sla'] })
    },
  })
}

export function useUpdateSlaConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SlaConfigInput }) =>
      apiClient.patch<SlaConfig>(`/sla-configs/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sla'] })
    },
  })
}

export function useDeleteSlaConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ deleted: boolean }>(`/sla-configs/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sla'] })
    },
  })
}

export function useJobRuns() {
  return useQuery({
    queryKey: slaKeys.runs,
    queryFn: () => apiClient.get<{ items: JobRun[] }>('/admin/jobs/runs?jobName=SLA_SCAN&limit=5'),
  })
}

export function useRunSlaJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post<JobRun>('/admin/jobs/sla/run'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
