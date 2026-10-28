import { ROLES } from '@casesync/config'
import mongoose from 'mongoose'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { Institution } from '#/models/institution.model'

export interface ScopeUser {
  id: string
  role?: string
  bureauId?: string
  regionId?: string
  active?: boolean
}

export type Scope =
  | { kind: 'all' }
  | { kind: 'bureau'; bureauId: mongoose.Types.ObjectId }
  | { kind: 'region'; regionId: mongoose.Types.ObjectId }

const ALL_SCOPE_ROLES: string[] = [
  ROLES.ADMIN,
  ROLES.SENIOR_MANAGEMENT,
  ROLES.COMPETENT_AUTHORITY,
  ROLES.VIEWER,
]

const BUREAU_SCOPE_ROLES: string[] = [ROLES.BUREAU_OFFICER]
const REGION_SCOPE_ROLES: string[] = [ROLES.REGIONAL_OFFICER]

const INSTITUTION_WRITE_ROLES: string[] = [
  ROLES.ADMIN,
  ROLES.BUREAU_OFFICER,
  ROLES.REGIONAL_OFFICER,
]

function scopeNotConfigured(field: string): AppError {
  return new AppError(
    HTTP_STATUS.FORBIDDEN,
    `Account is missing its required ${field} assignment`,
    'SCOPE_NOT_CONFIGURED',
  )
}

function toObjectId(value: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(value)
}

export function resolveScope(user: ScopeUser): Scope {
  if (!user.role) {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'Insufficient permissions', 'FORBIDDEN')
  }
  if (ALL_SCOPE_ROLES.includes(user.role)) {
    return { kind: 'all' }
  }
  if (BUREAU_SCOPE_ROLES.includes(user.role)) {
    if (!user.bureauId) throw scopeNotConfigured('bureau')
    return { kind: 'bureau', bureauId: toObjectId(user.bureauId) }
  }
  if (REGION_SCOPE_ROLES.includes(user.role)) {
    if (!user.regionId) throw scopeNotConfigured('region')
    return { kind: 'region', regionId: toObjectId(user.regionId) }
  }
  throw new AppError(HTTP_STATUS.FORBIDDEN, 'Insufficient permissions', 'FORBIDDEN')
}

export function isAllScope(user: ScopeUser): boolean {
  const scope = resolveScope(user)
  return scope.kind === 'all'
}

/**
 * Pure case-scope filter builder. Region scoping also accepts institution IDs so
 * legacy cases without a denormalized `regionId` remain visible to their region.
 */
export function caseScopeFilterFor(
  scope: Scope,
  regionInstitutionIds: string[] = [],
): Record<string, unknown> {
  if (scope.kind === 'all') return {}
  if (scope.kind === 'bureau') return { bureauId: scope.bureauId }
  const institutionIds = regionInstitutionIds.map(toObjectId)
  if (institutionIds.length === 0) return { regionId: scope.regionId }
  return {
    $or: [{ regionId: scope.regionId }, { institutionId: { $in: institutionIds } }],
  }
}

export async function caseScopeFilter(scope: Scope): Promise<Record<string, unknown>> {
  if (scope.kind !== 'region') return caseScopeFilterFor(scope)
  const institutionIds = (await Institution.distinct('_id', { regionId: scope.regionId })).map(
    String,
  )
  return caseScopeFilterFor(scope, institutionIds)
}

export function institutionScopeFilterFor(scope: Scope): Record<string, unknown> {
  if (scope.kind === 'all') return {}
  if (scope.kind === 'bureau') return {}
  return { regionId: scope.regionId }
}

export function mergeFilters(
  filter: Record<string, unknown>,
  scopeFilter: Record<string, unknown>,
): Record<string, unknown> {
  if (Object.keys(scopeFilter).length === 0) return filter
  return { $and: [filter, scopeFilter] }
}

export function assertInstitutionWrite(user: ScopeUser, regionId?: string): Scope {
  if (!user.role || !INSTITUTION_WRITE_ROLES.includes(user.role)) {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'Insufficient permissions', 'FORBIDDEN')
  }
  const scope = resolveScope(user)
  if (scope.kind === 'region' && regionId && String(scope.regionId) !== regionId) {
    throw new AppError(
      HTTP_STATUS.FORBIDDEN,
      'Cannot write institutions outside your region',
      'FORBIDDEN',
    )
  }
  return scope
}

export function assertBureauAssignment(user: ScopeUser, bureauId?: string): Scope {
  const scope = resolveScope(user)
  if (scope.kind !== 'bureau') return scope
  if (!bureauId) {
    throw new AppError(
      HTTP_STATUS.FORBIDDEN,
      'Bureau officers must register cases against their own bureau',
      'FORBIDDEN',
    )
  }
  if (String(scope.bureauId) !== bureauId) {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'Cannot operate on another bureau case', 'FORBIDDEN')
  }
  return scope
}

export function caseMatchesScope(
  scope: Scope,
  item: { bureauId?: unknown; regionId?: unknown },
): boolean {
  if (scope.kind === 'all') return true
  if (scope.kind === 'bureau') return String(item.bureauId ?? '') === String(scope.bureauId)
  if (item.regionId && String(item.regionId) === String(scope.regionId)) return true
  return false
}

export function canWriteInstitution(user: ScopeUser): boolean {
  return Boolean(user.role && INSTITUTION_WRITE_ROLES.includes(user.role))
}
