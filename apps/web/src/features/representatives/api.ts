import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ComplaintDetail, ComplaintSummary } from '#/features/portal/api'
import { apiClient } from '#/lib/api-client'

export type RepresentativeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED'

export interface RepresentativeProfile {
  id: string
  name: string
  email: string
  phone?: string
  role?: string
  active: boolean
  status?: RepresentativeStatus
  institutionId?: string
  institutionName?: string
  requestedAt?: string
  reviewedAt?: string
  rejectionReason?: string
  evidence?: string
}

export interface RepresentativeDashboard {
  institution: { id: string; name: string }
  totals: { total: number; open: number; disposed: number; closed: number }
  byStatus: Record<string, number>
  recentCases: ComplaintSummary[]
}

export interface RepresentativeDomain {
  id: string
  domain: string
  domainNormalized: string
  institutionId: string
  institutionName?: string
  verified: boolean
  active: boolean
  notes?: string
  addedAt: string
  addedBy?: string
}

interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface RepresentativeFilters {
  status?: string
  institutionId?: string
  q?: string
  page?: number
  pageSize?: number
}

export const representativeKeys = {
  profile: ['institution', 'profile'] as const,
  dashboard: ['institution', 'dashboard'] as const,
  cases: (filters: { status?: string; q?: string; page: number; pageSize: number }) =>
    ['institution', 'cases', filters] as const,
  case: (id: string) => ['institution', 'case', id] as const,
  queue: (filters: RepresentativeFilters) => ['admin', 'representatives', filters] as const,
  domains: (filters: { q?: string; institutionId?: string }) =>
    ['admin', 'institution-domains', filters] as const,
}

export function useRepresentativeProfile() {
  return useQuery({
    queryKey: representativeKeys.profile,
    queryFn: () => apiClient.get<RepresentativeProfile>('/institution/me'),
  })
}

export function useUpdateRepresentativeProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name?: string; phone?: string }) =>
      apiClient.patch<RepresentativeProfile>('/institution/me', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: representativeKeys.profile })
    },
  })
}

export function useRepresentativeDashboard() {
  return useQuery({
    queryKey: representativeKeys.dashboard,
    queryFn: () => apiClient.get<RepresentativeDashboard>('/institution/dashboard'),
  })
}

export function useRepresentativeCases(filters: {
  status?: string
  q?: string
  page: number
  pageSize: number
}) {
  const search = new URLSearchParams()
  if (filters.status) search.set('status', filters.status)
  if (filters.q) search.set('q', filters.q)
  search.set('page', String(filters.page))
  search.set('pageSize', String(filters.pageSize))
  return useQuery({
    queryKey: representativeKeys.cases(filters),
    queryFn: () => apiClient.get<Page<ComplaintSummary>>(`/institution/cases?${search}`),
  })
}

export function useRepresentativeCase(id: string) {
  return useQuery({
    queryKey: representativeKeys.case(id),
    queryFn: () => apiClient.get<ComplaintDetail>(`/institution/cases/${id}`),
    enabled: Boolean(id),
  })
}

export function useRepresentativeMessage(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => apiClient.post(`/institution/cases/${id}/messages`, { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: representativeKeys.case(id) })
    },
  })
}

export function useRepresentativeUpload(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData()
      body.set('file', file)
      return apiClient.upload(`/institution/cases/${id}/attachments`, body)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: representativeKeys.case(id) })
    },
  })
}

export function downloadRepresentativeAttachment(
  caseId: string,
  attachment: { id: string; filename: string },
) {
  return apiClient.download(
    `/institution/cases/${caseId}/attachments/${attachment.id}/download`,
    attachment.filename,
  )
}

export function signUpRepresentative(input: {
  name: string
  email: string
  password: string
  institutionId?: string
  evidence?: string
}) {
  return apiClient.post<RepresentativeProfile>('/public/institution/sign-up', input)
}

export function suggestInstitutionForEmail(email: string) {
  return apiClient.post<{
    suggested: boolean
    domain?: string
    institution?: { id: string; name: string }
  }>('/public/institution/domain-suggestion', { email })
}

export function useRepresentativeQueue(filters: RepresentativeFilters) {
  const search = new URLSearchParams()
  if (filters.status) search.set('status', filters.status)
  if (filters.institutionId) search.set('institutionId', filters.institutionId)
  if (filters.q) search.set('q', filters.q)
  if (filters.page) search.set('page', String(filters.page))
  if (filters.pageSize) search.set('pageSize', String(filters.pageSize))
  return useQuery({
    queryKey: representativeKeys.queue(filters),
    queryFn: () =>
      apiClient.get<Page<RepresentativeProfile>>(`/admin/institution-representatives?${search}`),
  })
}

function invalidateRepresentatives(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['admin', 'representatives'] })
  void queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] })
}

export function useApproveRepresentative() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, institutionId }: { id: string; institutionId?: string }) =>
      apiClient.post<RepresentativeProfile>(
        `/admin/institution-representatives/${id}/approve`,
        institutionId ? { institutionId } : {},
      ),
    onSuccess: () => invalidateRepresentatives(queryClient),
  })
}

export function useRejectRepresentative() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post<RepresentativeProfile>(`/admin/institution-representatives/${id}/reject`, {
        reason,
      }),
    onSuccess: () => invalidateRepresentatives(queryClient),
  })
}

export function useRevokeRepresentative() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post<RepresentativeProfile>(`/admin/institution-representatives/${id}/revoke`, {
        reason,
      }),
    onSuccess: () => invalidateRepresentatives(queryClient),
  })
}

export function useInstitutionDomains(filters: { q?: string; institutionId?: string }) {
  const search = new URLSearchParams()
  if (filters.q) search.set('q', filters.q)
  if (filters.institutionId) search.set('institutionId', filters.institutionId)
  return useQuery({
    queryKey: representativeKeys.domains(filters),
    queryFn: () =>
      apiClient.get<{ items: RepresentativeDomain[] }>(`/admin/institution-domains?${search}`),
  })
}

function invalidateDomains(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['admin', 'institution-domains'] })
  void queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] })
}

export function useCreateInstitutionDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      domain: string
      institutionId: string
      verified?: boolean
      active?: boolean
      notes?: string
    }) => apiClient.post<RepresentativeDomain>('/admin/institution-domains', input),
    onSuccess: () => invalidateDomains(queryClient),
  })
}

export function useUpdateInstitutionDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: { domain?: string; verified?: boolean; active?: boolean; notes?: string }
    }) => apiClient.patch<RepresentativeDomain>(`/admin/institution-domains/${id}`, input),
    onSuccess: () => invalidateDomains(queryClient),
  })
}

export function useDeleteInstitutionDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ ok: boolean }>(`/admin/institution-domains/${id}`),
    onSuccess: () => invalidateDomains(queryClient),
  })
}
