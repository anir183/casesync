import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface CaseListItem {
  id: string
  caseNumber: string
  institutionId: string
  institutionName?: string
  regionId?: string
  regionName?: string
  bureauId?: string
  bureauName?: string
  category?: string
  description?: string
  status: string
  receivedAt: string
  expectedDisposalAt?: string
  nextAction?: string
  nextActionDueAt?: string
  lastActionAt?: string
  officerId?: string
  officerName?: string
}

export interface CaseFilters {
  q?: string
  status?: string
  bureauId?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  sort?: string
}

export interface CaseAction {
  _id: string
  actorId: string
  actorName?: string
  actionType: string
  fromStatus?: string
  toStatus?: string
  bureauFromId?: string
  bureauFromName?: string
  bureauToId?: string
  bureauToName?: string
  officerFromId?: string
  officerFromName?: string
  officerToId?: string
  officerToName?: string
  remarks?: string
  createdAt: string
}

export interface CaseAssignment {
  _id: string
  bureauId: string
  bureauName?: string
  officerId?: string
  officerName?: string
  assignedAt: string
  endedAt?: string
  assignedBy?: string
  assignedByName?: string
  remarks?: string
}

export interface CaseDetail extends CaseListItem {
  slaDays?: number
  institution?: {
    id: string
    name: string
    aictePermanentId?: string
    regionId?: string
  }
  bureau?: {
    id: string
    name: string
    code: string
  }
  region?: {
    id: string
    name: string
    code: string
  }
  currentAssignment?: CaseAssignment
  assignments: CaseAssignment[]
  actions: CaseAction[]
  relatedCases: Array<{
    relationshipId: string
    caseId: string
    matchType: string
    reason?: string
    reviewStatus: string
  }>
}

export interface DirectoryUser {
  id: string
  name: string
  email?: string
  role?: string
  bureauId?: string
  regionId?: string
  active: boolean
}

export interface CreateCaseInput {
  institutionId: string
  bureauId?: string
  caseNumber?: string
  category?: string
  description?: string
  receivedAt?: string
  expectedDisposalAt?: string
  nextAction?: string
  nextActionDueAt?: string
  officerId?: string
}

export interface AssignmentInput {
  bureauId: string
  officerId?: string
  remarks?: string
}

export type CaseActionInput =
  | ({ kind: 'assign' } & AssignmentInput)
  | ({ kind: 'transfer' } & AssignmentInput)
  | { kind: 'remark'; remarks: string }
  | { kind: 'nextAction'; nextAction: string; nextActionDueAt?: string }
  | { kind: 'status'; status: string; remarks?: string }
  | { kind: 'escalate'; remarks?: string }
  | { kind: 'dispose'; remarks?: string }

export const caseKeys = {
  list: (filters: CaseFilters) => ['cases', 'list', filters] as const,
  detail: (id: string) => ['cases', 'detail', id] as const,
}

const OFFICER_DIRECTORY_KEY = ['users', 'directory'] as const

export function buildQuery(filters: object) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function fetchCases(filters: CaseFilters): Promise<Page<CaseListItem>> {
  return apiClient.get<Page<CaseListItem>>(`/cases${buildQuery(filters)}`)
}

export function fetchCaseDetail(id: string): Promise<CaseDetail> {
  return apiClient.get<CaseDetail>(`/cases/${id}`)
}

export function createCase(input: CreateCaseInput): Promise<CaseDetail> {
  return apiClient.post<CaseDetail>('/cases', input)
}

export function fetchOfficerDirectory(bureauId?: string, q?: string): Promise<DirectoryUser[]> {
  return apiClient
    .get<{ items: DirectoryUser[] }>(`/users/directory${buildQuery({ bureauId, q })}`)
    .then((data) => data.items)
}

async function submitCaseAction(id: string, input: CaseActionInput) {
  switch (input.kind) {
    case 'assign':
      return apiClient.post(`/cases/${id}/assign`, {
        bureauId: input.bureauId,
        officerId: input.officerId,
        remarks: input.remarks,
      })
    case 'transfer':
      return apiClient.post(`/cases/${id}/transfer`, {
        bureauId: input.bureauId,
        officerId: input.officerId,
        remarks: input.remarks,
      })
    case 'remark':
      return apiClient.post(`/cases/${id}/actions`, { remarks: input.remarks })
    case 'nextAction':
      return apiClient.patch(`/cases/${id}/next-action`, {
        nextAction: input.nextAction,
        nextActionDueAt: input.nextActionDueAt,
      })
    case 'status':
      return apiClient.patch(`/cases/${id}/status`, {
        status: input.status,
        remarks: input.remarks,
      })
    case 'escalate':
      return apiClient.post(`/cases/${id}/escalate`, { remarks: input.remarks })
    case 'dispose':
      return apiClient.post(`/cases/${id}/dispose`, { remarks: input.remarks })
  }
}

function invalidateCaseData(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  void queryClient.invalidateQueries({ queryKey: ['cases'] })
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  void queryClient.invalidateQueries({ queryKey: ['reports'] })
  void queryClient.invalidateQueries({ queryKey: ['overlaps'] })
  void queryClient.invalidateQueries({ queryKey: ['notifications'] })
  if (id) void queryClient.invalidateQueries({ queryKey: caseKeys.detail(id) })
}

export function useCases(filters: CaseFilters) {
  return useQuery({
    queryKey: caseKeys.list(filters),
    queryFn: () => fetchCases(filters),
  })
}

export function useCaseDetail(id: string) {
  return useQuery({
    queryKey: caseKeys.detail(id),
    queryFn: () => fetchCaseDetail(id),
    enabled: Boolean(id),
  })
}

export function useOfficerDirectory(bureauId?: string, q?: string) {
  return useQuery({
    queryKey: [...OFFICER_DIRECTORY_KEY, bureauId ?? 'all', q ?? ''],
    queryFn: () => fetchOfficerDirectory(bureauId, q),
    enabled: Boolean(bureauId),
  })
}

export function useCreateCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCase,
    onSuccess: (item) => {
      invalidateCaseData(queryClient, item.id)
    },
  })
}

export function useCaseAction(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CaseActionInput) => submitCaseAction(id, input),
    onSuccess: () => invalidateCaseData(queryClient, id),
  })
}
