import { describe, expect, test } from 'bun:test'
import { parseDateBound, parseDateRange, parseRange } from '#/lib/date-range'

describe('date range helpers', () => {
  test('parses date-only values as inclusive UTC bounds', () => {
    expect(parseDateBound('2026-10-29')?.toISOString()).toBe('2026-10-29T00:00:00.000Z')
    expect(parseDateBound('2026-10-29', true)?.toISOString()).toBe('2026-10-29T23:59:59.999Z')
  })

  test('leaves timestamps intact and omits missing bounds', () => {
    expect(parseDateBound('2026-10-29T10:30:00.000Z')?.toISOString()).toBe(
      '2026-10-29T10:30:00.000Z',
    )
    expect(parseDateBound(undefined)).toBeUndefined()
    expect(parseDateRange()).toEqual({})
  })

  test('builds a Mongo range with an inclusive end of day', () => {
    expect(parseDateRange('2026-10-01', '2026-10-02')).toEqual({
      receivedAt: {
        $gte: new Date('2026-10-01T00:00:00.000Z'),
        $lte: new Date('2026-10-02T23:59:59.999Z'),
      },
    })
  })

  test('rejects invalid and reversed ranges', () => {
    expect(() => parseRange('not-a-date')).toThrow('Invalid date')
    expect(() => parseRange('2026-10-02', '2026-10-01')).toThrow(
      'dateFrom must be on or before dateTo',
    )
  })
})
