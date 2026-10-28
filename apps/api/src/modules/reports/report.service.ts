import { ACTION_TYPE, CASE_STATUS, RELATIONSHIP_REVIEW_STATUS } from '@casesync/config'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { type ScopeUser, caseScopeFilter, mergeFilters, resolveScope } from '#/lib/scope'
import { Bureau } from '#/models/bureau.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseOverlapAssessment } from '#/models/case-overlap-assessment.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'

const TOP_LIMIT = 10
const MONTHS_BACK = 6
const MS_PER_DAY = 24 * 60 * 60 * 1000
const UNASSIGNED = 'Unassigned'
const UNCATEGORIZED = 'Uncategorized'

const AGE_BUCKETS: ReadonlyArray<{ label: string; days: number }> = [
  { label: '0-7 days', days: 7 },
  { label: '8-30 days', days: 30 },
  { label: '31-60 days', days: 60 },
  { label: '61-90 days', days: 90 },
  { label: '90+ days', days: Number.POSITIVE_INFINITY },
]

export interface ReportFilters {
  dateFrom?: string
  dateTo?: string
}

interface ReportCase {
  _id: unknown
  status: string
  category?: string
  institutionId: unknown
  bureauId?: unknown
  receivedAt: Date
}

interface GroupCounts {
  total: number
  disposed: number
}

function parseDate(value?: string) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid date supplied', 'INVALID_DATE')
  }
  return date
}

export function bucketForAge(days: number): string {
  const bucket = AGE_BUCKETS.find((item) => days <= item.days)
  return bucket ? bucket.label : AGE_BUCKETS[AGE_BUCKETS.length - 1].label
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function recentMonths(count: number) {
  const now = new Date()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index), 1),
    )
    return monthKey(date)
  })
}

function accumulate<T extends GroupCounts>(map: Map<string, T>, key: string, item: ReportCase) {
  const current = map.get(key) ?? ({ total: 0, disposed: 0 } as T)
  current.total += 1
  if (item.status === CASE_STATUS.DISPOSED) current.disposed += 1
  map.set(key, current)
}

function buildCounts(cases: ReportCase[]) {
  const byStatus = new Map<string, number>()
  const byCategory = new Map<string, number>()
  const byBureau = new Map<string, GroupCounts>()
  const byInstitution = new Map<string, GroupCounts>()

  for (const item of cases) {
    byStatus.set(item.status, (byStatus.get(item.status) ?? 0) + 1)
    byCategory.set(
      item.category || UNCATEGORIZED,
      (byCategory.get(item.category || UNCATEGORIZED) ?? 0) + 1,
    )
    accumulate(byBureau, item.bureauId ? String(item.bureauId) : UNASSIGNED, item)
    accumulate(byInstitution, String(item.institutionId), item)
  }

  return { byStatus, byCategory, byBureau, byInstitution }
}

function toSortedEntries(map: Map<string, number>) {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}

async function buildGroupRows(
  groups: Map<string, GroupCounts>,
  labelById: Map<string, string>,
  idField: string,
) {
  return [...groups.entries()]
    .map(([id, counts]) => ({
      [idField]: id,
      name: labelById.get(id) ?? (id === UNASSIGNED ? UNASSIGNED : 'Unknown'),
      ...counts,
      open: counts.total - counts.disposed,
    }))
    .sort((a, b) => b.total - a.total)
}

function buildAgeBuckets(cases: ReportCase[]) {
  const now = Date.now()
  const buckets = new Map(AGE_BUCKETS.map((item) => [item.label, 0]))
  for (const item of cases) {
    if (item.status === CASE_STATUS.DISPOSED) continue
    const ageDays = Math.floor((now - item.receivedAt.getTime()) / MS_PER_DAY)
    const label = bucketForAge(ageDays)
    buckets.set(label, (buckets.get(label) ?? 0) + 1)
  }
  return AGE_BUCKETS.map((item) => ({ label: item.label, count: buckets.get(item.label) ?? 0 }))
}

async function buildOverlapReport(
  from: Date | undefined,
  to: Date | undefined,
  scopedCaseIds?: unknown[],
) {
  const filter: Record<string, unknown> = {}
  if (from || to) {
    filter.createdAt = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    }
  }
  if (scopedCaseIds) {
    filter.$or = [{ caseAId: { $in: scopedCaseIds } }, { caseBId: { $in: scopedCaseIds } }]
  }
  const [relationships, assessments] = await Promise.all([
    CaseRelationship.find(filter, { reviewStatus: 1, matchType: 1 }).lean(),
    CaseOverlapAssessment.countDocuments(filter),
  ])

  const byReview = new Map<string, number>(
    Object.values(RELATIONSHIP_REVIEW_STATUS).map((status) => [status, 0]),
  )
  const byMatchType = new Map<string, number>()
  for (const item of relationships) {
    byReview.set(item.reviewStatus, (byReview.get(item.reviewStatus) ?? 0) + 1)
    byMatchType.set(item.matchType, (byMatchType.get(item.matchType) ?? 0) + 1)
  }

  return {
    assessments,
    total: relationships.length,
    pending: byReview.get(RELATIONSHIP_REVIEW_STATUS.PENDING) ?? 0,
    confirmed: byReview.get(RELATIONSHIP_REVIEW_STATUS.CONFIRMED) ?? 0,
    dismissed: byReview.get(RELATIONSHIP_REVIEW_STATUS.DISMISSED) ?? 0,
    byMatchType: toSortedEntries(byMatchType).map(({ key, count }) => ({
      matchType: key,
      count,
    })),
  }
}

