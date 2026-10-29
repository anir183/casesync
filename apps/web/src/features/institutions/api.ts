import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CaseListItem, Page } from '#/features/cases/api'
import { buildQuery } from '#/features/cases/api'
import { apiClient } from '#/lib/api-client'

export interface Institution {
  id: string
  name: string
  aictePermanentId?: string
  address?: string
  regionId?: string
  regionName?: string
  verified: boolean
  otherDetails?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface InstitutionFilters {
  q?: string
  aictePermanentId?: string
  regionId?: string
  verified?: string
  page?: number
  pageSize?: number
}

export interface InstitutionCaseSummary {
  total: number
  open: number
  pending: number
  unassigned: number
  assigned: number
  underProcess: number
  disposed: number
  transferred: number
  escalated: number
  reopened: number
  beyondTimelines: number
}

export interface InstitutionProfile {
  institution: Institution
  summary: InstitutionCaseSummary
  cases: CaseListItem[]
  total: number
  page: number
  pageSize: number
}

export interface InstitutionInput {
  name: string
  aictePermanentId?: string
  address?: string
  regionId?: string
  verified?: boolean
}

interface RawInstitution {
  _id: string
  id?: string
  name: string
  aictePermanentId?: string
  address?: string
  regionId?: string
  regionName?: string
  verified: boolean
  otherDetails?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

interface InstitutionProfileResponse {
  institution: RawInstitution
  summary: InstitutionCaseSummary
  cases: CaseListItem[]
  total: number
  page: number
  pageSize: number
}

interface DuplicateResponse {
  duplicates: RawInstitution[]
}

export const institutionKeys = {
  list: (filters: InstitutionFilters) => ['institutions', 'list', filters] as const,
  detail: (id: string, page: number, pageSize: number) =>
    ['institutions', 'detail', id, page, pageSize] as const,
  duplicates: (name: string, aictePermanentId: string) =>
    ['institutions', 'duplicates', name, aictePermanentId] as const,
}

function toInstitution(item: RawInstitution): Institution {
  return { ...item, id: item.id ?? item._id }
}

export function fetchInstitutions(filters: InstitutionFilters): Promise<Page<Institution>> {
  return apiClient
    .get<Page<RawInstitution>>(`/institutions${buildQuery(filters)}`)
    .then((page) => ({ ...page, items: page.items.map(toInstitution) }))
}

export function fetchInstitution(
  id: string,
  page: number,
  pageSize: number,
): Promise<InstitutionProfile> {
  return apiClient
    .get<InstitutionProfileResponse>(`/institutions/${id}${buildQuery({ page, pageSize })}`)
    .then((data) => ({
      institution: toInstitution(data.institution),
      summary: data.summary,
      cases: data.cases,
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
    }))
}

export function fetchDuplicates(name: string, aictePermanentId: string): Promise<Institution[]> {
  return apiClient
    .get<DuplicateResponse>(
      `/institutions/check-duplicate${buildQuery({ name, aictePermanentId })}`,
    )
    .then((data) => data.duplicates.map(toInstitution))
}

export function createInstitution(input: InstitutionInput): Promise<Institution> {
  return apiClient.post<RawInstitution>('/institutions', input).then((data) => toInstitution(data))
}

export function updateInstitution(
  id: string,
  input: Partial<InstitutionInput>,
): Promise<Institution> {
  return apiClient
    .patch<RawInstitution>(`/institutions/${id}`, input)
    .then((data) => toInstitution(data))
}

export function useInstitutions(filters: InstitutionFilters, enabled = true) {
  return useQuery({
    queryKey: institutionKeys.list(filters),
    queryFn: () => fetchInstitutions(filters),
    enabled,
  })
}

export function useInstitution(id: string, page: number, pageSize: number) {
  return useQuery({
    queryKey: institutionKeys.detail(id, page, pageSize),
    queryFn: () => fetchInstitution(id, page, pageSize),
    enabled: Boolean(id),
  })
}

export function useInstitutionDuplicates(name: string, aictePermanentId: string, enabled: boolean) {
  return useQuery({
    queryKey: institutionKeys.duplicates(name, aictePermanentId),
    queryFn: () => fetchDuplicates(name, aictePermanentId),
    enabled: enabled && (name.trim().length >= 3 || aictePermanentId.trim().length > 0),
  })
}

function invalidateInstitutions(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['institutions'] })
  void queryClient.invalidateQueries({ queryKey: ['cases'] })
}

export function useCreateInstitution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createInstitution,
    onSuccess: () => invalidateInstitutions(queryClient),
  })
}

export function useUpdateInstitution(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<InstitutionInput>) => updateInstitution(id, input),
    onSuccess: () => invalidateInstitutions(queryClient),
  })
}
