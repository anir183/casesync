// Orchestration of automatic and manual overlap merge decisions. Stage 9
// thresholds, JEV veto rules, and claim/conflict handling are unchanged.

import {
  ACTION_TYPE,
  MERGE_GROUP_STATUS,
  OVERLAP,
  OVERLAP_MERGE_STATUS,
  RELATIONSHIP_MATCH_TYPE,
  RELATIONSHIP_REVIEW_STATUS,
} from '@casesync/config'
import { evaluateOverlapScore, normalizePairKey } from '@casesync/utils'
import { env } from '#/config/env'
import { AUDIT_ACTION } from '#/lib/audit'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { logger } from '#/lib/logger'
import { CaseMergeGroup } from '#/models/case-merge-group.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import {
  attachDecisionToGroup,
  auditMerge,
  createMergeGroup,
  findActiveGroupForCases,
  jevVetoReason,
  loadPair,
  notifyMergeGroup,
  recordDecisionActions,
  updateScore,
  writeAudit,
} from './overlap-merge-store'
import {
  CANDIDATE_OR_MISSING,
  asString,
  canonicalCase,
  currentMergeStatus,
  decideEligibility,
  isDuplicateKeyError,
  trimReason,
  validateCanonical,
} from './overlap-merge-support'
import type {
  MergeDecision,
  MergeResult,
  ScoringCase,
  ScoringRelationship,
} from './overlap-merge-support'

