import { describe, expect, test } from 'bun:test'
import { bucketForAge } from '#/modules/reports/report.service'

describe('bucketForAge', () => {
  test('maps ages to the configured reporting buckets', () => {
    expect(bucketForAge(0)).toBe('0-7 days')
    expect(bucketForAge(7)).toBe('0-7 days')
    expect(bucketForAge(8)).toBe('8-30 days')
    expect(bucketForAge(30)).toBe('8-30 days')
    expect(bucketForAge(31)).toBe('31-60 days')
    expect(bucketForAge(60)).toBe('31-60 days')
    expect(bucketForAge(61)).toBe('61-90 days')
    expect(bucketForAge(90)).toBe('61-90 days')
    expect(bucketForAge(91)).toBe('90+ days')
    expect(bucketForAge(365)).toBe('90+ days')
  })
})
