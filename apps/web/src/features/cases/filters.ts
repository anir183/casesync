import { PAGINATION } from '@casesync/config'
import type { CaseFilters } from './api'

const FILTER_KEYS = [
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
] as const

export function cleanCaseFilters(input: CaseFilters): CaseFilters {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => Boolean(value)),
  ) as CaseFilters
}

export function readCaseFilters(params: URLSearchParams): CaseFilters {
  const result: CaseFilters = {}
  for (const key of FILTER_KEYS) {
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
