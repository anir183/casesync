import { describe, expect, test } from 'bun:test'
import { normalizeInstitutionName } from '@casesync/utils'

describe('normalizeInstitutionName', () => {
  test('normalizes name', () => {
    const res = normalizeInstitutionName('ABC Institute of Technology!')
    expect(res).toBe('abc institute of technology')
  })
})
