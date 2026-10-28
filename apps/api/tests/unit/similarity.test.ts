import { describe, expect, test } from 'bun:test'
import { isSimilarName, normalizeInstitutionName } from '@casesync/utils'

const THRESHOLD = 0.85

describe('jaroWinkler', () => {
  test('returns 1 for identical strings', () => {
    expect(isSimilarName('abc institute', 'abc institute', THRESHOLD)).toBe(true)
  })

  test('matches a small typo after normalization', () => {
    const a = normalizeInstitutionName('Test Institute of Technology')
    const b = normalizeInstitutionName('Test Institute of Tecnology')
    expect(isSimilarName(a, b, THRESHOLD)).toBe(true)
  })

  test('matches common punctuation and spacing differences after normalization', () => {
    const a = normalizeInstitutionName('ABC Institute of Technology')
    const b = normalizeInstitutionName('A.B.C. Institute  of Technology')
    expect(isSimilarName(a, b, THRESHOLD)).toBe(true)
  })

  test('rejects clearly different names', () => {
    const a = normalizeInstitutionName('Test Institute of Technology')
    const b = normalizeInstitutionName('Regional College of Engineering')
    expect(isSimilarName(a, b, THRESHOLD)).toBe(false)
  })

  test('treats empty input as not similar', () => {
    expect(isSimilarName('', 'abc', THRESHOLD)).toBe(false)
    expect(isSimilarName('abc', '', THRESHOLD)).toBe(false)
  })
})
