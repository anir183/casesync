import { PAGINATION, RELATIONSHIP_REVIEW_STATUS } from '@casesync/config'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { buildPage, resolvePageQuery } from '#/lib/pagination'
import { type ScopeUser, caseScopeFilter, mergeFilters, resolveScope } from '#/lib/scope'
import { Bureau } from '#/models/bureau.model'
import { CaseOverlapAssessment } from '#/models/case-overlap-assessment.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'

interface OverlapDto {
  id: string
  matchType: string
  confidence?: number
  reason?: string
  reviewStatus: string
  reviewedAt?: Date
  reviewNotes?: string
  createdAt: Date
  institution?: {
    id: string
    name: string
    aictePermanentId?: string
    regionId?: string
  }
  assessment?: {
    id: string
    status: string
    relationshipChoice?: string
    coordinationReviewNoul?: number
    confidence?: number
    probabilities?: Record<string, number>
    rationale?: string
    modelVersion?: string
    latencyMs?: number
    errorMessage?: string
    assessedAt?: Date
  }
  cases: Array<{
    id: string
    caseNumber: string
    status: string
    category?: string
    description?: string
    bureauName?: string
    receivedAt?: Date
    expectedDisposalAt?: Date
    nextAction?: string
  }>
}

export interface OverlapFilters {
  status?: string
  bureauId?: string
  regionId?: string
  matchType?: string
  institutionId?: string
  page?: number | string
  pageSize?: number | string
}

interface RelationshipLike {
  _id: unknown
  caseAId: unknown
  caseBId: unknown
  assessmentId?: unknown
  matchType: string
  confidence?: number
  reason?: string
  reviewStatus: string
  reviewedAt?: Date
  reviewNotes?: string
  createdAt: Date
}

interface CaseLike {
  _id: unknown
  institutionId: unknown
  bureauId?: unknown
  caseNumber: string
  status: string
  category?: string
  description?: string
  receivedAt?: Date
  expectedDisposalAt?: Date
  nextAction?: string
}

interface InstitutionLike {
  _id: unknown
  name: string
  aictePermanentId?: string
  regionId?: unknown
}

interface BureauLike {
  _id: unknown
  name: string
}

interface AssessmentLike {
  _id: unknown
  status: string
  relationshipChoice?: string
  coordinationReviewNoul?: number
  confidence?: number
  probabilities?: Record<string, number>
  rationale?: string
  modelVersion?: string
  latencyMs?: number
  errorMessage?: string
  assessedAt?: Date
}

async function buildOverlapDtos(relationships: RelationshipLike[]): Promise<OverlapDto[]> {
  const caseIds = relationships.flatMap((rel) => [rel.caseAId, rel.caseBId])
  const assessmentIds = relationships
    .map((rel) => rel.assessmentId)
    .filter((id): id is NonNullable<typeof id> => !!id)

  const [cases, assessments] = await Promise.all([
    Case.find({ _id: { $in: caseIds } }).lean(),
    assessmentIds.length
      ? CaseOverlapAssessment.find({ _id: { $in: assessmentIds } }).lean()
      : Promise.resolve([]),
  ])

  const institutionIds = [...new Set(cases.map((c) => String(c.institutionId)))]
  const bureauIds = [
    ...new Set(
      cases.map((c) => (c.bureauId ? String(c.bureauId) : null)).filter((id): id is string => !!id),
    ),
  ]
  const [institutions, bureaus] = await Promise.all([
    Institution.find({ _id: { $in: institutionIds } }).lean(),
    bureausOrEmpty(bureauIds),
  ])

  const caseById = new Map(cases.map((c) => [String(c._id), c]))
  const institutionById = new Map(institutions.map((i) => [String(i._id), i]))
  const bureauById = new Map(bureaus.map((b) => [String(b._id), b]))
  const assessmentById = new Map(assessments.map((a) => [String(a._id), a]))

  return relationships.map((rel) => {
    const caseA = caseById.get(String(rel.caseAId))
    const caseB = caseById.get(String(rel.caseBId))
    const institution = caseA ? institutionById.get(String(caseA.institutionId)) : undefined
    const assessment = rel.assessmentId ? assessmentById.get(String(rel.assessmentId)) : undefined

    return {
      id: String(rel._id),
      matchType: rel.matchType,
      confidence: rel.confidence,
      reason: rel.reason,
      reviewStatus: rel.reviewStatus,
      reviewedAt: rel.reviewedAt,
      reviewNotes: rel.reviewNotes,
      createdAt: rel.createdAt,
      institution: institution
        ? {
            id: String(institution._id),
            name: institution.name,
            aictePermanentId: institution.aictePermanentId,
            regionId: institution.regionId ? String(institution.regionId) : undefined,
          }
        : undefined,
      assessment: assessment
        ? {
            id: String(assessment._id),
            status: assessment.status,
            relationshipChoice: assessment.relationshipChoice,
            coordinationReviewNoul: assessment.coordinationReviewNoul,
            confidence: assessment.confidence,
            probabilities: assessment.probabilities,
            rationale: assessment.rationale,
            modelVersion: assessment.modelVersion,
            latencyMs: assessment.latencyMs,
            errorMessage: assessment.errorMessage,
            assessedAt: assessment.assessedAt,
          }
        : undefined,
      cases: [caseA, caseB].flatMap((c) => (c ? [toCaseDto(c, bureauById)] : [])),
    }
  })
}

