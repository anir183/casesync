import { CASE_STATUS } from '@casesync/config'

export interface CaseMetricSource {
  status: string
  expectedDisposalAt?: Date
  isUnassigned?: boolean
}

export interface StatusCounts {
  total: number
  pending: number
  unassigned: number
  assigned: number
  underProcess: number
  disposed: number
  transferred: number
  escalated: number
  reopened: number
  beyondTimelines: number
}

export function emptyStatusCounts(): StatusCounts {
  return {
    total: 0,
    pending: 0,
    unassigned: 0,
    assigned: 0,
    underProcess: 0,
    disposed: 0,
    transferred: 0,
    escalated: 0,
    reopened: 0,
    beyondTimelines: 0,
  }
}

export function isBeyondTimeline(item: CaseMetricSource, now: Date): boolean {
  return (
    item.status !== CASE_STATUS.DISPOSED &&
    !!item.expectedDisposalAt &&
    item.expectedDisposalAt < now
  )
}

export function addToStatusCounts(counts: StatusCounts, item: CaseMetricSource, now: Date): void {
  counts.total += 1
  if (item.status === CASE_STATUS.RECEIVED) counts.pending += 1
  if (item.status === CASE_STATUS.ASSIGNED) counts.assigned += 1
  if (item.status === CASE_STATUS.UNDER_PROCESS) counts.underProcess += 1
  if (item.status === CASE_STATUS.DISPOSED) counts.disposed += 1
  if (item.status === CASE_STATUS.TRANSFERRED) counts.transferred += 1
  if (item.status === CASE_STATUS.ESCALATED) counts.escalated += 1
  if (item.status === CASE_STATUS.REOPENED) counts.reopened += 1
  if (item.isUnassigned) counts.unassigned += 1
  if (isBeyondTimeline(item, now)) counts.beyondTimelines += 1
}

export function withOpen<T extends Pick<StatusCounts, 'total' | 'disposed'>>(
  counts: T,
): T & { open: number } {
  return { ...counts, open: counts.total - counts.disposed }
}
