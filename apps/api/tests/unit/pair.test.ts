import { describe, expect, test } from 'bun:test'
import { normalizePairKey } from '@casesync/utils'

describe('normalizePairKey', () => {
  test('normalizes pair with min first', () => {
    const res = normalizePairKey('b', 'a')
    expect(res.caseAId).toBe('a')
    expect(res.caseBId).toBe('b')
  })
  test('keeps order if already min', () => {
    const res = normalizePairKey('a', 'c')
    expect(res.caseAId).toBe('a')
    expect(res.caseBId).toBe('c')
  })
})
