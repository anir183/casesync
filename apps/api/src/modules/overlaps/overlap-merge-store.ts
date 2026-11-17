// Persistence, audit, notification, and snapshot writes for overlap merge
// decisions. All database side effects for merging live in this module.

import {
  JEV_ASSESSMENT_STATUS,
  JEV_RELATIONSHIP_CHOICE,
  MERGE_GROUP_STATUS,
  NOTIFICATION_TYPE,
  RELATIONSHIP_REVIEW_STATUS,
  ROLES,
} from '@casesync/config'
import { env } from '#/config/env'
import { AUDIT_ENTITY, recordAudit } from '#/lib/audit'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { notifyRecipients, resolveScopedRecipients } from '#/lib/notifications'
import { Bureau } from '#/models/bureau.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseMergeGroup, type IMergeSnapshot } from '#/models/case-merge-group.model'
import { CaseOverlapAssessment } from '#/models/case-overlap-assessment.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import {
  REVIEW_OVERSIGHT_ROLES,
  asString,
  currentMergeStatus,
  involvedIds,
} from './overlap-merge-support'
import type { MergeDecision, ScoringCase, ScoringRelationship } from './overlap-merge-support'

export async function loadPair(relationship: ScoringRelationship) {
  const cases = (await Case.find({
    _id: { $in: [relationship.caseAId, relationship.caseBId] },
  }).lean()) as unknown as ScoringCase[]
  if (cases.length !== 2) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Overlap cases not found', 'OVERLAP_NOT_FOUND')
  }
  const byId = new Map(cases.map((item) => [asString(item._id), item]))
  const caseA = byId.get(asString(relationship.caseAId))
  const caseB = byId.get(asString(relationship.caseBId))
  if (!caseA || !caseB) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Overlap cases not found', 'OVERLAP_NOT_FOUND')
  }
  return [caseA, caseB] as const
}

