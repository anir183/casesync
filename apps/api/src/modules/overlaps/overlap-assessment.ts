// JEV assessment orchestration and relationship/assessment persistence.

import {
  ACTION_TYPE,
  JEV_ASSESSMENT_STATUS,
  type JevAssessmentStatus,
  NOTIFICATION_TYPE,
  OVERLAP,
  RELATIONSHIP_REVIEW_STATUS,
} from '@casesync/config'
import { logger } from '#/lib/logger'
import { notifyRecipients, resolveScopedRecipients } from '#/lib/notifications'
import { CaseAction } from '#/models/case-action.model'
import { CaseOverlapAssessment } from '#/models/case-overlap-assessment.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { JevError, interpretAssessment, jevConfig, jevProvider } from '#/services/jev'
import { loadAssessmentContext } from './overlap-candidates'
import {
  ASSESSMENT_RESULT_FIELDS,
  OVERLAP_OVERSIGHT_ROLES,
  RELATIONSHIP_CHOICES,
  buildFallbackReason,
  involvedIds,
  isDuplicateKeyError,
  isJevConfigured,
  toStatusForError,
} from './overlap-shared'
import type {
  AssessmentOutcome,
  Candidate,
  CaseDoc,
  Pair,
  PairOutcome,
  RelationshipLike,
} from './overlap-shared'
import { buildJevRequest } from './overlap.jev'
import { evaluateAutoMerge } from './overlap.scoring'

