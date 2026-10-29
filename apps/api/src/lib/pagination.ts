import { PAGINATION } from '@casesync/config'

export interface PageQueryInput {
  page?: number | string
  pageSize?: number | string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ResolvedPage {
  page: number
  pageSize: number
  skip: number
  limit: number
}

function toPositiveInt(value: number | string | undefined, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return parsed
}

export function resolvePageQuery(input: PageQueryInput = {}): ResolvedPage {
  const page = toPositiveInt(input.page, PAGINATION.DEFAULT_PAGE)
  const requestedSize = toPositiveInt(input.pageSize, PAGINATION.DEFAULT_PAGE_SIZE)
  const pageSize = Math.min(requestedSize, PAGINATION.MAX_PAGE_SIZE)
  return { page, pageSize, skip: (page - 1) * pageSize, limit: pageSize }
}

export function buildPage<T>(
  items: T[],
  total: number,
  paging: Pick<ResolvedPage, 'page' | 'pageSize'>,
): Page<T> {
  return { items, total, page: paging.page, pageSize: paging.pageSize }
}

export function parseSort(
  value: string | undefined,
  allowedFields: readonly string[],
  fallbackField: string,
): Record<string, 1 | -1> {
  const [rawField, rawDirection] = (value ?? '').split(':')
  const field = allowedFields.includes(rawField) ? rawField : fallbackField
  const direction = rawDirection === 'asc' ? 1 : -1
  return field === '_id' ? { _id: direction } : { [field]: direction, _id: direction }
}