export async function findActiveGroupForCases(caseIds: unknown[]) {
  return CaseMergeGroup.findOne({
    status: MERGE_GROUP_STATUS.ACTIVE,
    memberCaseIds: { $in: caseIds },
  }).lean()
}
export async function jevVetoReason(
  relationship: ScoringRelationship,
): Promise<string | undefined> {
  const assessment = await CaseOverlapAssessment.findOne({
    _id: relationship.assessmentId,
  }).lean()
  if (!assessment || assessment.status !== JEV_ASSESSMENT_STATUS.ASSESSED) return undefined
  if (assessment.relationshipChoice === JEV_RELATIONSHIP_CHOICE.SAME_INSTITUTION_DIFFERENT_ISSUE) {
    return 'jev_different_issue'
  }
  if (
    typeof assessment.coordinationReviewNoul === 'number' &&
    assessment.coordinationReviewNoul < env.JEV_COORDINATION_THRESHOLD
  ) {
    return 'jev_negative_coordination'
  }
  return undefined
}
export async function updateScore(
  relationship: ScoringRelationship,
  decision: MergeDecision,
  extra: Record<string, unknown> = {},
) {
  const update: Record<string, unknown> = {
    confidenceScore: decision.score,
    matchSignals: decision.signals,
    mergeThreshold: decision.threshold,
    mergeTextThreshold: decision.textThreshold,
    ...extra,
  }
  const unset: Record<string, 1> = {}
  if (decision.vetoReason) update.mergeVetoReason = decision.vetoReason
  else unset.mergeVetoReason = 1
  await CaseRelationship.updateOne(
    { _id: relationship._id },
    { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
  )
}

export async function recordDecisionActions(
  caseIds: unknown[],
  actorId: string,
  actionType: string,
  remarks: string,
  metadata: Record<string, unknown>,
) {
  if (caseIds.length === 0) return
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
export async function writeAudit(
  relationshipId: unknown,
  actorId: string,
  action: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  metadata: Record<string, unknown>,
) {
  await recordAudit({
    actorId,
    action,
    entityType: AUDIT_ENTITY.CASE_RELATIONSHIP,
    entityId: String(relationshipId),
    before,
    after,
    metadata,
  })
}
export async function notifyMergeGroup(
  groupId: unknown,
  cases: ScoringCase[],
  action: 'merged' | 'reverted',
) {
  const staffRecipients = await resolveScopedRecipients({
    roles: [...REVIEW_OVERSIGHT_ROLES, ROLES.BUREAU_OFFICER, ROLES.REGIONAL_OFFICER],
    bureauIds: involvedIds(cases, 'bureauId'),
    regionIds: involvedIds(cases, 'regionId'),
  })
  const merged = action === 'merged'
  await notifyRecipients(staffRecipients, {
    type: merged ? NOTIFICATION_TYPE.OVERLAP_MERGED : NOTIFICATION_TYPE.OVERLAP_MERGE_REVERTED,
    referenceId: String(groupId),
    link: `/merge-groups/${groupId}`,
    periodKey: merged ? 'MERGED' : 'REVERTED',
    title: merged ? 'Overlap merge group updated' : 'Overlap merge reverted',
    message: merged
      ? 'Cases about the same institution have been linked into a merge group for coordinated handling. This is not a duplicate determination.'
      : 'A merge group was reverted and its cases have returned to human review. Original case records are unchanged.',
  })

  const complainantCases = new Map<string, ScoringCase>()
  for (const caseItem of cases) {
    if (caseItem.complainantId && !complainantCases.has(caseItem.complainantId)) {
      complainantCases.set(caseItem.complainantId, caseItem)
    }
  }
  for (const [complainantId, caseItem] of complainantCases) {
    await notifyRecipients([complainantId], {
      type: merged ? NOTIFICATION_TYPE.OVERLAP_MERGED : NOTIFICATION_TYPE.OVERLAP_MERGE_REVERTED,
      referenceId: String(groupId),
      caseId: String(caseItem._id),
      link: `/portal/complaints/${caseItem._id}`,
      periodKey: merged ? 'MERGED' : 'REVERTED',
      title: merged ? 'Complaint linked for coordinated handling' : 'Complaint merge reverted',
      message: merged
        ? 'Your complaint has been linked to another complaint about the same institution so it can be handled consistently. It remains a separate complaint record.'
        : 'A link between complaints about the same institution has been reverted. Your complaint remains open for human review.',
    })
  }
}

export async function buildSnapshot(
  cases: ScoringCase[],
  canonicalCaseId: string,
): Promise<IMergeSnapshot> {
  const bureauIds = involvedIds(cases, 'bureauId')
  const bureaus = bureauIds.length ? await Bureau.find({ _id: { $in: bureauIds } }).lean() : []
  const bureauNames = new Map(bureaus.map((item) => [asString(item._id), item.name]))
  return {
    members: [...cases]
      .sort((a, b) => {
        if (asString(a._id) === canonicalCaseId) return -1
        if (asString(b._id) === canonicalCaseId) return 1
        return asString(a._id).localeCompare(asString(b._id))
      })
      .map((item) => ({
        caseId: asString(item._id),
        caseNumber: item.caseNumber,
        status: item.status,
        category: item.category,
        bureauId: item.bureauId ? asString(item.bureauId) : undefined,
        bureauName: item.bureauId ? bureauNames.get(asString(item.bureauId)) : undefined,
        regionId: item.regionId ? asString(item.regionId) : undefined,
      })),
  }
}
export async function createMergeGroup(
  relationship: ScoringRelationship,
  cases: readonly [ScoringCase, ScoringCase],
  actorId: string,
  canonicalCaseId: string,
  decision: MergeDecision,
) {
  const memberCaseIds = [relationship.caseAId, relationship.caseBId]
  const snapshot = await buildSnapshot([...cases], canonicalCaseId)
  return CaseMergeGroup.create({
    canonicalCaseId,
    memberCaseIds,
    mergedAt: new Date(),
    mergedBy: actorId,
    confidenceScore: decision.score,
    matchSignals: decision.signals,
    snapshot,
    status: MERGE_GROUP_STATUS.ACTIVE,
  })
}
export async function attachDecisionToGroup(
  relationshipId: unknown,
  groupId: unknown,
  actorId: string,
) {
  await CaseRelationship.updateOne(
    { _id: relationshipId },
    {
      $set: {
        mergeGroupId: groupId,
        decidedBy: actorId,
        decidedAt: new Date(),
      },
    },
  )
}
export async function auditMerge(
  relationship: ScoringRelationship,
  group: { _id: unknown },
  actorId: string,
  action: string,
  reason: string,
  extra: Record<string, unknown> = {},
) {
  const caseIds = [relationship.caseAId, relationship.caseBId]
  await Promise.all([
    writeAudit(
      relationship._id,
      actorId,
      action,
      { mergeStatus: currentMergeStatus(relationship), reviewStatus: relationship.reviewStatus },
      { mergeStatus: 'merged', reviewStatus: RELATIONSHIP_REVIEW_STATUS.CONFIRMED },
      { mergeGroupId: String(group._id), reason, ...extra },
    ),
    recordDecisionActions(caseIds, actorId, action, reason, {
      relationshipId: relationship._id,
      mergeGroupId: group._id,
      ...extra,
    }),
  ])
}
