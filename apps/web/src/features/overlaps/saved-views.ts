import type { OverlapFilters } from './api'

export interface OverlapSavedView {
  id: string
  label: string
  filters: Pick<OverlapFilters, 'status' | 'mergeStatus'>
}

export const OVERLAP_SAVED_VIEWS: OverlapSavedView[] = [
  {
    id: 'awaiting-review',
    label: 'Awaiting review',
    filters: { status: 'PENDING', mergeStatus: 'candidate,manual_review' },
  },
  {
    id: 'auto-merged',
    label: 'Auto-merged',
    filters: { status: 'CONFIRMED', mergeStatus: 'auto_merged' },
  },
  {
    id: 'manually-merged',
    label: 'Manually merged',
    filters: { status: 'CONFIRMED', mergeStatus: 'manual_merged' },
  },
  {
    id: 'reverted',
    label: 'Reverted',
    filters: { status: 'PENDING', mergeStatus: 'reverted' },
  },
  { id: 'dismissed', label: 'Dismissed', filters: { status: 'DISMISSED' } },
]

export const OVERLAP_CUSTOM_VIEW: OverlapSavedView = {
  id: 'custom',
  label: 'Custom filters',
  filters: { status: 'PENDING' },
}

export function overlapViewForFilters(filters: OverlapFilters): string {
  const match = OVERLAP_SAVED_VIEWS.find(
    (view) =>
      view.filters.status === filters.status &&
      view.filters.mergeStatus === filters.mergeStatus &&
      !filters.bureauId &&
      !filters.regionId &&
      !filters.matchType &&
      !filters.institutionId &&
      !filters.q,
  )
  return match?.id ?? 'custom'
}
