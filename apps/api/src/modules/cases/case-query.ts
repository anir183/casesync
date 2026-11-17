// Case query, list shaping, export, and detail composition. No writes live here.

import { RELATIONSHIP_REVIEW_STATUS } from '@casesync/config'
import { toCsv } from '#/lib/csv'
import { parseDateBound } from '#/lib/date-range'
import { type Page, buildPage, parseSort, resolvePageQuery } from '#/lib/pagination'
import {
  type ScopeUser,
  caseRegionFilter,
  caseScopeFilter,
  mergeFilters,
  resolveScope,
} from '#/lib/scope'
import { loadUserMap } from '#/lib/user-directory'
import { Bureau } from '#/models/bureau.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseAssignment } from '#/models/case-assignment.model'
import { CaseMergeGroup } from '#/models/case-merge-group.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import { Region } from '#/models/region.model'
import type { CaseDto, CaseFilters, CaseListQuery } from './case-shared'
import { escapeRegex, loadCaseNameMaps, requireCase, toCaseDto, withNames } from './case-shared'

const INTERNAL_LIST_LIMIT = 200
const CASE_EXPORT_LIMIT = 10_000
const CASE_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'receivedAt',
  'lastActionAt',
  'expectedDisposalAt',
  'nextActionDueAt',
  'caseNumber',
  'status',
] as const

async function loadBureauNames(ids: unknown[]): Promise<Map<string, string>> {
  const valid = [...new Set(ids.filter(Boolean).map((id) => String(id)))]
  if (valid.length === 0) return new Map()
  const bureaus = await Bureau.find({ _id: { $in: valid } }, { name: 1 }).lean()
  return new Map(bureaus.map((bureau) => [String(bureau._id), bureau.name]))
}

async function enrichActions<
  T extends {
    actorId?: string
    officerFromId?: string
    officerToId?: string
    bureauFromId?: unknown
    bureauToId?: unknown
  },
>(actions: T[]) {
  const [userById, bureauNames] = await Promise.all([
    loadUserMap(
      actions.flatMap((action) => [action.actorId, action.officerFromId, action.officerToId]),
    ),
    loadBureauNames(actions.flatMap((action) => [action.bureauFromId, action.bureauToId])),
  ])
  return actions.map((action) => ({
    ...action,
    actorName: action.actorId ? userById.get(action.actorId)?.name : undefined,
    officerFromName: action.officerFromId ? userById.get(action.officerFromId)?.name : undefined,
    officerToName: action.officerToId ? userById.get(action.officerToId)?.name : undefined,
    bureauFromName: action.bureauFromId ? bureauNames.get(String(action.bureauFromId)) : undefined,
    bureauToName: action.bureauToId ? bureauNames.get(String(action.bureauToId)) : undefined,
  }))
}

async function enrichAssignments<
  T extends { officerId?: string; assignedBy?: string; bureauId?: unknown },
>(assignments: T[]) {
  const [userById, bureauNames] = await Promise.all([
    loadUserMap(assignments.flatMap((assignment) => [assignment.officerId, assignment.assignedBy])),
    loadBureauNames(assignments.map((assignment) => assignment.bureauId)),
  ])
  return assignments.map((assignment) => ({
    ...assignment,
    officerName: assignment.officerId ? userById.get(assignment.officerId)?.name : undefined,
    assignedByName: assignment.assignedBy ? userById.get(assignment.assignedBy)?.name : undefined,
    bureauName: assignment.bureauId ? bureauNames.get(String(assignment.bureauId)) : undefined,
  }))
}

