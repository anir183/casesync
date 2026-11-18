// Pure derivations for the dashboard's compact operational snapshots. Every
// value comes from the existing summary contract; nothing here filters or
// analyses data the way Reports does.

import { matchTypeLabel } from '#/features/overlaps/labels'
import type { DashboardSummary } from './types'

export type SignalTone = 'default' | 'primary' | 'warning' | 'danger' | 'success'

export interface Signal {
  label: string
  value: string | number
  hint: string
  tone?: SignalTone
}

function shown(value: number | undefined, isLoading: boolean): string | number {
  if (isLoading) return '—'
  return value ?? 0
}

export function buildSignals(
  data: DashboardSummary | undefined,
  waiting: number | undefined,
  newCount: number,
  isLoading = false,
): Signal[] {
  const total = data?.total ?? 0
  const beyond = data?.beyondTimelines ?? 0
  const escalated = (data?.escalated ?? 0) + (data?.reopened ?? 0)

  return [
    {
      label: 'Needs action',
      value: shown(waiting, isLoading),
      hint: 'in your scoped queue',
      tone: waiting ? 'primary' : undefined,
    },
    {
      label: 'Beyond timeline',
      value: shown(data?.beyondTimelines, isLoading),
      hint: total > 0 ? `${Math.round((beyond / total) * 100)}% of cases` : 'No cases',
      tone: beyond ? 'danger' : undefined,
    },
    {
      label: 'Escalated / reopened',
      value: shown(escalated, isLoading),
      hint: 'awaiting senior review',
      tone: escalated ? 'warning' : undefined,
    },
    {
      label: 'New since you looked',
      value: shown(newCount, isLoading),
      hint: 'session signals',
      tone: newCount ? 'primary' : undefined,
    },
  ]
}

type PostureKey =
  | 'pending'
  | 'assigned'
  | 'underProcess'
  | 'transferred'
  | 'escalated'
  | 'reopened'
  | 'disposed'

export interface PostureSegment {
  key: PostureKey
  label: string
  value: number
  barClass: string
  dotClass: string
}

const POSTURE_SEGMENTS: ReadonlyArray<Omit<PostureSegment, 'value'>> = [
  {
    key: 'pending',
    label: 'Received',
    barClass: 'bg-info',
    dotClass: 'bg-info',
  },
  {
    key: 'assigned',
    label: 'Assigned',
    barClass: 'bg-primary',
    dotClass: 'bg-primary',
  },
  {
    key: 'underProcess',
    label: 'Under process',
    barClass: 'bg-warning',
    dotClass: 'bg-warning',
  },
  {
    key: 'transferred',
    label: 'Transferred',
    barClass: 'bg-chart-4',
    dotClass: 'bg-chart-4',
  },
  {
    key: 'escalated',
    label: 'Escalated',
    barClass: 'bg-danger',
    dotClass: 'bg-danger',
  },
  {
    key: 'reopened',
    label: 'Reopened',
    barClass: 'bg-chart-6',
    dotClass: 'bg-chart-6',
  },
  {
    key: 'disposed',
    label: 'Disposed',
    barClass: 'bg-success',
    dotClass: 'bg-success',
  },
]

export function buildPosture(data: DashboardSummary | undefined): PostureSegment[] {
  return POSTURE_SEGMENTS.map((segment) => ({
    ...segment,
    value: data?.[segment.key] ?? 0,
  })).filter((segment) => segment.value > 0)
}

export interface PressurePoint {
  id: string
  label: string
  open: number
  beyond: number
  share: number
}

export function buildPressurePoints(
  data: DashboardSummary | undefined,
  limit = 3,
): PressurePoint[] {
  const rows = [...(data?.institutionWise ?? [])]
    .sort(
      (left, right) =>
        right.beyondTimelines - left.beyondTimelines ||
        right.open - left.open ||
        right.total - left.total,
    )
    .slice(0, limit)
  const maxOpen = Math.max(1, ...rows.map((row) => row.open))

  return rows.map((row) => ({
    id: row.institutionId,
    label: row.institutionName,
    open: row.open,
    beyond: row.beyondTimelines,
    share: Math.max(4, Math.round((row.open / maxOpen) * 100)),
  }))
}

export type ChangeEventType = 'overlap' | 'escalation'

export interface ChangeEvent {
  id: string
  type: ChangeEventType
  title: string
  detail: string
  to: string
  createdAt: string
}

export function buildChangeFeed(data: DashboardSummary | undefined, limit = 5): ChangeEvent[] {
  const overlaps: ChangeEvent[] = (data?.recentOverlaps ?? []).map((item) => ({
    id: item.id,
    type: 'overlap',
    title: `Overlap · ${item.caseNumbers.join(' ↔ ') || 'relationship'}`,
    detail: `${item.institutionName} · ${matchTypeLabel(item.matchType)}`,
    to: `/overlaps/${item.id}`,
    createdAt: item.createdAt,
  }))
  const escalations: ChangeEvent[] = (data?.recentEscalations ?? []).map((item) => ({
    id: item.id,
    type: 'escalation',
    title: `Escalation · ${item.caseNumber}`,
    detail: item.remarks || 'Escalated for senior review',
    to: `/cases/${item.caseId}`,
    createdAt: item.createdAt,
  }))

  return [...overlaps, ...escalations]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, limit)
}
