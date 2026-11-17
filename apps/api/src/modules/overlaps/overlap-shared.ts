// Shared case/pair shapes, constants, and pure helpers for overlap assessment.

import {
  JEV_ASSESSMENT_STATUS,
  JEV_RELATIONSHIP_CHOICE,
  type JevAssessmentStatus,
  OVERLAP,
  RELATIONSHIP_MATCH_TYPE,
  ROLES,
} from '@casesync/config'
import { JevError, jevConfig } from '#/services/jev'
import type { CaseForAssessment } from './overlap.jev'

export interface CaseDoc extends CaseForAssessment {
  _id: unknown
  institutionId: unknown
  regionId?: unknown
}
export type Pair = { caseAId: string; caseBId: string }
export interface Candidate {
  case: CaseDoc
  matchType: string
  confidence?: number
}
export interface RelationshipLike {
  _id: unknown
  assessmentId?: unknown
}
export type AssessmentOutcome = 'assessed' | 'skipped' | 'failed'
export interface PairOutcome {
  relationshipCreated: boolean
  assessment: AssessmentOutcome
}

export const RELATIONSHIP_CHOICES = new Set<string>(Object.values(JEV_RELATIONSHIP_CHOICE))
export const ASSESSMENT_RESULT_FIELDS = {
  modelVersion: 1,
  relationshipChoice: 1,
  coordinationReviewNoul: 1,
  confidence: 1,
  probabilities: 1,
  rationale: 1,
  tokensIn: 1,
  tokensOut: 1,
  latencyMs: 1,
  rawResponse: 1,
  assessedAt: 1,
} as const
export const OVERLAP_OVERSIGHT_ROLES = [
  ROLES.ADMIN,
  ROLES.SENIOR_MANAGEMENT,
  ROLES.COMPETENT_AUTHORITY,
] as const

export function isJevConfigured() {
  return jevConfig.enabled && Boolean(jevConfig.apiKey)
}
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  )
}
export function toStatusForError(error: unknown): JevAssessmentStatus {
  if (error instanceof JevError && error.kind === 'TIMEOUT') {
    return JEV_ASSESSMENT_STATUS.TIMEOUT
  }
  return JEV_ASSESSMENT_STATUS.FAILED
}
export function buildFallbackReason(matchType: string) {
  const basis =
    matchType === RELATIONSHIP_MATCH_TYPE.INSTITUTION_NAME_FUZZY
      ? OVERLAP.FUZZY_REASON
      : OVERLAP.RULE_BASED_REASON
  return `${OVERLAP.HEADING}. ${basis}`
}
export function involvedIds(cases: CaseDoc[], field: 'bureauId' | 'regionId') {
  return [
    ...new Set(
      cases
        .map((item) => item[field])
        .filter((value): value is NonNullable<typeof value> => Boolean(value))
        .map(String),
    ),
  ]
}