async function buildCaseScopedFilter(query: CaseFilters, user: ScopeUser) {
  const filter: Record<string, unknown> = {}
  if (query.institutionId) filter.institutionId = query.institutionId
  if (query.bureauId) filter.bureauId = query.bureauId
  if (query.status) filter.status = query.status
  if (query.category) filter.category = query.category
  if (query.source) filter.source = query.source
  if (query.priority) filter.priority = query.priority

  if (query.q) {
    const pattern = { $regex: escapeRegex(query.q), $options: 'i' }
    const institutions = await Institution.find(
      { $or: [{ nameNormalized: pattern }, { aictePermanentId: pattern }] },
      { _id: 1 },
    )
      .limit(INTERNAL_LIST_LIMIT)
      .lean()
    filter.$or = [
      { caseNumber: pattern },
      { subject: pattern },
      { complainantEmail: pattern },
      { institutionId: { $in: institutions.map((item) => item._id) } },
    ]
  }

  const dateFrom = parseDateBound(query.dateFrom)
  const dateTo = parseDateBound(query.dateTo, true)
  if (dateFrom || dateTo) {
    filter.receivedAt = {
      ...(dateFrom ? { $gte: dateFrom } : {}),
      ...(dateTo ? { $lte: dateTo } : {}),
    }
  }

  const scope = resolveScope(user)
  const regionFilter = query.regionId ? await caseRegionFilter(query.regionId) : {}
  return mergeFilters(mergeFilters(filter, regionFilter), await caseScopeFilter(scope))
}

export async function listCases(query: CaseListQuery, user: ScopeUser): Promise<Page<CaseDto>> {
  const paging = resolvePageQuery(query)
  const scoped = await buildCaseScopedFilter(query, user)
  const sort = parseSort(query.sort, CASE_SORT_FIELDS, 'createdAt')
  const [items, total] = await Promise.all([
    Case.find(scoped).sort(sort).skip(paging.skip).limit(paging.limit).lean(),
    Case.countDocuments(scoped),
  ])
  const maps = await loadCaseNameMaps(items)
  return buildPage(
    items.map((item) => withNames(item, maps)),
    total,
    paging,
  )
}

export async function exportCasesCsv(query: CaseListQuery, user: ScopeUser) {
  const scoped = await buildCaseScopedFilter(query, user)
  const sort = parseSort(query.sort, CASE_SORT_FIELDS, 'createdAt')
  const items = await Case.find(scoped)
    .sort(sort)
    .limit(CASE_EXPORT_LIMIT + 1)
    .lean()
  const truncated = items.length > CASE_EXPORT_LIMIT
  const limited = truncated ? items.slice(0, CASE_EXPORT_LIMIT) : items
  const maps = await loadCaseNameMaps(limited)
  const rows: Array<Array<string | number>> = [
    [
      'Case ID',
      'Institution',
      'Region',
      'Bureau/Cell',
      'Category',
      'Status',
      'Received at',
      'Expected disposal at',
      'Next action',
      'Next action due at',
      'Officer',
      'Last action at',
    ],
  ]
  for (const item of limited) {
    const dto = withNames(item, maps)
    rows.push([
      dto.caseNumber,
      dto.institutionName ?? '',
      dto.regionName ?? '',
      dto.bureauName ?? '',
      dto.category ?? '',
      dto.status,
      dto.receivedAt.toISOString(),
      dto.expectedDisposalAt?.toISOString() ?? '',
      dto.nextAction ?? '',
      dto.nextActionDueAt?.toISOString() ?? '',
      dto.officerName ?? '',
      dto.lastActionAt?.toISOString() ?? '',
    ])
  }
  return { csv: toCsv(rows), count: limited.length, truncated }
}

export async function getCase(caseId: string, user: ScopeUser): Promise<CaseDto> {
  const item = await requireCase(caseId, user)
  const plain = item.toObject()
  return withNames(plain, await loadCaseNameMaps([plain]))
}

