// Persistence for demo overlaps, assessments, merge groups, and case actions.

import {
  ACTION_TYPE,
  JEV_ASSESSMENT_STATUS,
  MERGE_GROUP_STATUS,
  OVERLAP,
  OVERLAP_MERGE_STATUS,
} from '@casesync/config'
import { normalizePairKey } from '@casesync/utils'
import { CaseAction } from '#/models/case-action.model'
import { CaseMergeGroup } from '#/models/case-merge-group.model'
import { CaseOverlapAssessment } from '#/models/case-overlap-assessment.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import type { SeedMastersResult } from '#/seed/masters'
import { DEMO_OVERLAPS } from './demo-data'
import {
  type DemoCaseState,
  addDays,
  addHours,
  mergeSnapshot,
  overlapReason,
} from './demo-fixtures'

export async function seedMergeGroup(
  demo: (typeof DEMO_OVERLAPS)[number],
  caseA: DemoCaseState,
  caseB: DemoCaseState,
  masters: SeedMastersResult,
  now: Date,
) {
  const config = demo.mergeGroup
  if (!config) return undefined
  const canonical = config.canonicalCaseKey === demo.caseAKey ? caseA : caseB
  const mergedAt = addDays(now, -config.mergedDaysAgo)
  const mergedBy = config.mergedByEmail
    ? masters.userIdByEmail.get(config.mergedByEmail)
    : OVERLAP.AUTO_MERGE_ACTOR
  if (!mergedBy) throw new Error(`Missing merge actor for ${demo.key}`)
  const snapshot = mergeSnapshot([caseA, caseB], canonical.id)
  const revertedAt =
    config.revertedDaysAgo === undefined ? undefined : addDays(now, -config.revertedDaysAgo)
  const memberCaseIds = [caseA.id, caseB.id]
  const groupFields = {
    canonicalCaseId: canonical.id,
    memberCaseIds,
    mergedAt,
    mergedBy,
    confidenceScore: config.confidenceScore,
    matchSignals: config.matchSignals,
    snapshot,
    status: config.status,
    ...(revertedAt
      ? { revertedAt, revertedBy: masters.userIdByEmail.get('admin@casesync.test') }
      : {}),
    ...(config.revertReason ? { revertReason: config.revertReason } : {}),
  }
  const existing = await CaseMergeGroup.findOne({
    memberCaseIds: { $all: memberCaseIds, $size: memberCaseIds.length },
  }).sort({ mergedAt: -1 })
  if (existing) {
    return CaseMergeGroup.findByIdAndUpdate(
      existing._id,
      {
        $set: groupFields,
        $unset: revertedAt ? {} : { revertedAt: 1, revertedBy: 1, revertReason: 1 },
      },
      { new: true },
    )
  }
  return CaseMergeGroup.create(groupFields)
}
export async function seedOverlaps(
  masters: SeedMastersResult,
  cases: Map<string, DemoCaseState>,
  now: Date,
) {
  const adminId = masters.userIdByEmail.get('admin@casesync.test')
  const relationships: Array<{
    id: string
    caseAId: string
    caseBId: string
    caseANumber: string
    caseBNumber: string
    bureauA?: string
    bureauB?: string
    status: string
    createdAt: Date
    mergeStatus?: string
    mergeGroupId?: string
  }> = []

  for (const demo of DEMO_OVERLAPS) {
    const caseA = cases.get(demo.caseAKey)
    const caseB = cases.get(demo.caseBKey)
    if (!caseA || !caseB) throw new Error(`Missing overlap case for ${demo.key}`)
    const pair = normalizePairKey(caseA.id, caseB.id)
    const assessedAt =
      demo.assessmentStatus === JEV_ASSESSMENT_STATUS.ASSESSED ? addDays(now, -2) : undefined
    const assessment = await CaseOverlapAssessment.findOneAndUpdate(
      pair,
      {
        $set: {
          status: demo.assessmentStatus,
          confidence: demo.confidence,
          rationale: demo.rationale,
          modelVersion: 'demo-jev-v1',
          relationshipChoice: demo.relationshipChoice,
          coordinationReviewNoul: demo.coordinationReviewNoul,
          probabilities: demo.relationshipChoice
            ? {
                likely_same_issue:
                  demo.relationshipChoice === 'likely_same_issue' ? demo.confidence : 0.2,
                same_institution_different_issue:
                  demo.relationshipChoice === 'same_institution_different_issue'
                    ? demo.confidence
                    : 0.2,
                insufficient_information: 0.1,
              }
            : undefined,
          tokensIn: demo.assessmentStatus === JEV_ASSESSMENT_STATUS.ASSESSED ? 180 : undefined,
          tokensOut: demo.assessmentStatus === JEV_ASSESSMENT_STATUS.ASSESSED ? 42 : undefined,
          latencyMs: demo.assessmentStatus === JEV_ASSESSMENT_STATUS.ASSESSED ? 640 : undefined,
          assessedAt,
          errorMessage: demo.errorMessage,
        },
        $unset: {
          ...(demo.relationshipChoice ? {} : { relationshipChoice: 1, probabilities: 1 }),
          ...(demo.coordinationReviewNoul === undefined ? { coordinationReviewNoul: 1 } : {}),
          ...(assessedAt ? {} : { assessedAt: 1, tokensIn: 1, tokensOut: 1, latencyMs: 1 }),
          ...(demo.assessmentStatus === JEV_ASSESSMENT_STATUS.FAILED ? {} : { errorMessage: 1 }),
          rawResponse: 1,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    const reviewedBy = demo.reviewedByEmail
      ? masters.userIdByEmail.get(demo.reviewedByEmail)
      : undefined
    const reviewedAt = reviewedBy ? addDays(now, -1) : undefined
    const group = await seedMergeGroup(demo, caseA, caseB, masters, now)
    const mergeStatus = demo.mergeStatus ?? OVERLAP_MERGE_STATUS.CANDIDATE
    const decidedAt = demo.mergeGroup ? addDays(now, -demo.mergeGroup.mergedDaysAgo) : undefined
    const relationship = await CaseRelationship.findOneAndUpdate(
      pair,
      {
        $set: {
          assessmentId: assessment._id,
          matchType: demo.matchType,
          confidence: demo.confidence,
          reason: overlapReason(demo.matchType),
          reviewStatus: demo.reviewStatus,
          reviewedBy,
          reviewedAt,
          reviewNotes: demo.reviewNotes,
          mergeStatus,
          confidenceScore: demo.mergeScore,
          matchSignals: demo.mergeSignals,
          mergeThreshold: OVERLAP.AUTO_MERGE_DEFAULT_THRESHOLD,
          mergeTextThreshold: OVERLAP.AUTO_MERGE_DEFAULT_TEXT_THRESHOLD,
          mergeGroupId: group?._id,
          decidedBy: group?.mergedBy,
          decidedAt,
          mergeVetoReason: demo.mergeVetoReason,
          reMergeSuppressed: mergeStatus === OVERLAP_MERGE_STATUS.REVERTED,
          ...(demo.mergeGroup?.revertReason ? { revertReason: demo.mergeGroup.revertReason } : {}),
          ...(demo.mergeGroup?.revertedDaysAgo === undefined
            ? {}
            : { revertedAt: addDays(now, -demo.mergeGroup.revertedDaysAgo) }),
          ...(demo.mergeGroup?.revertedDaysAgo === undefined
            ? {}
            : { revertedBy: masters.userIdByEmail.get('admin@casesync.test') }),
        },
        $unset: {
          ...(reviewedAt ? {} : { reviewedAt: 1, reviewedBy: 1, reviewNotes: 1 }),
          ...(demo.mergeScore === undefined ? { confidenceScore: 1, matchSignals: 1 } : {}),
          ...(group ? {} : { mergeGroupId: 1, decidedBy: 1, decidedAt: 1 }),
          ...(demo.mergeVetoReason ? {} : { mergeVetoReason: 1 }),
          ...(demo.mergeGroup?.revertReason ? {} : { revertReason: 1 }),
          ...(demo.mergeGroup?.revertedDaysAgo === undefined
            ? { revertedAt: 1, revertedBy: 1 }
            : {}),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    const relationshipId = String(relationship._id)
    const linkedAt = addHours(now, -6)
    for (const item of [caseA, caseB]) {
      const linked = await CaseAction.findOne({
        caseId: item.id,
        actionType: ACTION_TYPE.LINKED,
        'metadata.relationshipId': relationshipId,
      }).lean()
      if (!linked) {
        await CaseAction.create({
          caseId: item.id,
          actorId: adminId,
          actionType: ACTION_TYPE.LINKED,
          remarks: 'Related cases linked by demo seed',
          metadata: { demo: true, relationshipId },
          createdAt: linkedAt,
        })
      }
    }
    if (reviewedBy) {
      const reviewed = await CaseAction.findOne({
        caseId: caseA.id,
        actionType: ACTION_TYPE.REVIEWED,
        'metadata.relationshipId': relationshipId,
      }).lean()
      if (!reviewed) {
        await CaseAction.create({
          caseId: caseA.id,
          actorId: reviewedBy,
          actionType: ACTION_TYPE.REVIEWED,
          remarks: demo.reviewNotes ?? 'Overlap reviewed',
          metadata: { demo: true, relationshipId, reviewStatus: demo.reviewStatus },
          createdAt: reviewedAt ?? now,
        })
      }
    }
    if (group) {
      const mergeAction =
        group.status === MERGE_GROUP_STATUS.REVERTED
          ? ACTION_TYPE.OVERLAP_MERGE_REVERTED
          : group.mergedBy === OVERLAP.AUTO_MERGE_ACTOR
            ? ACTION_TYPE.OVERLAP_AUTO_MERGED
            : ACTION_TYPE.OVERLAP_MANUALLY_MERGED
      for (const item of [caseA, caseB]) {
        const action = await CaseAction.findOne({
          caseId: item.id,
          actionType: mergeAction,
          'metadata.mergeGroupId': group._id,
        }).lean()
        if (!action) {
          await CaseAction.create({
            caseId: item.id,
            actorId: group.mergedBy,
            actionType: mergeAction,
            remarks: group.revertReason ?? 'Overlap merged for coordinated handling',
            metadata: { demo: true, relationshipId, mergeGroupId: group._id },
            createdAt: group.revertedAt ?? group.mergedAt,
          })
        }
      }
    }

    relationships.push({
      id: relationshipId,
      caseAId: caseA.id,
      caseBId: caseB.id,
      caseANumber: caseA.caseNumber,
      caseBNumber: caseB.caseNumber,
      bureauA: caseA.bureauId,
      bureauB: caseB.bureauId,
      status: demo.reviewStatus,
      createdAt: relationship.createdAt,
      mergeStatus,
      mergeGroupId: group ? String(group._id) : undefined,
    })
  }
  return relationships
}
