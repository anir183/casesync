import {
  ACTION_TYPE,
  CASE_STATUS,
  JEV_ASSESSMENT_STATUS,
  JEV_RELATIONSHIP_CHOICE,
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
import { notifyRecipients, resolveScopedRecipients } from '#/lib/notifications'
import { Bureau } from '#/models/bureau.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseOverlapAssessment } from '#/models/case-overlap-assessment.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import { JevError, interpretAssessment, jevConfig, jevProvider } from '#/services/jev'
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

export interface AssessOptions {
  force?: boolean
  skipUpperSide?: boolean
}

interface CaseDoc extends CaseForAssessment {
  _id: unknown
  institutionId: unknown
  regionId?: unknown
}

type Pair = { caseAId: string; caseBId: string }

interface Candidate {
  case: CaseDoc
  matchType: string
  confidence?: number
}

interface RelationshipLike {
  _id: unknown
  assessmentId?: unknown
}

type AssessmentOutcome = 'assessed' | 'skipped' | 'failed'

interface PairOutcome {
  relationshipCreated: boolean
  assessment: AssessmentOutcome
}

const RELATIONSHIP_CHOICES = new Set<string>(Object.values(JEV_RELATIONSHIP_CHOICE))

const ASSESSMENT_RESULT_FIELDS = {
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

const OVERLAP_OVERSIGHT_ROLES = [
  ROLES.ADMIN,
  ROLES.SENIOR_MANAGEMENT,
  ROLES.COMPETENT_AUTHORITY,
] as const

function isJevConfigured() {
  return jevConfig.enabled && Boolean(jevConfig.apiKey)
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  )
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
    .limit(OVERLAP.FUZZY_INSTITUTION_LIMIT)
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

async function recordCaseActions(
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

async function recordLinkedActions(
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

async function recordUnlinkActions(
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

function buildFallbackReason(matchType: string) {
  const basis =
    matchType === RELATIONSHIP_MATCH_TYPE.INSTITUTION_NAME_FUZZY
      ? OVERLAP.FUZZY_REASON
      : OVERLAP.RULE_BASED_REASON
  return `${OVERLAP.HEADING}. ${basis}`
}

function involvedIds(cases: CaseDoc[], field: 'bureauId' | 'regionId') {
  return [
    ...new Set(
      cases
        .map((item) => item[field])
        .filter((value): value is NonNullable<typeof value> => Boolean(value))
        .map(String),
    ),
  ]
}

async function notifyOverlap(source: CaseDoc, candidate: CaseDoc, relationshipId: unknown) {
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

async function ensureBaseRelationship(
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

async function attachAssessment(relationship: RelationshipLike, assessmentId: unknown) {
  if (String(relationship.assessmentId ?? '') === String(assessmentId)) return
  await CaseRelationship.updateOne({ _id: relationship._id }, { assessmentId })
  relationship.assessmentId = assessmentId
}

async function createAssessment(pair: Pair, status: JevAssessmentStatus) {
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

async function runJevAssessment(
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

async function assessPair(
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

async function assessOnePair(
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
  return { relationshipCreated: created, assessment }
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
