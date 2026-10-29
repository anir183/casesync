import { describe, expect, test } from 'bun:test'
import { PAGINATION } from '@casesync/config'
import {
  caseFiltersToSearchParams,
  cleanCaseFilters,
  readCaseFilters,
} from '../src/features/cases/filters'

describe('case URL filters', () => {
  test('defaults paging and ignores unknown or empty values', () => {
    const filters = readCaseFilters(
      new URLSearchParams({ q: '  fees  ', status: '', unknown: 'ignored', page: '0' }),
    )

    expect(filters).toEqual({
      q: '  fees  ',
      page: PAGINATION.DEFAULT_PAGE,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    })
  })

  test('round-trips supported filters without empty values', () => {
    const params = caseFiltersToSearchParams({
      q: 'ragging',
      status: 'RECEIVED',
      bureauId: 'bureau-1',
      regionId: '',
      category: 'HARASSMENT',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      sort: 'receivedAt:desc',
      page: 2,
      pageSize: 50,
    })

    expect(Object.fromEntries(params)).toEqual({
      q: 'ragging',
      status: 'RECEIVED',
      bureauId: 'bureau-1',
      category: 'HARASSMENT',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      sort: 'receivedAt:desc',
      page: '2',
      pageSize: '50',
    })
    expect(readCaseFilters(params)).toMatchObject({
      q: 'ragging',
      status: 'RECEIVED',
      page: 2,
      pageSize: 50,
    })
  })

  test('cleans empty filters before submitting', () => {
    expect(cleanCaseFilters({ q: '', status: 'RECEIVED', regionId: undefined, page: 1 })).toEqual({
      status: 'RECEIVED',
      page: 1,
    })
  })
})
