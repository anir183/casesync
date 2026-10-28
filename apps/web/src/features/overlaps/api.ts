import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'

export type ReviewStatus = 'PENDING' | 'CONFIRMED' | 'DISMISSED'
export type ReviewAction = 'confirm' | 'dismiss'

export interface OverlapCase {
  id: string
  caseNumber: string
  status: string
  category?: string
  description?: string
  bureauName?: string
  receivedAt?: string
  expectedDisposalAt?: string
  nextAction?: string
}

export interface OverlapAssessment {
  id: string
  status: string
  relationshipChoice?: string
  coordinationReviewNoul?: number
  confidence?: number
  probabilities?: Record<string, number>
  modelVersion?: string
  latencyMs?: number
  errorMessage?: string
  assessedAt?: string
}

export interface Overlap {
  id: string
  matchType: string
  confidence?: number
  reason?: string
  reviewStatus: ReviewStatus
  reviewedAt?: string
  reviewNotes?: string
  createdAt: string
  institution?: {
    id: string
    name: string
    aictePermanentId?: string
    regionId?: string
  }
  assessment?: OverlapAssessment
  cases: OverlapCase[]
}

interface OverlapListResponse {
  items: Overlap[]
}

export const overlapKeys = {
  list: (status: ReviewStatus) => ['overlaps', 'list', status] as const,
  detail: (id: string) => ['overlaps', 'detail', id] as const,
}

export async function fetchOverlaps(status: ReviewStatus): Promise<Overlap[]> {
  const data = await apiClient.get<OverlapListResponse>(`/overlaps?status=${status}`)
  return data.items
}

export async function fetchOverlap(id: string): Promise<Overlap> {
  return apiClient.get<Overlap>(`/overlaps/${id}`)
}

export async function reviewOverlap(id: string, action: ReviewAction, notes?: string) {
  return apiClient.post<Overlap>(`/overlaps/${id}/review`, { action, notes })
}

export function useOverlaps(status: ReviewStatus) {
  return useQuery({
    queryKey: overlapKeys.list(status),
    queryFn: () => fetchOverlaps(status),
  })
}

export function useOverlap(id: string) {
  return useQuery({
    queryKey: overlapKeys.detail(id),
    queryFn: () => fetchOverlap(id),
    enabled: Boolean(id),
  })
}

export function useReviewOverlap(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { action: ReviewAction; notes?: string }) =>
      reviewOverlap(id, input.action, input.notes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['overlaps'] })
    },
  })
}
