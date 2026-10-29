import { describe, expect, test } from 'bun:test'
import { DEMO_CASES, DEMO_INSTITUTIONS, DEMO_OVERLAPS, DEMO_SLA_CONFIGS } from '#/seed/demo-data'
import { BUREAUS, CATEGORIES, REGIONS } from '#/seed/masters'

describe('demo seed fixture', () => {
  test('keeps case and institution identifiers unique', () => {
    expect(new Set(DEMO_CASES.map((item) => item.caseNumber)).size).toBe(DEMO_CASES.length)
    expect(new Set(DEMO_CASES.map((item) => item.key)).size).toBe(DEMO_CASES.length)
    expect(new Set(DEMO_INSTITUTIONS.map((item) => item.aictePermanentId)).size).toBe(
      DEMO_INSTITUTIONS.length,
    )
    expect(new Set(DEMO_OVERLAPS.map((item) => item.key)).size).toBe(DEMO_OVERLAPS.length)
    expect(new Set(DEMO_SLA_CONFIGS.map((item) => item.key)).size).toBe(DEMO_SLA_CONFIGS.length)
  })

  test('references only seeded institutions, bureaus, categories and regions', () => {
    const institutionKeys = new Set(DEMO_INSTITUTIONS.map((item) => item.key))
    const bureauCodes = new Set<string>(BUREAUS.map((item) => item.code))
    const categoryCodes = new Set<string>(CATEGORIES.map((item) => item.code))
    const regionCodes = new Set<string>(REGIONS.map((item) => item.code))

    for (const item of DEMO_INSTITUTIONS) {
      expect(regionCodes.has(item.regionCode)).toBe(true)
    }
    for (const item of DEMO_CASES) {
      expect(institutionKeys.has(item.institutionKey)).toBe(true)
      expect(categoryCodes.has(item.category)).toBe(true)
      if (item.bureauCode) expect(bureauCodes.has(item.bureauCode)).toBe(true)
    }
    for (const item of DEMO_SLA_CONFIGS) {
      if (item.bureauCode) expect(bureauCodes.has(item.bureauCode)).toBe(true)
      if (item.category) expect(categoryCodes.has(item.category)).toBe(true)
      if (item.regionCode) expect(regionCodes.has(item.regionCode)).toBe(true)
    }
  })

  test('references only defined cases in overlap scenarios', () => {
    const caseKeys = new Set(DEMO_CASES.map((item) => item.key))
    for (const item of DEMO_OVERLAPS) {
      expect(caseKeys.has(item.caseAKey)).toBe(true)
      expect(caseKeys.has(item.caseBKey)).toBe(true)
      expect(item.caseAKey).not.toBe(item.caseBKey)
    }
  })
})
