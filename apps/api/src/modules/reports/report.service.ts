import {
  ACTION_TYPE,
  CASE_STATUS,
  OVERLAP_MERGE_STATUS,
  RELATIONSHIP_REVIEW_STATUS,
} from '@casesync/config'
import { isBeyondTimeline } from '#/lib/case-metrics'
import { parseRange } from '#/lib/date-range'
import {
  type Scope,
  type ScopeUser,
  caseRegionFilter,
  caseScopeFilter,
  mergeFilters,
  resolveScope,
} from '#/lib/scope'
import { Bureau } from '#/models/bureau.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseOverlapAssessment } from '#/models/case-overlap-assessment.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import { Region } from '#/models/region.model'

const TOP_LIMIT = 10
const MONTHS_BACK = 6
const QUARTERS_BACK = 8
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
  bureauId?: string
  regionId?: string
  status?: string
  category?: string
}

interface ReportCase {
  _id: unknown
  status: string
  category?: string
  institutionId: unknown
  regionId?: unknown
  bureauId?: unknown
  receivedAt: Date
  expectedDisposalAt?: Date
}

interface GroupCounts {
  total: number
  disposed: number
}

export interface ReportGroupRow {
  name: string
  total: number
  open: number
  disposed: number
}

export interface ReportsGeoSummary {
  generatedAt: string
  regions: GeoRegionRow[]
}

export interface GeoRegionRow {
  regionId: string
  code: string
  name: string
  latitude: number
  longitude: number
  total: number
  open: number
  disposed: number
  overdue: number
  resolutionRate: number
  overdueRate: number
}

export interface GeoRegionSource {
  regionId: string
  code: string
  name: string
  latitude?: number
  longitude?: number
}

export interface GeoCaseSource {
  status: string
  regionId?: string
  institutionRegionId?: string
  expectedDisposalAt?: Date
}