function bureausOrEmpty(ids: string[]): Promise<BureauLike[]> {
  if (!ids.length) return Promise.resolve([])
  return Bureau.find({ _id: { $in: ids } }).lean()
}

function toCaseDto(c: CaseLike, bureauById: Map<string, BureauLike>) {
  return {
    id: String(c._id),
    caseNumber: c.caseNumber,
    status: c.status,
    category: c.category,
    description: c.description,
    bureauName: c.bureauId ? bureauById.get(String(c.bureauId))?.name : undefined,
    receivedAt: c.receivedAt,
    expectedDisposalAt: c.expectedDisposalAt,
    nextAction: c.nextAction,
  }
}

function caseFilterFor(filters: OverlapFilters): Record<string, unknown> {
  const filter: Record<string, unknown> = {}
  if (filters.bureauId) filter.bureauId = filters.bureauId
  if (filters.regionId) filter.regionId = filters.regionId
  if (filters.institutionId) filter.institutionId = filters.institutionId
  return filter
}

async function relationshipScopeFilter(
  user: ScopeUser,
  filters: OverlapFilters = {},
): Promise<Record<string, unknown>> {
  const scope = resolveScope(user)
  const caseFilter = caseFilterFor(filters)
  if (scope.kind === 'all' && Object.keys(caseFilter).length === 0) return {}

  const scopedCaseIds = await Case.distinct(
    '_id',
    mergeFilters(caseFilter, await caseScopeFilter(scope)),
  )
  return {
    $or: [{ caseAId: { $in: scopedCaseIds } }, { caseBId: { $in: scopedCaseIds } }],
  }
}

export async function listOverlaps(user: ScopeUser, filters: OverlapFilters = {}) {
  const paging = resolvePageQuery(filters)
  const baseFilter: Record<string, unknown> = {
    reviewStatus: filters.status ?? RELATIONSHIP_REVIEW_STATUS.PENDING,
  }
  if (filters.matchType) baseFilter.matchType = filters.matchType

  const filter = mergeFilters(baseFilter, await relationshipScopeFilter(user, filters))
  const [relationships, total] = await Promise.all([
    CaseRelationship.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(paging.skip)
      .limit(Math.min(paging.limit, PAGINATION.MAX_PAGE_SIZE))
      .lean(),
    CaseRelationship.countDocuments(filter),
  ])

  return buildPage(await buildOverlapDtos(relationships), total, paging)
}

export async function getOverlap(id: string, user: ScopeUser): Promise<OverlapDto> {
  const relationship = await requireScopedRelationship(id, user)
  const [dto] = await buildOverlapDtos([relationship])
  return dto
}

export async function requireScopedRelationship(id: string, user: ScopeUser) {
  const scopeFilter = await relationshipScopeFilter(user)
  const relationship = await CaseRelationship.findOne(mergeFilters({ _id: id }, scopeFilter)).lean()
  if (!relationship) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Overlap not found', 'OVERLAP_NOT_FOUND')
  }
  return relationship
}

export type { OverlapDto }