async function buildMonthly(cases: ReportCase[], months: string[]) {
  const start = new Date(`${months[0]}-01T00:00:00.000Z`)
  const caseIds = cases.map((item) => item._id)
  const disposedActions = await CaseAction.find(
    { actionType: ACTION_TYPE.DISPOSED, createdAt: { $gte: start }, caseId: { $in: caseIds } },
    { createdAt: 1 },
  ).lean()

  const received = new Map(months.map((month) => [month, 0]))
  for (const item of cases) {
    const key = monthKey(item.receivedAt)
    if (received.has(key)) received.set(key, (received.get(key) ?? 0) + 1)
  }

  const disposed = new Map(months.map((month) => [month, 0]))
  for (const action of disposedActions) {
    const key = monthKey(action.createdAt)
    if (disposed.has(key)) disposed.set(key, (disposed.get(key) ?? 0) + 1)
  }

  return months.map((month) => ({
    month,
    received: received.get(month) ?? 0,
    disposed: disposed.get(month) ?? 0,
  }))
}

export async function getReportsSummary(filters: ReportFilters, user: ScopeUser) {
  const from = parseDate(filters.dateFrom)
  const to = parseDate(filters.dateTo)
  const dateFilter: Record<string, unknown> = {}
  if (from || to) {
    dateFilter.receivedAt = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    }
  }
  const scope = resolveScope(user)
  const caseFilter = mergeFilters(dateFilter, await caseScopeFilter(scope))

  const cases = (await Case.find(caseFilter, {
    status: 1,
    category: 1,
    institutionId: 1,
    bureauId: 1,
    receivedAt: 1,
  }).lean()) as unknown as ReportCase[]

  const scopedCaseIds = scope.kind === 'all' ? undefined : cases.map((item) => item._id)

  const [institutions, bureaus] = await Promise.all([
    Institution.find({}, { name: 1, regionId: 1 }).lean(),
    Bureau.find({}, { name: 1 }).lean(),
  ])
  const institutionById = new Map(institutions.map((item) => [String(item._id), item]))
  const bureauById = new Map(bureaus.map((item) => [String(item._id), item.name]))
  const regionById = new Map(
    institutions
      .filter((item) => item.regionId)
      .map((item) => [String(item.regionId), String(item.regionId)]),
  )

  const { byStatus, byCategory, byBureau, byInstitution } = buildCounts(cases)
  const regionGroups = new Map<string, GroupCounts>()
  for (const item of cases) {
    const institution = institutionById.get(String(item.institutionId))
    const regionId = institution?.regionId ? String(institution.regionId) : UNASSIGNED
    accumulate(regionGroups, regionId, item)
  }

  const total = cases.length
  const disposed = byStatus.get(CASE_STATUS.DISPOSED) ?? 0
  const institutionNames = new Map(
    [...institutionById.entries()].map(([id, item]) => [id, item.name]),
  )

  const [byBureauRows, byInstitutionRows, byRegionRows, overlaps, monthly] = await Promise.all([
    buildGroupRows(byBureau, bureauById, 'bureauId'),
    buildGroupRows(byInstitution, institutionNames, 'institutionId'),
    buildGroupRows(regionGroups, regionById, 'regionId'),
    buildOverlapReport(from, to, scopedCaseIds),
    buildMonthly(cases, recentMonths(MONTHS_BACK)),
  ])

  return {
    range: {
      from: from?.toISOString(),
      to: to?.toISOString(),
    },
    totals: {
      total,
      open: total - disposed,
      disposed,
      disposalRate: total === 0 ? 0 : Math.round((disposed / total) * 100),
    },
    byStatus: toSortedEntries(byStatus).map(({ key, count }) => ({ status: key, count })),
    byCategory: toSortedEntries(byCategory)
      .slice(0, TOP_LIMIT)
      .map(({ key, count }) => ({ category: key, count })),
    byBureau: byBureauRows,
    byInstitution: byInstitutionRows.slice(0, TOP_LIMIT),
    byRegion: byRegionRows,
    ageBuckets: buildAgeBuckets(cases),
    overlaps,
    monthly,
  }
}
