import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'

export interface PortalProfile {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  active: boolean
  institutionId?: string
  institutionName?: string
  institutionAicteId?: string
  verificationStatus: 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED'
  verificationMethod?: string
  verifiedAt?: string
  rejectionReason?: string
  latestVerification?: {
    id: string
    method: string
    status: string
    note?: string
    submittedAt: string
    reviewedAt?: string
    reviewNotes?: string
    rejectionReason?: string
  }
}

export interface ComplaintSummary {
  id?: string
  caseNumber: string
  subject?: string
  category?: string
  status: string
  statusLabel: string
  priority?: string
  institutionName?: string
  bureauName?: string
  submittedAt: string
  acknowledgedAt?: string
  resolvedAt?: string
  closedAt?: string
  reopenDeadline?: string
  updatedAt: string
}

export interface ComplaintDetail extends ComplaintSummary {
  description?: string
  desiredResolution?: string
  incidentDate?: string
  resolutionSummary?: string
  messages: Array<{ id: string; body: string; author: string; createdAt: string }>
  statusHistory: Array<{ status: string; label: string; at: string }>
  documents: Array<{
    id: string
    filename: string
    mimeType?: string
    sizeBytes?: number
    createdAt: string
  }>
  canAcceptResolution: boolean
  canReopen: boolean
  reopenDays: number
}

export interface PublicInstitution {
  id: string
  name: string
  aictePermanentId?: string
  regionName?: string
}

export interface PublicCategory {
  id: string
  code: string
  name: string
}

export interface VerificationRequest {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  userPhone?: string
  institutionId?: string
  institutionName?: string
  aictePermanentId?: string
  method: string
  status: string
  note?: string
  documents: Array<{
    index: number
    filename: string
    mimeType?: string
    sizeBytes?: number
  }>
  submittedAt: string
  reviewedAt?: string
  reviewNotes?: string
  rejectionReason?: string
}

interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export const portalKeys = {
  profile: ['portal', 'profile'] as const,
  complaints: (page = 1) => ['portal', 'complaints', page] as const,
  complaint: (id: string) => ['portal', 'complaint', id] as const,
  institutions: (q: string) => ['public', 'institutions', q] as const,
  categories: ['public', 'categories'] as const,
  verifications: (status: string) => ['admin', 'verifications', status] as const,
}

export function usePortalProfile() {
  return useQuery({
    queryKey: portalKeys.profile,
    queryFn: () => apiClient.get<PortalProfile>('/portal/me'),
  })
}

export function usePortalComplaints(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: portalKeys.complaints(page),
    queryFn: () =>
      apiClient.get<Page<ComplaintSummary>>(`/portal/complaints?page=${page}&pageSize=${pageSize}`),
  })
}

export function usePortalComplaint(id: string) {
  return useQuery({
    queryKey: portalKeys.complaint(id),
    queryFn: () => apiClient.get<ComplaintDetail>(`/portal/complaints/${id}`),
    enabled: Boolean(id),
  })
}

export function usePublicInstitutions(q: string) {
  return useQuery({
    queryKey: portalKeys.institutions(q),
    queryFn: () =>
      apiClient
        .get<{ items: PublicInstitution[] }>(`/public/institutions?q=${encodeURIComponent(q)}`)
        .then((data) => data.items),
    enabled: q.trim().length >= 2,
  })
}

export function usePublicCategories() {
  return useQuery({
    queryKey: portalKeys.categories,
    queryFn: () =>
      apiClient.get<{ items: PublicCategory[] }>('/public/categories').then((data) => data.items),
  })
}

export function useSubmitComplaint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      institutionId: string
      category?: string
      subject: string
      description: string
      incidentDate?: string
      desiredResolution?: string
      contactPreference?: string
      consentGiven: boolean
    }) => apiClient.post<ComplaintDetail>('/portal/complaints', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal', 'complaints'] })
      void queryClient.invalidateQueries({ queryKey: ['portal', 'profile'] })
    },
  })
}

export function useComplaintMessage(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => apiClient.post(`/portal/complaints/${id}/messages`, { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portalKeys.complaint(id) })
    },
  })
}

export function useUploadComplaintAttachment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData()
      body.set('file', file)
      return apiClient.upload(`/portal/complaints/${id}/attachments`, body)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portalKeys.complaint(id) })
    },
  })
}

export function downloadComplaintAttachment(
  caseId: string,
  attachment: { id: string; filename: string },
) {
  return apiClient.download(
    `/portal/complaints/${caseId}/attachments/${attachment.id}/download`,
    attachment.filename,
  )
}

export function useAcceptResolution(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post<ComplaintDetail>(`/portal/complaints/${id}/accept-resolution`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portalKeys.complaint(id) })
      void queryClient.invalidateQueries({ queryKey: ['portal', 'complaints'] })
    },
  })
}

export function useReopenComplaint(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) =>
      apiClient.post<ComplaintDetail>(`/portal/complaints/${id}/reopen`, { reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portalKeys.complaint(id) })
      void queryClient.invalidateQueries({ queryKey: ['portal', 'complaints'] })
    },
  })
}

export function useVerificationRequests(status: string) {
  return useQuery({
    queryKey: portalKeys.verifications(status),
    queryFn: () =>
      apiClient.get<Page<VerificationRequest>>(
        `/admin/complainant-verifications?status=${encodeURIComponent(status)}`,
      ),
  })
}

export function useReviewVerification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      decision,
      reviewNotes,
      rejectionReason,
    }: {
      id: string
      decision: 'approve' | 'reject'
      reviewNotes?: string
      rejectionReason?: string
    }) =>
      apiClient.post<VerificationRequest>(`/admin/complainant-verifications/${id}/${decision}`, {
        reviewNotes,
        ...(decision === 'reject' ? { rejectionReason } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] })
    },
  })
}

export function downloadVerificationDocument(requestId: string, index: number, filename: string) {
  return apiClient.download(
    `/admin/complainant-verifications/${requestId}/documents/${index}/download`,
    filename,
  )
}
