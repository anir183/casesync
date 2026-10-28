import { describe, expect, test } from 'bun:test'
import { ROLES } from '@casesync/config'
import { AppError } from '#/lib/errors'
import {
  assertBureauAssignment,
  assertInstitutionWrite,
  caseMatchesScope,
  caseScopeFilterFor,
  mergeFilters,
  resolveScope,
} from '#/lib/scope'

const BUREAU_ID = '6ae22dc874c1c9705e858562'
const OTHER_BUREAU_ID = '6ae22dc874c1c9705e858563'
const REGION_ID = '6ae22dc874c1c9705e858564'
const OTHER_REGION_ID = '6ae22dc874c1c9705e858565'
const INSTITUTION_ID = '6ae22dc874c1c9705e858566'

function expectAppError(fn: () => void, code: string) {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe(code)
    return
  }
  throw new Error(`Expected ${code} to throw`)
}

describe('resolveScope', () => {
  test('grants all-scope roles full visibility', () => {
    for (const role of [
      ROLES.ADMIN,
      ROLES.SENIOR_MANAGEMENT,
      ROLES.COMPETENT_AUTHORITY,
      ROLES.VIEWER,
    ]) {
      expect(resolveScope({ id: 'u1', role })).toEqual({ kind: 'all' })
    }
  })

  test('requires a bureau assignment for bureau officers', () => {
    expect(resolveScope({ id: 'u1', role: ROLES.BUREAU_OFFICER, bureauId: BUREAU_ID })).toEqual({
      kind: 'bureau',
      bureauId: expect.anything(),
    })
    expectAppError(
      () => resolveScope({ id: 'u1', role: ROLES.BUREAU_OFFICER }),
      'SCOPE_NOT_CONFIGURED',
    )
  })

  test('requires a region assignment for regional officers', () => {
    expect(resolveScope({ id: 'u1', role: ROLES.REGIONAL_OFFICER, regionId: REGION_ID })).toEqual({
      kind: 'region',
      regionId: expect.anything(),
    })
    expectAppError(
      () => resolveScope({ id: 'u1', role: ROLES.REGIONAL_OFFICER }),
      'SCOPE_NOT_CONFIGURED',
    )
  })

  test('rejects unknown and missing roles', () => {
    expectAppError(() => resolveScope({ id: 'u1' }), 'FORBIDDEN')
    expectAppError(() => resolveScope({ id: 'u1', role: 'SUPERUSER' }), 'FORBIDDEN')
  })
})

describe('caseScopeFilterFor', () => {
  test('returns no filter for all-scope users', () => {
    expect(caseScopeFilterFor(resolveScope({ id: 'u1', role: ROLES.ADMIN }))).toEqual({})
  })

  test('filters bureau officers by their bureau', () => {
    const scope = resolveScope({ id: 'u1', role: ROLES.BUREAU_OFFICER, bureauId: BUREAU_ID })
    const filter = caseScopeFilterFor(scope) as { bureauId: { toString(): string } }
    expect(String(filter.bureauId)).toBe(BUREAU_ID)
  })

  test('includes both denormalized and legacy institution regions', () => {
    const scope = resolveScope({ id: 'u1', role: ROLES.REGIONAL_OFFICER, regionId: REGION_ID })
    const filter = caseScopeFilterFor(scope, [INSTITUTION_ID]) as {
      $or: Array<{ regionId?: unknown; institutionId?: { $in: unknown[] } }>
    }
    expect(String(filter.$or[0]?.regionId)).toBe(REGION_ID)
    expect(filter.$or[1]?.institutionId?.$in).toHaveLength(1)
  })

  test('falls back to region only when no institutions exist', () => {
    const scope = resolveScope({ id: 'u1', role: ROLES.REGIONAL_OFFICER, regionId: REGION_ID })
    const filter = caseScopeFilterFor(scope) as { regionId: { toString(): string } }
    expect(String(filter.regionId)).toBe(REGION_ID)
  })
})

describe('mergeFilters', () => {
  test('keeps both the business filter and the scope filter', () => {
    const merged = mergeFilters({ status: 'RECEIVED' }, { bureauId: BUREAU_ID })
    expect(merged).toEqual({ $and: [{ status: 'RECEIVED' }, { bureauId: BUREAU_ID }] })
  })

  test('returns the original filter when scope is unrestricted', () => {
    expect(mergeFilters({ status: 'RECEIVED' }, {})).toEqual({ status: 'RECEIVED' })
  })
})

describe('write guards', () => {
  test('bureau officers cannot assign outside their bureau', () => {
    const user = { id: 'u1', role: ROLES.BUREAU_OFFICER, bureauId: BUREAU_ID }
    expect(() => assertBureauAssignment(user, BUREAU_ID)).not.toThrow()
    expectAppError(() => assertBureauAssignment(user, OTHER_BUREAU_ID), 'FORBIDDEN')
    expectAppError(() => assertBureauAssignment(user), 'FORBIDDEN')
  })

  test('admins are not constrained by bureau', () => {
    const user = { id: 'u1', role: ROLES.ADMIN }
    expect(() => assertBureauAssignment(user, OTHER_BUREAU_ID)).not.toThrow()
  })

  test('viewers cannot write institutions', () => {
    expectAppError(() => assertInstitutionWrite({ id: 'u1', role: ROLES.VIEWER }), 'FORBIDDEN')
  })

  test('regional officers cannot write institutions outside their region', () => {
    const user = { id: 'u1', role: ROLES.REGIONAL_OFFICER, regionId: REGION_ID }
    expect(() => assertInstitutionWrite(user, REGION_ID)).not.toThrow()
    expectAppError(() => assertInstitutionWrite(user, OTHER_REGION_ID), 'FORBIDDEN')
  })
})

describe('caseMatchesScope', () => {
  test('matches bureau and region ownership', () => {
    const bureauScope = resolveScope({
      id: 'u1',
      role: ROLES.BUREAU_OFFICER,
      bureauId: BUREAU_ID,
    })
    expect(caseMatchesScope(bureauScope, { bureauId: BUREAU_ID })).toBe(true)
    expect(caseMatchesScope(bureauScope, { bureauId: OTHER_BUREAU_ID })).toBe(false)

    const regionScope = resolveScope({
      id: 'u1',
      role: ROLES.REGIONAL_OFFICER,
      regionId: REGION_ID,
    })
    expect(caseMatchesScope(regionScope, { regionId: REGION_ID })).toBe(true)
    expect(caseMatchesScope(regionScope, { regionId: OTHER_REGION_ID })).toBe(false)

    const allScope = resolveScope({ id: 'u1', role: ROLES.ADMIN })
    expect(caseMatchesScope(allScope, {})).toBe(true)
  })
})
