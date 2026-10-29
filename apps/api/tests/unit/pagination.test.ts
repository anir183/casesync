import { describe, expect, test } from 'bun:test'
import { buildPage, parseSort, resolvePageQuery } from '#/lib/pagination'

describe('pagination helpers', () => {
  test('adds an _id tiebreaker for stable page boundaries', () => {
    expect(parseSort(undefined, ['caseNumber'], 'createdAt')).toEqual({
      createdAt: -1,
      _id: -1,
    })
    expect(parseSort('caseNumber:asc', ['caseNumber'], 'createdAt')).toEqual({
      caseNumber: 1,
      _id: 1,
    })
    expect(parseSort('_id:asc', ['_id'], 'createdAt')).toEqual({ _id: 1 })
  })

  test('falls back on invalid page input and caps page size', () => {
    expect(resolvePageQuery({ page: '0', pageSize: '500' })).toEqual({
      page: 1,
      pageSize: 100,
      skip: 0,
      limit: 100,
    })
    expect(buildPage(['a'], 3, { page: 2, pageSize: 1 })).toEqual({
      items: ['a'],
      total: 3,
      page: 2,
      pageSize: 1,
    })
  })
})
