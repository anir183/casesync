import { CASE_STATUS } from '@casesync/config'
import { type ScopeUser, caseScopeFilter, mergeFilters, resolveScope } from '#/lib/scope'
import { Bureau } from '#/models/bureau.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'

const INSTITUTION_LIMIT = 10

interface CaseSummarySource {
  status: string
  institutionId: unknown
  bureauId?: unknown
  expectedDisposalAt?: Date
}

interface StatusCounts {
  total: number
  pending: number
  assigned: number
  underProcess: number
  disposed: number
  transferred: number
  escalated: number
  reopened: number
  beyondTimelines: number
}

function emptyCounts(): StatusCounts {
  return {
    total: 0,
    pending: 0,
    assigned: 0,
    underProcess: 0,
    disposed: 0,
    transferred: 0,
    escalated: 0,
    reopened: 0,
    beyondTimelines: 0,
  }
}

function isBeyondTimeline(item: CaseSummarySource, now: Date) {
  return (
    item.status !== CASE_STATUS.DISPOSED &&
    !!item.expectedDisposalAt &&
    item.expectedDisposalAt < now
  )
}

function addToCounts(counts: StatusCounts, item: CaseSummarySource, now: Date) {
  counts.total += 1
  if (item.status === CASE_STATUS.RECEIVED) counts.pending += 1
  if (item.status === CASE_STATUS.ASSIGNED) counts.assigned += 1
  if (item.status === CASE_STATUS.UNDER_PROCESS) counts.underProcess += 1
  if (item.status === CASE_STATUS.DISPOSED) counts.disposed += 1
  if (item.status === CASE_STATUS.TRANSFERRED) counts.transferred += 1
  if (item.status === CASE_STATUS.ESCALATED) counts.escalated += 1
  if (item.status === CASE_STATUS.REOPENED) counts.reopened += 1
  if (isBeyondTimeline(item, now)) counts.beyondTimelines += 1
}

function withOpen(counts: StatusCounts) {
  return { ...counts, open: counts.total - counts.disposed }
}

export async function getDashboardSummary(user: ScopeUser) {
  const now = new Date()
  const scope = resolveScope(user)
  const scoped = mergeFilters({}, await caseScopeFilter(scope))
  const cases = (await Case.find(scoped, {
    status: 1,
    institutionId: 1,
    bureauId: 1,
    expectedDisposalAt: 1,
  }).lean()) as unknown as CaseSummarySource[]

  const totals = emptyCounts()
  const byInstitution = new Map<string, StatusCounts>()
  const byBureau = new Map<string, StatusCounts>()

  for (const item of cases) {
    addToCounts(totals, item, now)

    const institutionKey = String(item.institutionId)
    const institutionCounts = byInstitution.get(institutionKey) ?? emptyCounts()
    addToCounts(institutionCounts, item, now)
    byInstitution.set(institutionKey, institutionCounts)

    const bureauKey = item.bureauId ? String(item.bureauId) : 'UNASSIGNED'
    const bureauCounts = byBureau.get(bureauKey) ?? emptyCounts()
    addToCounts(bureauCounts, item, now)
    byBureau.set(bureauKey, bureauCounts)
  }

  const [institutions, bureaus] = await Promise.all([
    Institution.find(
      { _id: { $in: [...byInstitution.keys()] } },
      { name: 1, aictePermanentId: 1 },
    ).lean(),
    Bureau.find({}, { name: 1, code: 1 }).lean(),
  ])
  const institutionById = new Map(institutions.map((item) => [String(item._id), item]))

  const institutionWise = [...byInstitution.entries()]
    .map(([id, counts]) => ({
      institutionId: id,
      institutionName: institutionById.get(id)?.name ?? 'Unknown institution',
      ...withOpen(counts),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, INSTITUTION_LIMIT)

  const bureauWise = bureaus
    .map((item) => ({
      bureauId: String(item._id),
      bureauName: item.name,
      bureauCode: item.code,
      ...withOpen(byBureau.get(String(item._id)) ?? emptyCounts()),
    }))
    .sort((a, b) => b.total - a.total)

  return {
    ...totals,
    open: totals.total - totals.disposed,
    institutionWise,
    bureauWise,
  }
}
