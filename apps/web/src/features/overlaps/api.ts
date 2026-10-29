import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'

export type ReviewStatus = 'PENDING' | 'CONFIRMED' | 'DISMISSED'
export type ReviewAction = 'confirm' | 'dismiss'

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

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
  rationale?: string
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

export interface OverlapFilters {
  status: ReviewStatus
  bureauId?: string
  regionId?: string
  matchType?: string
  institutionId?: string
  page?: number
  pageSize?: number
}

export interface LinkCasesInput {
  caseId: string
  relatedCaseId: string
  notes?: string
}

export const overlapKeys = {
  list: (filters: OverlapFilters) => ['overlaps', 'list', filters] as const,
  detail: (id: string) => ['overlaps', 'detail', id] as const,
}

function buildQuery(filters: object) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function fetchOverlaps(filters: OverlapFilters): Promise<Page<Overlap>> {
  return apiClient.get<Page<Overlap>>(`/overlaps${buildQuery(filters)}`)
}

export function fetchOverlap(id: string): Promise<Overlap> {
  return apiClient.get<Overlap>(`/overlaps/${id}`)
}

export async function reviewOverlap(id: string, action: ReviewAction, notes?: string) {
  return apiClient.post<Overlap>(`/overlaps/${id}/review`, { action, notes })
}

export async function linkCases(input: LinkCasesInput): Promise<Overlap> {
  return apiClient.post<Overlap>('/overlaps/link', input)
}

export async function unlinkOverlap(id: string, notes?: string): Promise<Overlap> {
  return apiClient.post<Overlap>(`/overlaps/${id}/unlink`, { notes })
}

export function useOverlaps(filters: OverlapFilters) {
  return useQuery({
    queryKey: overlapKeys.list(filters),
    queryFn: () => fetchOverlaps(filters),
  })
}

export function useOverlap(id: string) {
  return useQuery({
    queryKey: overlapKeys.detail(id),
    queryFn: () => fetchOverlap(id),
    enabled: Boolean(id),
  })
}

function useInvalidateOverlaps() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['overlaps'] })
    void queryClient.invalidateQueries({ queryKey: ['cases'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    void queryClient.invalidateQueries({ queryKey: ['reports'] })
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }
}

export function useReviewOverlap(id: string) {
  const invalidate = useInvalidateOverlaps()
  return useMutation({
    mutationFn: (input: { action: ReviewAction; notes?: string }) =>
      reviewOverlap(id, input.action, input.notes),
    onSuccess: invalidate,
  })
}

export function useUnlinkOverlap(id: string) {
  const invalidate = useInvalidateOverlaps()
  return useMutation({
    mutationFn: (notes?: string) => unlinkOverlap(id, notes),
    onSuccess: invalidate,
  })
}

export function useLinkCases() {
  const invalidate = useInvalidateOverlaps()
  return useMutation({
    mutationFn: linkCases,
    onSuccess: invalidate,
  })
}
