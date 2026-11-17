// Repeated report metric helpers: date series, case-count aggregation,
// group-row shaping, and age buckets. Pure or read-only; no report orchestration.

import { ACTION_TYPE, CASE_STATUS } from '@casesync/config'
import { CaseAction } from '#/models/case-action.model'

export const MONTHS_BACK = 6
export const QUARTERS_BACK = 8
export const MS_PER_DAY = 24 * 60 * 60 * 1000
export const UNASSIGNED = 'Unassigned'
export const UNCATEGORIZED = 'Uncategorized'

export const AGE_BUCKETS: ReadonlyArray<{ label: string; days: number }> = [
  { label: '0-7 days', days: 7 },
  { label: '8-30 days', days: 30 },
  { label: '31-60 days', days: 60 },
  { label: '61-90 days', days: 90 },
  { label: '90+ days', days: Number.POSITIVE_INFINITY },
]

export interface ReportCase {
  _id: unknown
  status: string
  category?: string
  institutionId: unknown
  regionId?: unknown
  bureauId?: unknown
  receivedAt: Date
  expectedDisposalAt?: Date
}

export interface GroupCounts {
  total: number
  disposed: number
}

export interface ReportGroupRow {
  name: string
  total: number
  open: number
  disposed: number
}

export function bucketForAge(days: number): string {
  const bucket = AGE_BUCKETS.find((item) => days <= item.days)
  return bucket ? bucket.label : AGE_BUCKETS[AGE_BUCKETS.length - 1].label
}

export function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function quarterKey(date: Date) {
  return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`
}

export function monthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

export function quarterStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1))
}

export function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
}

export function monthSeries(from: Date | undefined, to: Date | undefined) {
  const end = to ?? new Date()
  const start = monthStart(from ?? addMonths(end, -(MONTHS_BACK - 1)))
  const months: string[] = []
  for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 1)) {
    months.push(monthKey(cursor))
  }
  return { months, start }
}

export function quarterSeries(from: Date | undefined, to: Date | undefined) {
  const end = to ?? new Date()
  const start = quarterStart(from ?? addMonths(quarterStart(end), -3 * (QUARTERS_BACK - 1)))
  const quarters: string[] = []
  for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 3)) {
    quarters.push(quarterKey(cursor))
  }
  return { quarters, start }
}

export function accumulate<T extends GroupCounts>(
  map: Map<string, T>,
  key: string,
  item: ReportCase,
) {
  const current = map.get(key) ?? ({ total: 0, disposed: 0 } as T)
  current.total += 1
  if (item.status === CASE_STATUS.DISPOSED) current.disposed += 1
  map.set(key, current)
}

export function buildCounts(cases: ReportCase[]) {
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

export function toSortedEntries(map: Map<string, number>) {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}

export async function buildGroupRows<T extends string>(
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

export function buildAgeBuckets(cases: ReportCase[]) {
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

export async function disposalActionsByKey(
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

export async function buildMonthly(cases: ReportCase[], from?: Date, to?: Date) {
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

export async function buildQuarterly(cases: ReportCase[], from?: Date, to?: Date) {
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
