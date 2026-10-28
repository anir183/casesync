import {
  ACTION_TYPE,
  CASE_STATUS,
  JEV_ASSESSMENT_STATUS,
  type JevAssessmentStatus,
  NOTIFICATION_TYPE,
  OVERLAP,
  RELATIONSHIP_MATCH_TYPE,
  RELATIONSHIP_REVIEW_STATUS,
  ROLES,
} from '@casesync/config'
import { jaroWinkler, normalizePairKey } from '@casesync/utils'
import { env } from '#/config/env'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { logger } from '#/lib/logger'
import { notifyRoles } from '#/lib/notifications'
import { Bureau } from '#/models/bureau.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseOverlapAssessment } from '#/models/case-overlap-assessment.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import {
  JevError,
  interpretAssessment,
  jevConfig,
  jevProvider,
  shouldFlagForReview,
} from '#/services/jev'
import { type CaseForAssessment, buildJevRequest } from './overlap.jev'

export interface AssessSummary {
  caseId: string
  candidates: number
  created: number
  assessed: number
  skipped: number
  failed: number
  jevEnabled: boolean
}

interface CaseDoc extends CaseForAssessment {
  _id: unknown
  institutionId: unknown
}

type Pair = { caseAId: string; caseBId: string }

interface Candidate {
  case: CaseDoc
  matchType: string
  confidence?: number
}

const FUZZY_INSTITUTION_LIMIT = 500

function isJevConfigured() {
  return jevConfig.enabled && Boolean(jevConfig.apiKey)
}

function toStatusForError(error: unknown): JevAssessmentStatus {
  if (error instanceof JevError && error.kind === 'TIMEOUT') {
    return JEV_ASSESSMENT_STATUS.TIMEOUT
  }
  return JEV_ASSESSMENT_STATUS.FAILED
}

async function findCasesForInstitutions(
  source: CaseDoc,
  institutionIds: unknown[],
): Promise<CaseDoc[]> {
  const filter: Record<string, unknown> = {
    _id: { $ne: source._id },
    institutionId: { $in: institutionIds },
    status: { $ne: CASE_STATUS.DISPOSED },
  }
  if (source.bureauId) {
    filter.bureauId = { $ne: source.bureauId }
  }
  return (await Case.find(filter).lean()) as unknown as CaseDoc[]
}

async function findSimilarInstitutions(source: CaseDoc) {
  const institution = await Institution.findById(source.institutionId).lean()
  if (!institution?.nameNormalized) return []

  const others = await Institution.find({
    _id: { $ne: source.institutionId },
    nameNormalized: { $type: 'string' },
  })
    .limit(FUZZY_INSTITUTION_LIMIT)
    .lean()

  return others
    .map((other) => ({
      id: other._id,
      score: jaroWinkler(institution.nameNormalized, other.nameNormalized),
    }))
    .filter((match) => match.score >= env.INSTITUTION_FUZZY_THRESHOLD)
}

async function findCrossBureauCandidates(source: CaseDoc): Promise<Candidate[]> {
  const candidates = new Map<string, Candidate>()

  const exactCases = await findCasesForInstitutions(source, [source.institutionId])
  for (const item of exactCases) {
    candidates.set(String(item._id), {
      case: item,
      matchType: RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID,
    })
  }

  const similarInstitutions = await findSimilarInstitutions(source)
  if (similarInstitutions.length === 0) return [...candidates.values()]

  const scoreByInstitution = new Map(
    similarInstitutions.map((match) => [String(match.id), match.score]),
  )
  const fuzzyCases = await findCasesForInstitutions(
    source,
    similarInstitutions.map((match) => match.id),
  )

  for (const item of fuzzyCases) {
    const candidateId = String(item._id)
    if (candidates.has(candidateId)) continue
    candidates.set(candidateId, {
      case: item,
      matchType: RELATIONSHIP_MATCH_TYPE.INSTITUTION_NAME_FUZZY,
      confidence: scoreByInstitution.get(String(item.institutionId)),
    })
  }

  return [...candidates.values()]
}

async function loadAssessmentContext(caseA: CaseDoc, caseB: CaseDoc) {
  const institution = await Institution.findById(caseA.institutionId).lean()
  const bureauIds = [caseA.bureauId, caseB.bureauId].filter(Boolean).map(String)
  const bureaus = await Bureau.find({ _id: { $in: bureauIds } }).lean()
  const bureauNames = new Map<string, string>(bureaus.map((b) => [String(b._id), b.name]))
  return {
    institutionRef:
      institution?.aictePermanentId || institution?.name || String(caseA.institutionId),
    bureauNames,
  }
}

async function recordLinkedActions(
  caseIds: unknown[],
  actorId: string,
  relationshipId: unknown,
  metadata: Record<string, unknown>,
) {
  await CaseAction.insertMany(
    caseIds.map((caseId) => ({
      caseId,
      actorId,
      actionType: ACTION_TYPE.LINKED,
      remarks: OVERLAP.HEADING,
      metadata: { relationshipId, ...metadata },
    })),
  )
  await Case.updateMany({ _id: { $in: caseIds } }, { lastActionAt: new Date() })
}

function buildFallbackReason(matchType: string) {
  const basis =
    matchType === RELATIONSHIP_MATCH_TYPE.INSTITUTION_NAME_FUZZY
      ? OVERLAP.FUZZY_REASON
      : OVERLAP.RULE_BASED_REASON
  return `${OVERLAP.HEADING}. ${basis}`
}

