import {
  ACTION_TYPE,
  CASE_STATUS,
  JEV_ASSESSMENT_STATUS,
  JEV_RELATIONSHIP_CHOICE,
  MERGE_GROUP_STATUS,
  NOTIFICATION_TYPE,
  OVERLAP,
  OVERLAP_MERGE_STATUS,
  RELATIONSHIP_MATCH_TYPE,
  RELATIONSHIP_REVIEW_STATUS,
  ROLES,
} from '@casesync/config'
import { evaluateOverlapScore, normalizePairKey } from '@casesync/utils'
import mongoose from 'mongoose'
import { env } from '#/config/env'
import { AUDIT_ACTION, AUDIT_ENTITY, recordAudit } from '#/lib/audit'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { logger } from '#/lib/logger'
import { notifyRecipients, resolveScopedRecipients } from '#/lib/notifications'
import { Bureau } from '#/models/bureau.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseMergeGroup, type IMergeSnapshot } from '#/models/case-merge-group.model'
import { CaseOverlapAssessment } from '#/models/case-overlap-assessment.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'

interface ScoringCase {
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

interface ScoringRelationship {
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

interface MergeDecision {
  score?: number
  signals?: Record<string, number>
  vetoReason?: string
  threshold: number
  textThreshold: number
}

interface MergeResult {
  status: 'auto_merged' | 'manual_review' | 'skipped' | 'already_merged'
  relationshipId: string
  mergeGroupId?: string
  reason?: string
}

const REVIEW_OVERSIGHT_ROLES = [
  ROLES.ADMIN,
  ROLES.SENIOR_MANAGEMENT,
  ROLES.COMPETENT_AUTHORITY,
] as const

const CANDIDATE_OR_MISSING = [
  { mergeStatus: OVERLAP_MERGE_STATUS.CANDIDATE },
  { mergeStatus: { $exists: false } },
]

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  )
}

function currentMergeStatus(relationship: ScoringRelationship) {
  return relationship.mergeStatus ?? OVERLAP_MERGE_STATUS.CANDIDATE
}

function validateReasonLength(value: string): string {
  if (value.length > OVERLAP.MAX_NOTES_LENGTH) {
    throw new AppError(
      HTTP_STATUS.UNPROCESSABLE,
      `Reason must be ${OVERLAP.MAX_NOTES_LENGTH} characters or fewer`,
      'MERGE_REASON_REQUIRED',
    )
  }
  return value
}

function trimOptionalReason(reason: string | undefined): string {
  return validateReasonLength(reason?.trim() ?? '')
}

function trimReason(reason: string | undefined): string {
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

function asString(value: unknown): string {
  return value ? String(value) : ''
}

function involvedIds(cases: ScoringCase[], field: 'bureauId' | 'regionId') {
  return [
    ...new Set(
      cases
        .map((item) => item[field])
        .filter((value): value is NonNullable<typeof value> => Boolean(value))
        .map(String),
    ),
  ]
}

function canonicalCase(cases: ScoringCase[]): ScoringCase {
  return [...cases].sort((a, b) => {
    const received = a.receivedAt.getTime() - b.receivedAt.getTime()
    return received || asString(a._id).localeCompare(asString(b._id))
  })[0]
}

async function loadPair(relationship: ScoringRelationship) {
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

async function findActiveGroupForCases(caseIds: unknown[]) {
  return CaseMergeGroup.findOne({
    status: MERGE_GROUP_STATUS.ACTIVE,
    memberCaseIds: { $in: caseIds },
  }).lean()
}

async function jevVetoReason(relationship: ScoringRelationship): Promise<string | undefined> {
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

function decideEligibility(
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

async function updateScore(
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

async function recordDecisionActions(
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

async function writeAudit(
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

async function notifyMergeGroup(
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

async function buildSnapshot(
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

async function createMergeGroup(
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

function validateCanonical(
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

async function attachDecisionToGroup(relationshipId: unknown, groupId: unknown, actorId: string) {
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

async function auditMerge(
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
