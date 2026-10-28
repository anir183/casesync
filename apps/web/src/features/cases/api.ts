import { useQuery } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'

export interface CaseListItem {
  id: string
  caseNumber: string
  institutionId: string
  institutionName?: string
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
}

export interface CaseFilters {
  q?: string
  status?: string
  bureauId?: string
  category?: string
  dateFrom?: string
  dateTo?: string
}

export interface Bureau {
  id: string
  code: string
  name: string
}

interface CaseListResponse {
  items: CaseListItem[]
}

interface BureauResponse {
  items: Array<{ _id: string; code: string; name: string }>
}

function buildQuery(filters: CaseFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function fetchCases(filters: CaseFilters): Promise<CaseListItem[]> {
  const data = await apiClient.get<CaseListResponse>(`/cases${buildQuery(filters)}`)
  return data.items
}

export async function fetchBureaus(): Promise<Bureau[]> {
  const data = await apiClient.get<BureauResponse>('/bureaus')
  return data.items.map((item) => ({ id: item._id, code: item.code, name: item.name }))
}

export function useCases(filters: CaseFilters) {
  return useQuery({
    queryKey: ['cases', 'list', filters],
    queryFn: () => fetchCases(filters),
  })
}

export function useBureaus() {
  return useQuery({
    queryKey: ['bureaus', 'list'],
    queryFn: fetchBureaus,
  })
}
