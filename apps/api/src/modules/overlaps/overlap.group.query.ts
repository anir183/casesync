import { MERGE_GROUP_STATUS } from '@casesync/config'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { type ScopeUser, caseScopeFilter, mergeFilters, resolveScope } from '#/lib/scope'
import { CaseMergeGroup } from '#/models/case-merge-group.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { type OverlapDto, buildOverlapDtos } from './overlap.query'

interface MergeGroupLike {
  _id: unknown
  status: string
  canonicalCaseId: unknown
  memberCaseIds: unknown[]
  mergedAt: Date
  mergedBy: string
  confidenceScore?: number
  matchSignals?: Record<string, number>
  snapshot?: { members: MergeGroupDto['snapshot']['members'] }
  revertedAt?: Date
  revertedBy?: string
  revertReason?: string
}

interface MergeGroupDto {
  id: string
  status: string
  canonicalCaseId: string
  memberCaseIds: string[]
  mergedAt: Date
  mergedBy: string
  confidenceScore?: number
  matchSignals?: Record<string, number>
  snapshot: {
    members: Array<{
      caseId: string
      caseNumber: string
      status: string
      category?: string
      bureauId?: string
      bureauName?: string
      regionId?: string
    }>
  }
  revertedAt?: Date
  revertedBy?: string
  revertReason?: string
  overlaps: OverlapDto[]
}

async function mergeGroupScopeFilter(user: ScopeUser): Promise<Record<string, unknown>> {
  const scope = resolveScope(user)
  if (scope.kind === 'all') return {}
  const caseIds = await Case.distinct('_id', mergeFilters({}, await caseScopeFilter(scope)))
  return { memberCaseIds: { $in: caseIds } }
}

function toMergeGroupDto(
  group: MergeGroupLike | null,
  overlaps: OverlapDto[],
): MergeGroupDto | undefined {
  if (!group) return undefined
  return {
    id: String(group._id),
    status: group.status,
    canonicalCaseId: String(group.canonicalCaseId),
    memberCaseIds: group.memberCaseIds.map(String),
    mergedAt: group.mergedAt,
    mergedBy: group.mergedBy,
    confidenceScore: group.confidenceScore,
    matchSignals: group.matchSignals,
    snapshot: group.snapshot ?? { members: [] },
    revertedAt: group.revertedAt,
    revertedBy: group.revertedBy,
    revertReason: group.revertReason,
    overlaps,
  }
}

export async function getMergeGroup(id: string, user: ScopeUser) {
  const scopeFilter = await mergeGroupScopeFilter(user)
  const group = await CaseMergeGroup.findOne(mergeFilters({ _id: id }, scopeFilter)).lean()
  if (!group) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Merge group not found', 'MERGE_GROUP_NOT_FOUND')
  }
  const relationships = await CaseRelationship.find({ mergeGroupId: group._id })
    .sort({ createdAt: 1, _id: 1 })
    .lean()
  const dto = toMergeGroupDto(group, await buildOverlapDtos(relationships))
  if (!dto) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Merge group not found', 'MERGE_GROUP_NOT_FOUND')
  }
  return dto
}

export async function listMergeGroups(user: ScopeUser, status?: string, page?: number | string) {
  const scopeFilter = await mergeGroupScopeFilter(user)
  const filter = mergeFilters(scopeFilter, status ? { status } : {})
  const safePage = Math.max(1, Number(page) || 1)
  const pageSize = 20
  const [groups, total] = await Promise.all([
    CaseMergeGroup.find(filter)
      .sort({ mergedAt: -1, _id: -1 })
      .skip((safePage - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    CaseMergeGroup.countDocuments(filter),
  ])
  const groupIds = groups.map((group) => group._id)
  const relationships = groupIds.length
    ? await CaseRelationship.find({ mergeGroupId: { $in: groupIds } })
        .sort({ createdAt: 1, _id: 1 })
        .lean()
    : []
  const overlapDtos = await buildOverlapDtos(relationships)
  const byGroup = new Map<string, OverlapDto[]>()
  for (const relationship of relationships) {
    const key = String(relationship.mergeGroupId)
    const overlap = overlapDtos.find((item) => item.id === String(relationship._id))
    if (!overlap) continue
    byGroup.set(key, [...(byGroup.get(key) ?? []), overlap])
  }
  return {
    items: groups
      .map((group) => toMergeGroupDto(group, byGroup.get(String(group._id)) ?? []))
      .filter((item): item is MergeGroupDto => Boolean(item)),
    total,
    page: safePage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export { MERGE_GROUP_STATUS }