const OVERLAP_NOTIFY_ROLES = [
  ROLES.ADMIN,
  ROLES.SENIOR_MANAGEMENT,
  ROLES.COMPETENT_AUTHORITY,
  ROLES.BUREAU_OFFICER,
  ROLES.REGIONAL_OFFICER,
]

async function notifyOverlap(source: CaseDoc, candidate: CaseDoc, relationshipId: unknown) {
  await notifyRoles(OVERLAP_NOTIFY_ROLES, {
    type: NOTIFICATION_TYPE.OVERLAP_ALERT,
    referenceId: String(relationshipId),
    title: OVERLAP.HEADING,
    message: `${source.caseNumber} and ${candidate.caseNumber} concern the same institution but are handled by different Bureaus/Cells. Human review is required.`,
  })
}

async function assessOnePair(
  source: CaseDoc,
  candidate: CaseDoc,
  pair: Pair,
  actorId: string,
  trigger: Candidate,
): Promise<'created' | 'skipped' | 'assessed' | 'failed'> {
  const existing = await CaseOverlapAssessment.findOne({
    caseAId: pair.caseAId,
    caseBId: pair.caseBId,
  }).lean()
  if (existing) return 'skipped'

  const ordered = String(source._id) === pair.caseAId ? [source, candidate] : [candidate, source]
  const [caseA, caseB] = ordered
  const assessment = await CaseOverlapAssessment.create({
    caseAId: pair.caseAId,
    caseBId: pair.caseBId,
    status: JEV_ASSESSMENT_STATUS.PENDING,
  })

  if (!isJevConfigured()) {
    await CaseOverlapAssessment.updateOne(
      { _id: assessment._id },
      { status: JEV_ASSESSMENT_STATUS.SKIPPED },
    )
    const relationship = await CaseRelationship.create({
      caseAId: pair.caseAId,
      caseBId: pair.caseBId,
      assessmentId: assessment._id,
      matchType: trigger.matchType,
      confidence: trigger.confidence,
      reason: buildFallbackReason(trigger.matchType),
      reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING,
    })
    await recordLinkedActions([source._id, candidate._id], actorId, relationship._id, {
      aiAssisted: false,
    })
    await notifyOverlap(source, candidate, relationship._id)
    return 'created'
  }

  const ctx = await loadAssessmentContext(caseA, caseB)
  const request = buildJevRequest(caseA, caseB, ctx, jevConfig.model)

  try {
    const { data, latencyMs } = await jevProvider.assessPair(
      request,
      `${pair.caseAId}:${pair.caseBId}`,
    )
    const interpreted = interpretAssessment(data)
    await CaseOverlapAssessment.updateOne(
      { _id: assessment._id },
      {
        status: JEV_ASSESSMENT_STATUS.ASSESSED,
        modelVersion: interpreted.modelVersion,
        relationshipChoice: interpreted.relationshipChoice,
        coordinationReviewNoul: interpreted.coordinationReviewNoul,
        confidence: interpreted.confidence,
        probabilities: interpreted.probabilities,
        tokensIn: interpreted.tokensIn,
        tokensOut: interpreted.tokensOut,
        latencyMs,
        rawResponse: data as unknown as Record<string, unknown>,
        assessedAt: new Date(),
      },
    )

    if (!shouldFlagForReview(interpreted, jevConfig.coordinationThreshold)) {
      return 'assessed'
    }

    const relationship = await CaseRelationship.create({
      caseAId: pair.caseAId,
      caseBId: pair.caseBId,
      assessmentId: assessment._id,
      matchType: RELATIONSHIP_MATCH_TYPE.COMPLAINT_SIMILAR,
      confidence: interpreted.confidence,
      reason: `${OVERLAP.AI_REASON_PREFIX} ${interpreted.rationale} Same verified institution, different Bureaus/Cells.`,
      reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING,
    })
    await recordLinkedActions([source._id, candidate._id], actorId, relationship._id, {
      aiAssisted: true,
      relationshipChoice: interpreted.relationshipChoice,
      coordinationReviewNoul: interpreted.coordinationReviewNoul,
    })
    await notifyOverlap(source, candidate, relationship._id)
    return 'created'
  } catch (error) {
    const status = toStatusForError(error)
    const message = error instanceof Error ? error.message : 'Unknown Jev failure'
    await CaseOverlapAssessment.updateOne(
      { _id: assessment._id },
      { status, errorMessage: message },
    )
    logger.warn('overlap assessment failed, falling back to rule-based alert', {
      pair: `${pair.caseAId}:${pair.caseBId}`,
      status,
      message,
    })

    const relationship = await CaseRelationship.create({
      caseAId: pair.caseAId,
      caseBId: pair.caseBId,
      assessmentId: assessment._id,
      matchType: trigger.matchType,
      confidence: trigger.confidence,
      reason: buildFallbackReason(trigger.matchType),
      reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING,
    })
    await recordLinkedActions([source._id, candidate._id], actorId, relationship._id, {
      aiAssisted: false,
      assessmentFailed: true,
    })
    await notifyOverlap(source, candidate, relationship._id)
    return 'failed'
  }
}

export async function assessCaseOverlaps(caseId: string, actorId: string): Promise<AssessSummary> {
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
    const pair = normalizePairKey(String(source._id), String(candidateCase._id))
    try {
      const outcome = await assessOnePair(source, candidateCase, pair, actorId, candidate)
      if (outcome === 'skipped') summary.skipped += 1
      if (outcome === 'created') summary.created += 1
      if (outcome === 'assessed') summary.assessed += 1
      if (outcome === 'failed') summary.failed += 1
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
