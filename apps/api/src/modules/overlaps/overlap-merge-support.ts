// Pure merge-eligibility, validation, and case-shaping helpers for overlap
// auto-merge. No database access; these are the signal/verdict calculations.

import {
  CASE_STATUS,
  OVERLAP,
  OVERLAP_MERGE_STATUS,
  RELATIONSHIP_MATCH_TYPE,
  ROLES,
} from '@casesync/config'
import { env } from '#/config/env'
import { AppError, HTTP_STATUS } from '#/lib/errors'

export interface ScoringCase {
  _id: unknown
  caseNumber: string
  institutionId: unknown
  regionId?: unknown
  bureauId?: unknown
  category?: string
  description?: string
  status: string
  receivedAt: Date
  complainantId?: string
}
export interface ScoringRelationship {
  _id: unknown
  caseAId: unknown
  caseBId: unknown
  assessmentId?: unknown
  matchType: string
  reviewStatus: string
  mergeStatus?: string
  mergeGroupId?: unknown
  reMergeSuppressed?: boolean
  confidenceScore?: number
  matchSignals?: Record<string, number>
  mergeVetoReason?: string
}
export interface MergeDecision {
  score?: number
  signals?: Record<string, number>
  vetoReason?: string
  threshold: number
  textThreshold: number
}
export interface MergeResult {
  status: 'auto_merged' | 'manual_review' | 'skipped' | 'already_merged'
  relationshipId: string
  mergeGroupId?: string
  reason?: string
}

export const REVIEW_OVERSIGHT_ROLES = [
  ROLES.ADMIN,
  ROLES.SENIOR_MANAGEMENT,
  ROLES.COMPETENT_AUTHORITY,
] as const
export const CANDIDATE_OR_MISSING = [
  { mergeStatus: OVERLAP_MERGE_STATUS.CANDIDATE },
  { mergeStatus: { $exists: false } },
]

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  )
}
export function currentMergeStatus(relationship: ScoringRelationship) {
  return relationship.mergeStatus ?? OVERLAP_MERGE_STATUS.CANDIDATE
}
export function validateReasonLength(value: string): string {
  if (value.length > OVERLAP.MAX_NOTES_LENGTH) {
    throw new AppError(
      HTTP_STATUS.UNPROCESSABLE,
      `Reason must be ${OVERLAP.MAX_NOTES_LENGTH} characters or fewer`,
      'MERGE_REASON_REQUIRED',
    )
  }
  return value
}
export function trimOptionalReason(reason: string | undefined): string {
  return validateReasonLength(reason?.trim() ?? '')
}
export function trimReason(reason: string | undefined): string {
  const value = trimOptionalReason(reason)
  if (!value) {
    throw new AppError(
      HTTP_STATUS.UNPROCESSABLE,
      'A reason is required for this merge decision',
      'MERGE_REASON_REQUIRED',
    )
  }
  return value
}
export function asString(value: unknown): string {
  return value ? String(value) : ''
}
export function involvedIds(cases: ScoringCase[], field: 'bureauId' | 'regionId') {
  return [
    ...new Set(
      cases
        .map((item) => item[field])
        .filter((value): value is NonNullable<typeof value> => Boolean(value))
        .map(String),
    ),
  ]
}
export function canonicalCase(cases: ScoringCase[]): ScoringCase {
  return [...cases].sort((a, b) => {
    const received = a.receivedAt.getTime() - b.receivedAt.getTime()
    return received || asString(a._id).localeCompare(asString(b._id))
  })[0]
}
export function decideEligibility(
  relationship: ScoringRelationship,
  caseA: ScoringCase,
  caseB: ScoringCase,
): string | undefined {
  if (!env.OVERLAP_AUTO_MERGE_ENABLED) return 'auto_merge_disabled'
  if (relationship.matchType !== RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID) {
    return 'match_type_not_exact'
  }
  if (!caseA.bureauId || !caseB.bureauId || asString(caseA.bureauId) === asString(caseB.bureauId)) {
    return 'same_bureau'
  }
  if (caseA.status === CASE_STATUS.DISPOSED || caseB.status === CASE_STATUS.DISPOSED) {
    return 'case_disposed'
  }
  if (relationship.reMergeSuppressed) return 'remerge_suppressed'
  return undefined
}
export function validateCanonical(
  canonicalCaseId: string | undefined,
  relationship: ScoringRelationship,
): string {
  if (!canonicalCaseId) {
    return asString(relationship.caseAId) < asString(relationship.caseBId)
      ? asString(relationship.caseAId)
      : asString(relationship.caseBId)
  }
  if (
    canonicalCaseId !== asString(relationship.caseAId) &&
    canonicalCaseId !== asString(relationship.caseBId)
  ) {
    throw new AppError(
      HTTP_STATUS.UNPROCESSABLE,
      'Canonical case must be one of the merged pair',
      'MERGE_CANONICAL_INVALID',
    )
  }
  return canonicalCaseId
}
