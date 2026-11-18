// Pure urgency derivation for the dashboard attention deck. No server contract
// changes: every signal is derived from fields already present on CaseListItem.

import { CASE_STATUS } from '@casesync/config'
import type { CaseListItem } from '#/features/cases/api'

export type AttentionBand = 'due-now' | 'due-soon' | 'watching'

export const ATTENTION_BANDS: readonly AttentionBand[] = ['due-now', 'due-soon', 'watching']

export const ATTENTION_BAND_LABELS: Record<AttentionBand, string> = {
  'due-now': 'Due now',
  'due-soon': 'Due soon',
  watching: 'Watching',
}

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const DUE_NOW_WINDOW_MS = DAY_MS
const DUE_SOON_WINDOW_MS = 7 * DAY_MS

export interface AttentionEntry {
  item: CaseListItem
  band: AttentionBand
  dueAt?: string
  countdown: string
  reason: string
  isNew: boolean
}

function toTime(value?: string): number | undefined {
  if (!value) return undefined
  const time = Date.parse(value)
  return Number.isNaN(time) ? undefined : time
}

export function attentionDueAt(item: CaseListItem): string | undefined {
  return item.nextActionDueAt ?? item.reopenDeadline ?? item.expectedDisposalAt
}

export function attentionReason(item: CaseListItem): string {
  switch (item.status) {
    case CASE_STATUS.ESCALATED:
      return 'Escalated'
    case CASE_STATUS.REOPENED:
      return 'Reopened'
    case CASE_STATUS.AWAITING_COMPLAINANT:
      return 'Awaiting complainant'
    case CASE_STATUS.TRANSFERRED:
      return 'Transfer pending'
    case CASE_STATUS.ASSIGNED:
      return 'Assigned'
    default:
      return 'In progress'
  }
}

export function formatCountdown(dueAt: string | undefined, now: number): string {
  const dueTime = toTime(dueAt)
  if (dueTime === undefined) return 'No SLA date'

  const remaining = dueTime - now
  if (remaining === 0) return 'Due now'

  const magnitude = Math.abs(remaining)
  const amount =
    magnitude >= DAY_MS
      ? `${Math.round(magnitude / DAY_MS)}d`
      : magnitude >= HOUR_MS
        ? `${Math.max(1, Math.round(magnitude / HOUR_MS))}h`
        : `${Math.max(1, Math.round(magnitude / MINUTE_MS))}m`

  return remaining < 0 ? `${amount} overdue` : `Due in ${amount}`
}

function statusPriority(item: CaseListItem): number {
  if (item.status === CASE_STATUS.ESCALATED || item.status === CASE_STATUS.REOPENED) return 0
  return 1
}

function attentionBand(
  item: CaseListItem,
  dueTime: number | undefined,
  now: number,
): AttentionBand {
  const escalated = item.status === CASE_STATUS.ESCALATED || item.status === CASE_STATUS.REOPENED
  if (escalated || (dueTime !== undefined && dueTime <= now + DUE_NOW_WINDOW_MS)) return 'due-now'
  if (dueTime !== undefined && dueTime <= now + DUE_SOON_WINDOW_MS) return 'due-soon'
  return 'watching'
}

export function deriveAttention(
  items: readonly CaseListItem[],
  now: number = Date.now(),
  newIds: ReadonlySet<string> = new Set(),
): AttentionEntry[] {
  return items
    .map((item) => {
      const dueAt = attentionDueAt(item)
      const dueTime = toTime(dueAt)
      return {
        item,
        band: attentionBand(item, dueTime, now),
        dueAt,
        countdown: formatCountdown(dueAt, now),
        reason: attentionReason(item),
        isNew: newIds.has(item.id),
      }
    })
    .sort((left, right) => {
      const bandOrder = ATTENTION_BANDS.indexOf(left.band) - ATTENTION_BANDS.indexOf(right.band)
      if (bandOrder !== 0) return bandOrder

      const statusOrder = statusPriority(left.item) - statusPriority(right.item)
      if (statusOrder !== 0) return statusOrder

      const leftDue = toTime(left.dueAt) ?? Number.MAX_SAFE_INTEGER
      const rightDue = toTime(right.dueAt) ?? Number.MAX_SAFE_INTEGER
      if (leftDue !== rightDue) return leftDue - rightDue

      const leftAction = toTime(left.item.lastActionAt) ?? 0
      const rightAction = toTime(right.item.lastActionAt) ?? 0
      return leftAction - rightAction
    })
}