export async function evaluateAutoMerge(relationshipId: string): Promise<MergeResult> {
  const relationship = (await CaseRelationship.findById(
    relationshipId,
  ).lean()) as unknown as ScoringRelationship | null
  if (!relationship) return { status: 'skipped', relationshipId, reason: 'not_found' }

  const status = currentMergeStatus(relationship)
  if (
    status === OVERLAP_MERGE_STATUS.AUTO_MERGED ||
    status === OVERLAP_MERGE_STATUS.MANUAL_MERGED
  ) {
    return {
      status: 'already_merged',
      relationshipId,
      mergeGroupId: relationship.mergeGroupId ? String(relationship.mergeGroupId) : undefined,
    }
  }
  if (status === OVERLAP_MERGE_STATUS.REVERTED || status === OVERLAP_MERGE_STATUS.MANUAL_REVIEW) {
    return { status: 'skipped', relationshipId, reason: status }
  }

  const [caseA, caseB] = await loadPair(relationship)
  const pair = normalizePairKey(asString(relationship.caseAId), asString(relationship.caseBId))
  const score = evaluateOverlapScore(
    {
      descriptionA: caseA.description,
      descriptionB: caseB.description,
      institutionMatch:
        relationship.matchType === RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID &&
        asString(caseA.institutionId) === asString(caseB.institutionId),
      categoryA: caseA.category,
      categoryB: caseB.category,
      regionA: caseA.regionId ? asString(caseA.regionId) : undefined,
      regionB: caseB.regionId ? asString(caseB.regionId) : undefined,
      receivedAtA: caseA.receivedAt,
      receivedAtB: caseB.receivedAt,
      matchTypeMatch: relationship.matchType === RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID,
    },
    {
      combined: env.OVERLAP_AUTO_MERGE_THRESHOLD,
      text: env.OVERLAP_AUTO_MERGE_TEXT_THRESHOLD,
    },
    OVERLAP.AUTO_MERGE_DATE_WINDOW_DAYS,
  )

  const activeGroup = await findActiveGroupForCases([pair.caseAId, pair.caseBId])
  const eligibility = decideEligibility(relationship, caseA, caseB)
  const veto = eligibility ? undefined : await jevVetoReason(relationship)
  const gateReason = !score.textGatePassed
    ? 'text_gate_failed'
    : !score.thresholdPassed
      ? 'score_below_threshold'
      : undefined
  const reason =
    eligibility ?? veto ?? (activeGroup ? 'active_merge_group' : undefined) ?? gateReason
  const decision: MergeDecision = {
    score: score.score,
    signals: { ...score.signals },
    vetoReason: reason,
    threshold: env.OVERLAP_AUTO_MERGE_THRESHOLD,
    textThreshold: env.OVERLAP_AUTO_MERGE_TEXT_THRESHOLD,
  }

  if (reason) {
    const nextStatus =
      relationship.reMergeSuppressed || status === OVERLAP_MERGE_STATUS.REVERTED
        ? status
        : OVERLAP_MERGE_STATUS.MANUAL_REVIEW
    await updateScore(relationship, decision, {
      mergeStatus: nextStatus,
      reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING,
    })
    return { status: 'manual_review', relationshipId, reason }
  }

  const claimed = (await CaseRelationship.findOneAndUpdate(
    {
      _id: relationship._id,
      reMergeSuppressed: { $ne: true },
      $or: CANDIDATE_OR_MISSING,
    },
    {
      $set: {
        confidenceScore: decision.score,
        matchSignals: decision.signals,
        mergeThreshold: decision.threshold,
        mergeTextThreshold: decision.textThreshold,
        mergeStatus: OVERLAP_MERGE_STATUS.AUTO_MERGED,
        reviewStatus: RELATIONSHIP_REVIEW_STATUS.CONFIRMED,
        decidedBy: OVERLAP.AUTO_MERGE_ACTOR,
        decidedAt: new Date(),
      },
      $unset: { mergeVetoReason: 1 },
    },
    { new: true },
  ).lean()) as unknown as ScoringRelationship | null

  if (!claimed) {
    return { status: 'skipped', relationshipId, reason: 'claim_lost' }
  }

  const canonical = canonicalCase([caseA, caseB])
  try {
    const group = await createMergeGroup(
      relationship,
      [caseA, caseB],
      OVERLAP.AUTO_MERGE_ACTOR,
      asString(canonical._id),
      decision,
    )
    await attachDecisionToGroup(relationship._id, group._id, OVERLAP.AUTO_MERGE_ACTOR)
    await auditMerge(
      relationship,
      group,
      OVERLAP.AUTO_MERGE_ACTOR,
      AUDIT_ACTION.OVERLAP_AUTO_MERGED,
      'High-confidence exact institution overlap auto-merged.',
      {
        confidenceScore: decision.score,
        matchSignals: decision.signals,
        mergeThreshold: decision.threshold,
        mergeTextThreshold: decision.textThreshold,
      },
    )
    await notifyMergeGroup(group._id, [caseA, caseB], 'merged').catch((error) => {
      logger.warn('overlap merge notification failed', {
        groupId: String(group._id),
        message: error instanceof Error ? error.message : String(error),
      })
    })
    return { status: 'auto_merged', relationshipId, mergeGroupId: String(group._id) }
  } catch (error) {
    const existing = await findActiveGroupForCases([relationship.caseAId, relationship.caseBId])
    if (existing) {
      const current = await CaseRelationship.findById(relationship._id).lean()
      if (current?.mergeGroupId && String(current.mergeGroupId) === String(existing._id)) {
        return {
          status: 'already_merged',
          relationshipId,
          mergeGroupId: String(existing._id),
        }
      }
    }
    await CaseRelationship.updateOne(
      { _id: relationship._id, mergeStatus: OVERLAP_MERGE_STATUS.AUTO_MERGED },
      {
        $set: {
          mergeStatus: OVERLAP_MERGE_STATUS.MANUAL_REVIEW,
          reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING,
          mergeVetoReason: existing ? 'active_merge_group' : 'merge_group_conflict',
          confidenceScore: decision.score,
          matchSignals: decision.signals,
        },
      },
    )
    if (!isDuplicateKeyError(error)) {
      logger.warn('automatic overlap merge failed', {
        relationshipId,
        message: error instanceof Error ? error.message : String(error),
      })
    }
    return {
      status: 'manual_review',
      relationshipId,
      reason: existing ? 'active_merge_group' : 'merge_group_conflict',
    }
  }
}
export async function mergeRelationship(
  relationship: ScoringRelationship,
  input: { reason?: string; canonicalCaseId?: string },
  actorId: string,
) {
  const reason = trimReason(input.reason)
  const status = currentMergeStatus(relationship)
  if (
    status === OVERLAP_MERGE_STATUS.AUTO_MERGED ||
    status === OVERLAP_MERGE_STATUS.MANUAL_MERGED
  ) {
    throw new AppError(HTTP_STATUS.CONFLICT, 'Overlap is already merged', 'OVERLAP_ALREADY_MERGED')
  }
  if (relationship.reviewStatus === RELATIONSHIP_REVIEW_STATUS.DISMISSED) {
    throw new AppError(HTTP_STATUS.CONFLICT, 'Overlap has been dismissed', 'OVERLAP_REVIEWED')
  }

  const [caseA, caseB] = await loadPair(relationship)
  const activeGroup = await findActiveGroupForCases([relationship.caseAId, relationship.caseBId])
  if (activeGroup) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'A case in this pair is already in an active merge group',
      'MERGE_GROUP_CONFLICT',
    )
  }

  const canonicalCaseId = validateCanonical(input.canonicalCaseId, relationship)
  const decision: MergeDecision = {
    score: relationship.confidenceScore,
    signals: relationship.matchSignals,
    threshold: env.OVERLAP_AUTO_MERGE_THRESHOLD,
    textThreshold: env.OVERLAP_AUTO_MERGE_TEXT_THRESHOLD,
  }

  let group: Awaited<ReturnType<typeof createMergeGroup>>
  try {
    group = await createMergeGroup(relationship, [caseA, caseB], actorId, canonicalCaseId, decision)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        HTTP_STATUS.CONFLICT,
        'A case in this pair is already in an active merge group',
        'MERGE_GROUP_CONFLICT',
      )
    }
    throw error
  }

  const before = {
    mergeStatus: status,
    reviewStatus: relationship.reviewStatus,
  }
  await CaseRelationship.updateOne(
    { _id: relationship._id },
    {
      $set: {
        mergeStatus: OVERLAP_MERGE_STATUS.MANUAL_MERGED,
        mergeGroupId: group._id,
        reviewStatus: RELATIONSHIP_REVIEW_STATUS.CONFIRMED,
        reviewedBy: actorId,
        reviewedAt: new Date(),
        reviewNotes: reason,
        decidedBy: actorId,
        decidedAt: new Date(),
        confidenceScore: relationship.confidenceScore,
        matchSignals: relationship.matchSignals,
        mergeThreshold: env.OVERLAP_AUTO_MERGE_THRESHOLD,
        mergeTextThreshold: env.OVERLAP_AUTO_MERGE_TEXT_THRESHOLD,
      },
      $unset: { mergeVetoReason: 1 },
    },
  )
  await Promise.all([
    writeAudit(
      relationship._id,
      actorId,
      AUDIT_ACTION.OVERLAP_MANUALLY_MERGED,
      before,
      {
        mergeStatus: OVERLAP_MERGE_STATUS.MANUAL_MERGED,
        reviewStatus: RELATIONSHIP_REVIEW_STATUS.CONFIRMED,
      },
      { mergeGroupId: String(group._id), reason, canonicalCaseId },
    ),
    recordDecisionActions(
      [relationship.caseAId, relationship.caseBId],
      actorId,
      ACTION_TYPE.OVERLAP_MANUALLY_MERGED,
      reason,
      { relationshipId: relationship._id, mergeGroupId: group._id, canonicalCaseId },
    ),
    notifyMergeGroup(group._id, [caseA, caseB], 'merged').catch((error) => {
      logger.warn('manual overlap merge notification failed', {
        groupId: String(group._id),
        message: error instanceof Error ? error.message : String(error),
      })
    }),
  ])

  return group
}
export async function revertMerge(
  relationship: ScoringRelationship,
  input: { reason?: string },
  actorId: string,
) {
  const reason = trimReason(input.reason)
  const group = await CaseMergeGroup.findOne({
    _id: relationship.mergeGroupId,
    status: MERGE_GROUP_STATUS.ACTIVE,
  })
  if (!group) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'Overlap is not part of an active merge group',
      'MERGE_NOT_ACTIVE',
    )
  }

  const revertedAt = new Date()
  const updatedGroup = await CaseMergeGroup.findOneAndUpdate(
    { _id: group._id, status: MERGE_GROUP_STATUS.ACTIVE },
    {
      $set: {
        status: MERGE_GROUP_STATUS.REVERTED,
        revertedAt,
        revertedBy: actorId,
        revertReason: reason,
      },
    },
    { new: true },
  )
  if (!updatedGroup) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'Overlap is not part of an active merge group',
      'MERGE_NOT_ACTIVE',
    )
  }

  const relationships = (await CaseRelationship.find({
    mergeGroupId: group._id,
    mergeStatus: {
      $in: [OVERLAP_MERGE_STATUS.AUTO_MERGED, OVERLAP_MERGE_STATUS.MANUAL_MERGED],
    },
  }).lean()) as unknown as ScoringRelationship[]

  await CaseRelationship.updateMany(
    {
      mergeGroupId: group._id,
      mergeStatus: {
        $in: [OVERLAP_MERGE_STATUS.AUTO_MERGED, OVERLAP_MERGE_STATUS.MANUAL_MERGED],
      },
    },
    {
      $set: {
        mergeStatus: OVERLAP_MERGE_STATUS.REVERTED,
        reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING,
        reMergeSuppressed: true,
        revertReason: reason,
        revertedAt,
        revertedBy: actorId,
        reviewedBy: actorId,
        reviewedAt: revertedAt,
        reviewNotes: reason,
      },
    },
  )

  const cases = (await Case.find({
    _id: { $in: group.memberCaseIds },
  }).lean()) as unknown as ScoringCase[]
  await Promise.all([
    ...relationships.map((item) =>
      writeAudit(
        item._id,
        actorId,
        AUDIT_ACTION.OVERLAP_MERGE_REVERTED,
        { mergeStatus: currentMergeStatus(item), reviewStatus: item.reviewStatus },
        {
          mergeStatus: OVERLAP_MERGE_STATUS.REVERTED,
          reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING,
        },
        {
          mergeGroupId: String(group._id),
          reason,
          reMergeSuppressed: true,
        },
      ),
    ),
    recordDecisionActions(
      group.memberCaseIds,
      actorId,
      ACTION_TYPE.OVERLAP_MERGE_REVERTED,
      reason,
      {
        mergeGroupId: group._id,
        relationshipIds: relationships.map((item) => item._id),
        reMergeSuppressed: true,
      },
    ),
    notifyMergeGroup(group._id, cases, 'reverted').catch((error) => {
      logger.warn('overlap merge revert notification failed', {
        groupId: String(group._id),
        message: error instanceof Error ? error.message : String(error),
      })
    }),
  ])

  return updatedGroup
}
export async function clearReMergeSuppression(
  relationship: ScoringRelationship,
  input: { reason?: string },
  actorId: string,
) {
  const reason = trimReason(input.reason)
  if (
    currentMergeStatus(relationship) !== OVERLAP_MERGE_STATUS.REVERTED ||
    !relationship.reMergeSuppressed
  ) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'This overlap is not suppressed after a revert',
      'MERGE_NOT_ACTIVE',
    )
  }

  await CaseRelationship.updateOne(
    { _id: relationship._id },
    {
      $set: {
        mergeStatus: OVERLAP_MERGE_STATUS.MANUAL_REVIEW,
        reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING,
        reMergeSuppressed: false,
      },
    },
  )

  await Promise.all([
    writeAudit(
      relationship._id,
      actorId,
      AUDIT_ACTION.OVERLAP_REMERGE_SUPPRESSION_CLEARED,
      {
        mergeStatus: OVERLAP_MERGE_STATUS.REVERTED,
        reMergeSuppressed: true,
      },
      {
        mergeStatus: OVERLAP_MERGE_STATUS.MANUAL_REVIEW,
        reMergeSuppressed: false,
      },
      {
        mergeGroupId: relationship.mergeGroupId ? String(relationship.mergeGroupId) : undefined,
        reason,
      },
    ),
    recordDecisionActions(
      [relationship.caseAId, relationship.caseBId],
      actorId,
      ACTION_TYPE.OVERLAP_REMERGE_SUPPRESSION_CLEARED,
      reason,
      {
        relationshipId: relationship._id,
        mergeGroupId: relationship.mergeGroupId,
        clearedSuppression: true,
      },
    ),
  ])
}

export type { ScoringRelationship }