export function aggregateRegionGeo(
  regions: GeoRegionSource[],
  cases: GeoCaseSource[],
  now: Date,
): GeoRegionRow[] {
  const counts = new Map<string, { total: number; disposed: number; overdue: number }>()
  for (const item of regions) {
    counts.set(item.regionId, { total: 0, disposed: 0, overdue: 0 })
  }
  for (const item of cases) {
    const regionId = item.regionId ?? item.institutionRegionId
    if (!regionId) continue
    const current = counts.get(regionId)
    if (!current) continue
    current.total += 1
    if (item.status === CASE_STATUS.DISPOSED) current.disposed += 1
    if (isBeyondTimeline(item, now)) current.overdue += 1
  }
  return regions
    .filter(
      (item): item is GeoRegionSource & { latitude: number; longitude: number } =>
        typeof item.latitude === 'number' && typeof item.longitude === 'number',
    )
    .map((item) => {
      const current = counts.get(item.regionId) ?? { total: 0, disposed: 0, overdue: 0 }
      return {
        regionId: item.regionId,
        code: item.code,
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        total: current.total,
        open: current.total - current.disposed,
        disposed: current.disposed,
        overdue: current.overdue,
        resolutionRate:
          current.total === 0 ? 0 : Math.round((current.disposed / current.total) * 100),
        overdueRate: current.total === 0 ? 0 : Math.round((current.overdue / current.total) * 100),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export interface ReportsSummary {
  generatedAt: string
  range: { from?: string; to?: string }
  totals: {
    total: number
    open: number
    disposed: number
    reopened: number
    beyondTimelines: number
    disposalRate: number
  }
  byStatus: Array<{ status: string; count: number }>
  byCategory: Array<{ category: string; count: number }>
  byBureau: Array<ReportGroupRow & { bureauId: string }>
  byInstitution: Array<ReportGroupRow & { institutionId: string }>
  byRegion: Array<ReportGroupRow & { regionId: string }>
  ageBuckets: Array<{ label: string; count: number }>
  overlaps: {
    assessments: number
    total: number
    pending: number
    confirmed: number
    dismissed: number
    autoMerged: number
    manuallyMerged: number
    manualReview: number
    reverted: number
    averageReviewHours: number
    byMatchType: Array<{ matchType: string; count: number }>
  }
  monthly: Array<{ month: string; received: number; disposed: number }>
  quarterly: Array<{ quarter: string; received: number; disposed: number }>
}

export function bucketForAge(days: number): string {
  const bucket = AGE_BUCKETS.find((item) => days <= item.days)
  return bucket ? bucket.label : AGE_BUCKETS[AGE_BUCKETS.length - 1].label
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function quarterKey(date: Date) {
  return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`
}

function monthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function quarterStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1))
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
}

function monthSeries(from: Date | undefined, to: Date | undefined) {
  const end = to ?? new Date()
  const start = monthStart(from ?? addMonths(end, -(MONTHS_BACK - 1)))
  const months: string[] = []
  for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 1)) {
    months.push(monthKey(cursor))
  }
  return { months, start }
}

function quarterSeries(from: Date | undefined, to: Date | undefined) {
  const end = to ?? new Date()
  const start = quarterStart(from ?? addMonths(quarterStart(end), -3 * (QUARTERS_BACK - 1)))
  const quarters: string[] = []
  for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 3)) {
    quarters.push(quarterKey(cursor))
  }
  return { quarters, start }
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

async function buildGroupRows<T extends string>(
  groups: Map<string, GroupCounts>,
  labelById: Map<string, string>,
  idField: T,
): Promise<Array<ReportGroupRow & Record<T, string>>> {
  return [...groups.entries()]
    .map(([id, counts]) => ({
      [idField]: id,
      name: labelById.get(id) ?? (id === UNASSIGNED ? UNASSIGNED : 'Unknown'),
      ...counts,
      open: counts.total - counts.disposed,
    }))
    .sort((a, b) => b.total - a.total) as Array<ReportGroupRow & Record<T, string>>
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
  scopedCaseIds: unknown[],
) {
  const filter: Record<string, unknown> = {}
  if (from || to) {
    filter.createdAt = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    }
  }
  if (scopedCaseIds.length === 0) {
    return {
      assessments: 0,
      total: 0,
      pending: 0,
      confirmed: 0,
      dismissed: 0,
      autoMerged: 0,
      manuallyMerged: 0,
      manualReview: 0,
      reverted: 0,
      averageReviewHours: 0,
      byMatchType: [],
    }
  }
  filter.$or = [{ caseAId: { $in: scopedCaseIds } }, { caseBId: { $in: scopedCaseIds } }]
  const [relationships, assessments] = await Promise.all([
    CaseRelationship.find(filter, {
      reviewStatus: 1,
      matchType: 1,
      mergeStatus: 1,
      createdAt: 1,
      reviewedAt: 1,
    }).lean(),
    CaseOverlapAssessment.countDocuments(filter),
  ])

  const byReview = new Map<string, number>(
    Object.values(RELATIONSHIP_REVIEW_STATUS).map((status) => [status, 0]),
  )
  const byMatchType = new Map<string, number>()
  let autoMerged = 0
  let manuallyMerged = 0
  let manualReview = 0
  let reverted = 0
  let reviewedCount = 0
  let reviewHoursTotal = 0
  for (const item of relationships) {
    byReview.set(item.reviewStatus, (byReview.get(item.reviewStatus) ?? 0) + 1)
    byMatchType.set(item.matchType, (byMatchType.get(item.matchType) ?? 0) + 1)
    const mergeStatus = item.mergeStatus ?? OVERLAP_MERGE_STATUS.CANDIDATE
    if (mergeStatus === OVERLAP_MERGE_STATUS.AUTO_MERGED) autoMerged += 1
    if (mergeStatus === OVERLAP_MERGE_STATUS.MANUAL_MERGED) manuallyMerged += 1
    if (mergeStatus === OVERLAP_MERGE_STATUS.MANUAL_REVIEW) manualReview += 1
    if (mergeStatus === OVERLAP_MERGE_STATUS.REVERTED) reverted += 1
    if (item.reviewedAt) {
      reviewedCount += 1
      reviewHoursTotal += Math.max(
        0,
        (item.reviewedAt.getTime() - item.createdAt.getTime()) / (60 * 60 * 1000),
      )
    }
  }

  return {
    assessments,
    total: relationships.length,
    pending: byReview.get(RELATIONSHIP_REVIEW_STATUS.PENDING) ?? 0,
    confirmed: byReview.get(RELATIONSHIP_REVIEW_STATUS.CONFIRMED) ?? 0,
    dismissed: byReview.get(RELATIONSHIP_REVIEW_STATUS.DISMISSED) ?? 0,
    autoMerged,
    manuallyMerged,
    manualReview,
    reverted,
    averageReviewHours:
      reviewedCount === 0 ? 0 : Math.round((reviewHoursTotal / reviewedCount) * 10) / 10,
    byMatchType: toSortedEntries(byMatchType).map(({ key, count }) => ({
      matchType: key,
      count,
    })),
  }
}

async function disposalActionsByKey(
  cases: ReportCase[],
  start: Date,
  end: Date,
  keyFor: (date: Date) => string,
) {
  if (cases.length === 0) return new Map<string, number>()
  const actions = await CaseAction.find(
    {
      actionType: ACTION_TYPE.DISPOSED,
      createdAt: { $gte: start, $lte: end },
      caseId: { $in: cases.map((item) => item._id) },
    },
    { createdAt: 1 },
  ).lean()
  const counts = new Map<string, number>()
  for (const action of actions) {
    const key = keyFor(action.createdAt)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

async function buildMonthly(cases: ReportCase[], from?: Date, to?: Date) {
  const { months, start } = monthSeries(from, to)
  const end = to ?? new Date()
  const disposed = await disposalActionsByKey(cases, start, end, monthKey)
  const received = new Map(months.map((month) => [month, 0]))
  for (const item of cases) {
    const key = monthKey(item.receivedAt)
    if (received.has(key)) received.set(key, (received.get(key) ?? 0) + 1)
  }
  return months.map((month) => ({
    month,
    received: received.get(month) ?? 0,
    disposed: disposed.get(month) ?? 0,
  }))
}

async function buildQuarterly(cases: ReportCase[], from?: Date, to?: Date) {
  const { quarters, start } = quarterSeries(from, to)
  const end = to ?? new Date()
  const disposed = await disposalActionsByKey(cases, start, end, quarterKey)
  const received = new Map(quarters.map((quarter) => [quarter, 0]))
  for (const item of cases) {
    const key = quarterKey(item.receivedAt)
    if (received.has(key)) received.set(key, (received.get(key) ?? 0) + 1)
  }
  return quarters.map((quarter) => ({
    quarter,
    received: received.get(quarter) ?? 0,
    disposed: disposed.get(quarter) ?? 0,
  }))
}

interface ReportCaseFilter {
  filter: Record<string, unknown>
  from?: Date
  to?: Date
  scope: Scope
}

async function buildReportCaseFilter(
  filters: ReportFilters,
  user: ScopeUser,
): Promise<ReportCaseFilter> {
  const { from, to } = parseRange(filters.dateFrom, filters.dateTo)
  const dateFilter: Record<string, unknown> = {}
  if (from || to) {
    dateFilter.receivedAt = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    }
  }
  if (filters.bureauId) dateFilter.bureauId = filters.bureauId
  if (filters.status) dateFilter.status = filters.status
  if (filters.category) dateFilter.category = filters.category

  const scope = resolveScope(user)
  const regionFilter = filters.regionId ? await caseRegionFilter(filters.regionId) : {}
  const filter = mergeFilters(mergeFilters(dateFilter, regionFilter), await caseScopeFilter(scope))
  return { filter, from, to, scope }
}

export async function getReportsGeo(
  filters: ReportFilters,
  user: ScopeUser,
): Promise<ReportsGeoSummary> {
  const { filter, scope } = await buildReportCaseFilter(filters, user)
  const [cases, institutions, regions] = await Promise.all([
    Case.find(filter, {
      status: 1,
      institutionId: 1,
      regionId: 1,
      expectedDisposalAt: 1,
    }).lean(),
    Institution.find({}, { regionId: 1 }).lean(),
    Region.find({}, { code: 1, name: 1, latitude: 1, longitude: 1 }).lean(),
  ])
  const institutionRegion = new Map(
    institutions.map((item) => [
      String(item._id),
      item.regionId ? String(item.regionId) : undefined,
    ]),
  )
  const scopedRegions = regions.filter((item) => {
    if (scope.kind === 'region' && String(item._id) !== String(scope.regionId)) return false
    if (filters.regionId && String(item._id) !== filters.regionId) return false
    return true
  })
  const regionSources: GeoRegionSource[] = scopedRegions.map((item) => ({
    regionId: String(item._id),
    code: item.code,
    name: item.name,
    latitude: item.latitude,
    longitude: item.longitude,
  }))
  const geoCases: GeoCaseSource[] = cases.map((item) => ({
    status: item.status,
    regionId: item.regionId ? String(item.regionId) : undefined,
    institutionRegionId: institutionRegion.get(String(item.institutionId)),
    expectedDisposalAt: item.expectedDisposalAt,
  }))
  return {
    generatedAt: new Date().toISOString(),
    regions: aggregateRegionGeo(regionSources, geoCases, new Date()),
  }
}

export async function getReportsSummary(
  filters: ReportFilters,
  user: ScopeUser,
): Promise<ReportsSummary> {
  const { filter: caseFilter, from, to } = await buildReportCaseFilter(filters, user)

  const cases = (await Case.find(caseFilter, {
    status: 1,
    category: 1,
    institutionId: 1,
    regionId: 1,
    bureauId: 1,
    receivedAt: 1,
    expectedDisposalAt: 1,
  }).lean()) as unknown as ReportCase[]

  const [institutions, bureaus, regions] = await Promise.all([
    Institution.find({}, { name: 1, regionId: 1 }).lean(),
    Bureau.find({}, { name: 1 }).lean(),
    Region.find({}, { name: 1 }).lean(),
  ])
  const institutionById = new Map(institutions.map((item) => [String(item._id), item]))
  const bureauById = new Map(bureaus.map((item) => [String(item._id), item.name]))
  const regionById = new Map(regions.map((item) => [String(item._id), item.name]))

  const { byStatus, byCategory, byBureau, byInstitution } = buildCounts(cases)
  const regionGroups = new Map<string, GroupCounts>()
  for (const item of cases) {
    const institution = institutionById.get(String(item.institutionId))
    const regionId = item.regionId
      ? String(item.regionId)
      : institution?.regionId
        ? String(institution.regionId)
        : UNASSIGNED
    accumulate(regionGroups, regionId, item)
  }

  const now = new Date()
  const total = cases.length
  const disposed = byStatus.get(CASE_STATUS.DISPOSED) ?? 0
  const reopened = byStatus.get(CASE_STATUS.REOPENED) ?? 0
  const institutionNames = new Map(
    [...institutionById.entries()].map(([id, item]) => [id, item.name]),
  )

  const [byBureauRows, byInstitutionRows, byRegionRows, overlaps, monthly, quarterly] =
    await Promise.all([
      buildGroupRows(byBureau, bureauById, 'bureauId'),
      buildGroupRows(byInstitution, institutionNames, 'institutionId'),
      buildGroupRows(regionGroups, regionById, 'regionId'),
      buildOverlapReport(
        from,
        to,
        cases.map((item) => item._id),
      ),
      buildMonthly(cases, from, to),
      buildQuarterly(cases, from, to),
    ])

  return {
    generatedAt: new Date().toISOString(),
    range: {
      from: from?.toISOString(),
      to: to?.toISOString(),
    },
    totals: {
      total,
      open: total - disposed,
      disposed,
      reopened,
      beyondTimelines: cases.filter((item) => isBeyondTimeline(item, now)).length,
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
    quarterly,
  }
}