export async function recordCaseActions(
  caseIds: unknown[],
  actorId: string,
  actionType: string,
  remarks: string,
  metadata: Record<string, unknown>,
) {
  await CaseAction.insertMany(
    caseIds.map((caseId) => ({
      caseId,
      actorId,
      actionType,
      remarks,
      metadata,
    })),
  )
  await Case.updateMany({ _id: { $in: caseIds } }, { lastActionAt: new Date() })
}
export async function recordLinkedActions(
  caseIds: unknown[],
  actorId: string,
  relationshipId: unknown,
  metadata: Record<string, unknown>,
) {
  await recordCaseActions(caseIds, actorId, ACTION_TYPE.LINKED, OVERLAP.HEADING, {
    relationshipId,
    ...metadata,
  })
}
export async function recordUnlinkActions(
  caseIds: unknown[],
  actorId: string,
  relationshipId: unknown,
  notes: string,
) {
  await recordCaseActions(
    caseIds,
    actorId,
    ACTION_TYPE.UNLINKED,
    notes || OVERLAP.MANUAL_UNLINK_REASON,
    { relationshipId, manual: true },
  )
}
export async function notifyOverlap(source: CaseDoc, candidate: CaseDoc, relationshipId: unknown) {
  const recipients = await resolveScopedRecipients({
    roles: OVERLAP_OVERSIGHT_ROLES,
    bureauIds: involvedIds([source, candidate], 'bureauId'),
    regionIds: involvedIds([source, candidate], 'regionId'),
  })
  await notifyRecipients(recipients, {
    type: NOTIFICATION_TYPE.OVERLAP_ALERT,
    referenceId: String(relationshipId),
    link: `/overlaps/${relationshipId}`,
    periodKey: OVERLAP.NOTIFICATION_PERIOD_KEY,
    title: OVERLAP.HEADING,
    message: `${source.caseNumber} and ${candidate.caseNumber} concern the same institution but are handled by different Bureaus/Cells. Human review is required.`,
  })
}
export async function ensureBaseRelationship(
  source: CaseDoc,
  candidate: CaseDoc,
  pair: Pair,
  actorId: string,
  trigger: Candidate,
): Promise<{ relationship: RelationshipLike; created: boolean }> {
  const existing = await CaseRelationship.findOne(pair)
  if (existing) return { relationship: existing, created: false }

  try {
    const relationship = await CaseRelationship.create({
      caseAId: pair.caseAId,
      caseBId: pair.caseBId,
      matchType: trigger.matchType,
      confidence: trigger.confidence,
      reason: buildFallbackReason(trigger.matchType),
      reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING,
    })
    await recordLinkedActions([source._id, candidate._id], actorId, relationship._id, {
      aiAssisted: false,
    })
    return { relationship, created: true }
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error
    const raced = await CaseRelationship.findOne(pair)
    if (!raced) throw error
    return { relationship: raced, created: false }
  }
}
export async function attachAssessment(relationship: RelationshipLike, assessmentId: unknown) {
  if (String(relationship.assessmentId ?? '') === String(assessmentId)) return
  await CaseRelationship.updateOne({ _id: relationship._id }, { assessmentId })
  relationship.assessmentId = assessmentId
}
export async function createAssessment(pair: Pair, status: JevAssessmentStatus) {
  try {
    return await CaseOverlapAssessment.create({
      caseAId: pair.caseAId,
      caseBId: pair.caseBId,
      status,
    })
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error
    const existing = await CaseOverlapAssessment.findOne(pair)
    if (!existing) throw error
    return existing
  }
}
export async function runJevAssessment(
  caseA: CaseDoc,
  caseB: CaseDoc,
  pair: Pair,
  assessmentId: unknown,
): Promise<AssessmentOutcome> {
  const ctx = await loadAssessmentContext(caseA, caseB)
  const request = buildJevRequest(caseA, caseB, ctx, jevConfig.model)

  try {
    const { data, latencyMs } = await jevProvider.assessPair(
      request,
      `${pair.caseAId}:${pair.caseBId}`,
    )
    const interpreted = interpretAssessment(data)
    if (
      !interpreted.relationshipChoice ||
      !RELATIONSHIP_CHOICES.has(interpreted.relationshipChoice) ||
      typeof interpreted.coordinationReviewNoul !== 'number' ||
      !Number.isFinite(interpreted.coordinationReviewNoul) ||
      interpreted.coordinationReviewNoul < 0 ||
      interpreted.coordinationReviewNoul > 1
    ) {
      throw new JevError('Jev returned an incomplete assessment', 'PARSE', false)
    }

    await CaseOverlapAssessment.updateOne(
      { _id: assessmentId },
      {
        $set: {
          status: JEV_ASSESSMENT_STATUS.ASSESSED,
          modelVersion: interpreted.modelVersion,
          relationshipChoice: interpreted.relationshipChoice,
          coordinationReviewNoul: interpreted.coordinationReviewNoul,
          confidence: interpreted.confidence,
          probabilities: interpreted.probabilities,
          rationale: interpreted.rationale,
          tokensIn: interpreted.tokensIn,
          tokensOut: interpreted.tokensOut,
          latencyMs,
          rawResponse: data as unknown as Record<string, unknown>,
          assessedAt: new Date(),
        },
        $unset: { errorMessage: 1 },
      },
    )
    return 'assessed'
  } catch (error) {
    const status = toStatusForError(error)
    const message = error instanceof Error ? error.message : 'Unknown Jev failure'
    const current = await CaseOverlapAssessment.findById(assessmentId).select('status').lean()

    if (current?.status === JEV_ASSESSMENT_STATUS.ASSESSED) {
      await CaseOverlapAssessment.updateOne(
        { _id: assessmentId },
        { $set: { errorMessage: message } },
      )
    } else {
      await CaseOverlapAssessment.updateOne(
        { _id: assessmentId },
        {
          $set: { status, errorMessage: message },
          $unset: ASSESSMENT_RESULT_FIELDS,
        },
      )
    }

    logger.warn('overlap assessment failed, keeping rule-based relationship', {
      pair: `${pair.caseAId}:${pair.caseBId}`,
      status,
      message,
      preservedLastAssessment: current?.status === JEV_ASSESSMENT_STATUS.ASSESSED,
    })
    return 'failed'
  }
}
export async function assessPair(
  source: CaseDoc,
  candidate: CaseDoc,
  pair: Pair,
  relationship: RelationshipLike,
  force: boolean,
): Promise<AssessmentOutcome> {
  const existing = await CaseOverlapAssessment.findOne(pair).lean()
  if (existing) await attachAssessment(relationship, existing._id)

  if (existing?.status === JEV_ASSESSMENT_STATUS.ASSESSED && !force) return 'skipped'

  if (!isJevConfigured()) {
    if (!existing) {
      const skipped = await createAssessment(pair, JEV_ASSESSMENT_STATUS.SKIPPED)
      await attachAssessment(relationship, skipped._id)
    } else if (existing.status === JEV_ASSESSMENT_STATUS.PENDING) {
      await CaseOverlapAssessment.updateOne(
        { _id: existing._id },
        { status: JEV_ASSESSMENT_STATUS.SKIPPED },
      )
    }
    return 'skipped'
  }

  const assessment = existing ?? (await createAssessment(pair, JEV_ASSESSMENT_STATUS.PENDING))
  await attachAssessment(relationship, assessment._id)

  const ordered = String(source._id) === pair.caseAId ? [source, candidate] : [candidate, source]
  const [caseA, caseB] = ordered
  return runJevAssessment(caseA, caseB, pair, assessment._id)
}
export async function assessOnePair(
  source: CaseDoc,
  candidate: CaseDoc,
  pair: Pair,
  actorId: string,
  trigger: Candidate,
  force: boolean,
): Promise<PairOutcome> {
  const { relationship, created } = await ensureBaseRelationship(
    source,
    candidate,
    pair,
    actorId,
    trigger,
  )

  if (created) {
    await notifyOverlap(source, candidate, relationship._id).catch((error) => {
      logger.warn('overlap notification failed', {
        relationshipId: String(relationship._id),
        message: error instanceof Error ? error.message : String(error),
      })
    })
  }

  const assessment = await assessPair(source, candidate, pair, relationship, force)
  try {
    await evaluateAutoMerge(String(relationship._id))
  } catch (error) {
    logger.warn('overlap auto-merge evaluation failed', {
      relationshipId: String(relationship._id),
      message: error instanceof Error ? error.message : String(error),
    })
  }
  return { relationshipCreated: created, assessment }
}
