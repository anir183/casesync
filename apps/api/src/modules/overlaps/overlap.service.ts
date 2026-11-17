// Public facade for overlap assessment. Routes and other features import from
// here; the seam modules below are internal to the overlaps feature.

import {
  CASE_STATUS,
  OVERLAP,
  RELATIONSHIP_MATCH_TYPE,
  RELATIONSHIP_REVIEW_STATUS,
} from '@casesync/config'
import { normalizePairKey } from '@casesync/utils'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { logger } from '#/lib/logger'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { assessOnePair, recordLinkedActions, recordUnlinkActions } from './overlap-assessment'
import { findCrossBureauCandidates } from './overlap-candidates'
import { isJevConfigured } from './overlap-shared'
import type { CaseDoc, RelationshipLike } from './overlap-shared'

export interface AssessSummary {
  caseId: string
  candidates: number
  created: number
  assessed: number
  skipped: number
  failed: number
  jevEnabled: boolean
}

export interface AssessOptions {
  force?: boolean
  skipUpperSide?: boolean
}
export async function assessCaseOverlaps(
  caseId: string,
  actorId: string,
  options: AssessOptions = {},
): Promise<AssessSummary> {
  const source = (await Case.findById(caseId).lean()) as unknown as CaseDoc | null
  if (!source) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Case not found', 'CASE_NOT_FOUND')
  }

  const candidates = await findCrossBureauCandidates(source)
  const summary: AssessSummary = {
    caseId,
    candidates: candidates.length,
    created: 0,
    assessed: 0,
    skipped: 0,
    failed: 0,
    jevEnabled: isJevConfigured(),
  }

  for (const candidate of candidates) {
    const candidateCase = candidate.case
    if (options.skipUpperSide && String(source._id) > String(candidateCase._id)) continue

    const pair = normalizePairKey(String(source._id), String(candidateCase._id))
    try {
      const outcome = await assessOnePair(
        source,
        candidateCase,
        pair,
        actorId,
        candidate,
        Boolean(options.force),
      )
      if (outcome.relationshipCreated) summary.created += 1
      if (outcome.assessment === 'skipped') summary.skipped += 1
      if (outcome.assessment === 'assessed') summary.assessed += 1
      if (outcome.assessment === 'failed') summary.failed += 1
    } catch (error) {
      summary.failed += 1
      logger.error('overlap pair processing failed', {
        caseId,
        candidateId: String(candidateCase._id),
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return summary
}

export async function reassessInstitutionOverlaps(institutionId: string, actorId: string) {
  const cases = await Case.find(
    { institutionId, status: { $ne: CASE_STATUS.DISPOSED } },
    { _id: 1 },
  )
    .limit(OVERLAP.REASSESS_CASE_LIMIT)
    .lean()

  for (const item of cases) {
    try {
      await assessCaseOverlaps(String(item._id), actorId, {
        force: true,
        skipUpperSide: true,
      })
    } catch (error) {
      logger.warn('institution overlap reassessment failed', {
        institutionId,
        caseId: String(item._id),
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { cases: cases.length }
}

export async function linkCasePair(
  caseAId: string,
  caseBId: string,
  notes: string | undefined,
  actorId: string,
) {
  if (caseAId === caseBId) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'A case cannot be linked to itself', 'SAME_CASE')
  }

  const pair = normalizePairKey(caseAId, caseBId)
  const existing = await CaseRelationship.findOne(pair)
  if (existing) {
    if (existing.reviewStatus !== RELATIONSHIP_REVIEW_STATUS.PENDING) {
      throw new AppError(
        HTTP_STATUS.CONFLICT,
        'This overlap has already been reviewed',
        'OVERLAP_REVIEWED',
      )
    }
    existing.reviewStatus = RELATIONSHIP_REVIEW_STATUS.CONFIRMED
    existing.reviewedBy = actorId
    existing.reviewedAt = new Date()
    existing.reviewNotes = notes
    await existing.save()
    await recordLinkedActions([caseAId, caseBId], actorId, existing._id, {
      manual: true,
      confirmedExisting: true,
      notes,
    })
    return String(existing._id)
  }

  const reason = notes ? `${OVERLAP.MANUAL_REASON} ${notes}` : OVERLAP.MANUAL_REASON
  const relationship = await CaseRelationship.create({
    caseAId: pair.caseAId,
    caseBId: pair.caseBId,
    matchType: RELATIONSHIP_MATCH_TYPE.MANUAL,
    reason,
    reviewStatus: RELATIONSHIP_REVIEW_STATUS.CONFIRMED,
    reviewedBy: actorId,
    reviewedAt: new Date(),
    reviewNotes: notes,
  })
  await recordLinkedActions([caseAId, caseBId], actorId, relationship._id, {
    manual: true,
    notes,
  })
  return String(relationship._id)
}

export async function unlinkRelationship(
  relationship: RelationshipLike & {
    caseAId: unknown
    caseBId: unknown
    reviewStatus: string
  },
  notes: string | undefined,
  actorId: string,
) {
  if (relationship.reviewStatus === RELATIONSHIP_REVIEW_STATUS.DISMISSED) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'This overlap has already been dismissed',
      'OVERLAP_REVIEWED',
    )
  }

  await CaseRelationship.updateOne(
    { _id: relationship._id },
    {
      reviewStatus: RELATIONSHIP_REVIEW_STATUS.DISMISSED,
      reviewedBy: actorId,
      reviewedAt: new Date(),
      reviewNotes: notes,
    },
  )
  await recordUnlinkActions(
    [relationship.caseAId, relationship.caseBId],
    actorId,
    relationship._id,
    notes ?? '',
  )
  return String(relationship._id)
}

export { clearReMergeSuppression, mergeRelationship, revertMerge } from './overlap.scoring'
