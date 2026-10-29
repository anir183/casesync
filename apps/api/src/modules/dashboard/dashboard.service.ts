import { ACTION_TYPE } from '@casesync/config'
import {
  type StatusCounts,
  addToStatusCounts,
  emptyStatusCounts,
  withOpen,
} from '#/lib/case-metrics'
import { parseDateRange } from '#/lib/date-range'
import { type ScopeUser, caseScopeFilter, mergeFilters, resolveScope } from '#/lib/scope'
import { Bureau } from '#/models/bureau.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseAssignment } from '#/models/case-assignment.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import { Region } from '#/models/region.model'

const INSTITUTION_LIMIT = 10
const RECENT_LIMIT = 5

export interface DashboardFilters {
  dateFrom?: string
  dateTo?: string
}

interface CaseSummarySource {
  _id: unknown
  caseNumber: string
  status: string
  institutionId: unknown
  regionId?: unknown
  bureauId?: unknown
  expectedDisposalAt?: Date
}

function idsFor(items: CaseSummarySource[]) {
  return items.map((item) => item._id)
}

export async function getDashboardSummary(filters: DashboardFilters, user: ScopeUser) {
  const now = new Date()
  const scope = resolveScope(user)
  const dateFilter = parseDateRange(filters.dateFrom, filters.dateTo)
  const scoped = mergeFilters(dateFilter, await caseScopeFilter(scope))
  const cases = (await Case.find(scoped, {
    caseNumber: 1,
    status: 1,
    institutionId: 1,
    regionId: 1,
    bureauId: 1,
    expectedDisposalAt: 1,
  }).lean()) as unknown as CaseSummarySource[]

  const caseIds = idsFor(cases)
  const activeAssignmentIds = new Set(
    caseIds.length
      ? (
          await CaseAssignment.distinct('caseId', {
            caseId: { $in: caseIds },
            endedAt: { $exists: false },
          })
        ).map(String)
      : [],
  )

  const totals = emptyStatusCounts()
  const byInstitution = new Map<string, StatusCounts>()
  const byBureau = new Map<string, StatusCounts>()

  for (const item of cases) {
    const source = {
      ...item,
      isUnassigned: !activeAssignmentIds.has(String(item._id)),
    }
    addToStatusCounts(totals, source, now)

    const institutionKey = String(item.institutionId)
    const institutionCounts = byInstitution.get(institutionKey) ?? emptyStatusCounts()
    addToStatusCounts(institutionCounts, source, now)
    byInstitution.set(institutionKey, institutionCounts)

    const bureauKey = item.bureauId ? String(item.bureauId) : 'UNASSIGNED'
    const bureauCounts = byBureau.get(bureauKey) ?? emptyStatusCounts()
    addToStatusCounts(bureauCounts, source, now)
    byBureau.set(bureauKey, bureauCounts)
  }

  const caseIdStrings = caseIds.map(String)
  const [relationships, escalations] = await Promise.all([
    caseIdStrings.length
      ? CaseRelationship.find({
          $or: [{ caseAId: { $in: caseIds } }, { caseBId: { $in: caseIds } }],
        })
          .sort({ createdAt: -1, _id: -1 })
          .limit(RECENT_LIMIT)
          .lean()
      : Promise.resolve([]),
    caseIdStrings.length
      ? CaseAction.find({
          caseId: { $in: caseIds },
          actionType: ACTION_TYPE.ESCALATED,
        })
          .sort({ createdAt: -1, _id: -1 })
          .limit(RECENT_LIMIT)
          .lean()
      : Promise.resolve([]),
  ])

  const caseById = new Map(cases.map((item) => [String(item._id), item]))
  const institutionIds = new Set<string>()
  for (const item of cases) institutionIds.add(String(item.institutionId))
  for (const item of relationships) {
    const caseA = caseById.get(String(item.caseAId))
    const caseB = caseById.get(String(item.caseBId))
    if (caseA) institutionIds.add(String(caseA.institutionId))
    if (caseB) institutionIds.add(String(caseB.institutionId))
  }

  const [institutions, bureaus, regions] = await Promise.all([
    Institution.find(
      { _id: { $in: [...institutionIds] } },
      { name: 1, aictePermanentId: 1, regionId: 1 },
    ).lean(),
    Bureau.find({}, { name: 1, code: 1 }).lean(),
    Region.find({}, { name: 1, code: 1 }).lean(),
  ])
  const institutionById = new Map(institutions.map((item) => [String(item._id), item]))
  const regionById = new Map(regions.map((item) => [String(item._id), item]))
  const byRegion = new Map<string, StatusCounts>()

  for (const item of cases) {
    const institution = institutionById.get(String(item.institutionId))
    const regionKey = item.regionId
      ? String(item.regionId)
      : institution?.regionId
        ? String(institution.regionId)
        : 'UNASSIGNED'
    const regionCounts = byRegion.get(regionKey) ?? emptyStatusCounts()
    addToStatusCounts(
      regionCounts,
      { ...item, isUnassigned: !activeAssignmentIds.has(String(item._id)) },
      now,
    )
    byRegion.set(regionKey, regionCounts)
  }

  const institutionWise = [...byInstitution.entries()]
    .map(([id, counts]) => ({
      institutionId: id,
      institutionName: institutionById.get(id)?.name ?? 'Unknown institution',
      ...withOpen(counts),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, INSTITUTION_LIMIT)

  const bureauWise = [
    ...bureaus.map((item) => ({
      bureauId: String(item._id),
      bureauName: item.name,
      bureauCode: item.code,
      ...withOpen(byBureau.get(String(item._id)) ?? emptyStatusCounts()),
    })),
    ...(byBureau.has('UNASSIGNED')
      ? [
          {
            bureauId: 'UNASSIGNED',
            bureauName: 'Unassigned',
            bureauCode: '—',
            ...withOpen(byBureau.get('UNASSIGNED') ?? emptyStatusCounts()),
          },
        ]
      : []),
  ].sort((a, b) => b.total - a.total)

  const regionWise = [...byRegion.entries()]
    .map(([id, counts]) => {
      const region = regionById.get(id)
      return {
        regionId: id,
        regionName: region?.name ?? 'Unassigned',
        regionCode: region?.code ?? '—',
        ...withOpen(counts),
      }
    })
    .sort((a, b) => b.total - a.total)

  const recentOverlaps = relationships.map((item) => {
    const caseA = caseById.get(String(item.caseAId))
    const caseB = caseById.get(String(item.caseBId))
    return {
      id: String(item._id),
      matchType: item.matchType,
      reviewStatus: item.reviewStatus,
      createdAt: item.createdAt,
      institutionName: caseA
        ? (institutionById.get(String(caseA.institutionId))?.name ?? 'Unknown institution')
        : 'Unknown institution',
      caseNumbers: [caseA?.caseNumber, caseB?.caseNumber].filter(Boolean),
    }
  })

  const recentEscalations = escalations.flatMap((item) => {
    const relatedCase = caseById.get(String(item.caseId))
    if (!relatedCase) return []
    return [
      {
        id: String(item._id),
        caseId: String(relatedCase._id),
        caseNumber: relatedCase.caseNumber,
        remarks: item.remarks,
        createdAt: item.createdAt,
      },
    ]
  })

  return {
    generatedAt: now.toISOString(),
    ...totals,
    open: totals.total - totals.disposed,
    institutionWise,
    bureauWise,
    regionWise,
    recentOverlaps,
    recentEscalations,
  }
}