export async function getCaseDetail(caseId: string, user: ScopeUser) {
  const item = await requireCase(caseId, user)
  const [institution, bureau, region, rawAssignments, rawActions, relationships] =
    await Promise.all([
      Institution.findById(item.institutionId).lean(),
      item.bureauId ? Bureau.findById(item.bureauId).lean() : Promise.resolve(null),
      item.regionId ? Region.findById(item.regionId).lean() : Promise.resolve(null),
      CaseAssignment.find({ caseId: item._id }).sort({ assignedAt: 1, _id: 1 }).lean(),
      CaseAction.find({ caseId: item._id }).sort({ createdAt: 1, _id: 1 }).lean(),
      CaseRelationship.find({
        $or: [{ caseAId: item._id }, { caseBId: item._id }],
        reviewStatus: RELATIONSHIP_REVIEW_STATUS.CONFIRMED,
      }).lean(),
    ])
  const mergeGroupIds = [
    ...new Set(
      relationships
        .map((rel) => (rel.mergeGroupId ? String(rel.mergeGroupId) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const mergeGroups = mergeGroupIds.length
    ? await CaseMergeGroup.find({ _id: { $in: mergeGroupIds } }).lean()
    : []
  const mergeGroupById = new Map(mergeGroups.map((group) => [String(group._id), group]))
  const [assignments, actions] = await Promise.all([
    enrichAssignments(rawAssignments),
    enrichActions(rawActions),
  ])
  const currentAssignment = assignments.find((assignment) => !assignment.endedAt)

  return {
    ...toCaseDto(item.toObject()),
    institutionName: institution?.name,
    bureauName: bureau?.name,
    regionName: region?.name,
    officerId: currentAssignment?.officerId,
    officerName: currentAssignment?.officerName,
    institution: institution
      ? {
          id: String(institution._id),
          name: institution.name,
          aictePermanentId: institution.aictePermanentId,
          regionId: institution.regionId ? String(institution.regionId) : undefined,
        }
      : undefined,
    bureau: bureau ? { id: String(bureau._id), name: bureau.name, code: bureau.code } : undefined,
    region: region ? { id: String(region._id), name: region.name, code: region.code } : undefined,
    currentAssignment,
    assignments,
    actions,
    mergeGroup: mergeGroups[0]
      ? {
          id: String(mergeGroups[0]._id),
          status: mergeGroups[0].status,
          canonicalCaseId: String(mergeGroups[0].canonicalCaseId),
          memberCaseIds: mergeGroups[0].memberCaseIds.map(String),
          mergedAt: mergeGroups[0].mergedAt,
          snapshot: mergeGroups[0].snapshot,
        }
      : undefined,
    relatedCases: relationships.map((rel) => {
      const group = rel.mergeGroupId ? mergeGroupById.get(String(rel.mergeGroupId)) : undefined
      return {
        relationshipId: String(rel._id),
        caseId:
          String(rel.caseAId) === String(item._id) ? String(rel.caseBId) : String(rel.caseAId),
        matchType: rel.matchType,
        reason: rel.reason,
        reviewStatus: rel.reviewStatus,
        mergeStatus: rel.mergeStatus,
        mergeGroupId: rel.mergeGroupId ? String(rel.mergeGroupId) : undefined,
        mergeGroupStatus: group?.status,
        reMergeSuppressed: Boolean(rel.reMergeSuppressed),
      }
    }),
  }
}

export async function listCaseActions(caseId: string, user: ScopeUser) {
  await requireCase(caseId, user)
  const actions = await CaseAction.find({ caseId }).sort({ createdAt: 1, _id: 1 }).lean()
  return enrichActions(actions)
}

export async function listCaseAssignments(caseId: string, user: ScopeUser) {
  await requireCase(caseId, user)
  const assignments = await CaseAssignment.find({ caseId }).sort({ assignedAt: 1, _id: 1 }).lean()
  return enrichAssignments(assignments)
}

export async function listRelatedCases(caseId: string, user: ScopeUser) {
  await requireCase(caseId, user)
  const relationships = await CaseRelationship.find({
    $or: [{ caseAId: caseId }, { caseBId: caseId }],
    reviewStatus: { $ne: RELATIONSHIP_REVIEW_STATUS.DISMISSED },
  }).lean()

  const relatedIds = relationships.map((rel) =>
    String(rel.caseAId) === caseId ? rel.caseBId : rel.caseAId,
  )
  const related = await Case.find({ _id: { $in: relatedIds } }).lean()
  const maps = await loadCaseNameMaps(related)
  const byId = new Map(related.map((item) => [String(item._id), item]))

  return relationships.map((rel) => ({
    relationshipId: String(rel._id),
    matchType: rel.matchType,
    confidence: rel.confidence,
    reason: rel.reason,
    reviewStatus: rel.reviewStatus,
    case: (() => {
      const relatedCase = byId.get(
        String(rel.caseAId) === caseId ? String(rel.caseBId) : String(rel.caseAId),
      )
      return relatedCase ? withNames(relatedCase, maps) : undefined
    })(),
  }))
}
