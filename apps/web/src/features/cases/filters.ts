import { PAGINATION } from '@casesync/config'
import type { CaseFilters } from './api'

export const CASE_FILTER_KEYS = [
  'q',
  'status',
  'bureauId',
  'regionId',
  'category',
  'source',
  'priority',
  'dateFrom',
  'dateTo',
  'sort',
] as const satisfies readonly (keyof CaseFilters)[]

export const CASE_FILTER_LABELS: Record<(typeof CASE_FILTER_KEYS)[number], string> = {
  q: 'Search',
  status: 'Status',
  bureauId: 'Bureau',
  regionId: 'Region',
  category: 'Category',
  source: 'Source',
  priority: 'Priority',
  dateFrom: 'Received from',
  dateTo: 'Received to',
  sort: 'Sort',
}

export function cleanCaseFilters(input: CaseFilters): CaseFilters {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => Boolean(value)),
  ) as CaseFilters
}

export function readCaseFilters(params: URLSearchParams): CaseFilters {
  const result: CaseFilters = {}
  for (const key of CASE_FILTER_KEYS) {
    const value = params.get(key)
    if (value) result[key] = value
  }
  const page = Number(params.get('page'))
  const pageSize = Number(params.get('pageSize'))
  result.page = Number.isInteger(page) && page > 0 ? page : PAGINATION.DEFAULT_PAGE
  result.pageSize =
    Number.isInteger(pageSize) && pageSize > 0 ? pageSize : PAGINATION.DEFAULT_PAGE_SIZE
  return result
}

export function caseFiltersToSearchParams(filters: CaseFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  return params
}

/** Clear one filter while keeping the rest of the URL contract intact. */
export function removeCaseFilter(filters: CaseFilters, key: keyof CaseFilters): CaseFilters {
  const next = { ...filters }
  delete next[key]
  return { ...next, page: PAGINATION.DEFAULT_PAGE }
}
