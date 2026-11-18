import { CASE_STATUS } from '@casesync/config'
import type { CaseFilters } from './api'

export interface CaseSavedView {
  id: string
  label: string
  filters: CaseFilters
}

export const CASE_SAVED_VIEWS: CaseSavedView[] = [
  { id: 'all', label: 'All cases', filters: {} },
  { id: 'escalated', label: 'Escalated', filters: { status: CASE_STATUS.ESCALATED } },
  {
    id: 'awaiting-complainant',
    label: 'Awaiting complainant',
    filters: { status: CASE_STATUS.AWAITING_COMPLAINANT },
  },
  { id: 'under-process', label: 'Under process', filters: { status: CASE_STATUS.UNDER_PROCESS } },
  { id: 'reopened', label: 'Reopened', filters: { status: CASE_STATUS.REOPENED } },
]

export const CASE_CUSTOM_VIEW: CaseSavedView = {
  id: 'custom',
  label: 'Custom filters',
  filters: {},
}

const SIGNATURE_KEYS = [
  'q',
  'status',
  'bureauId',
  'regionId',
  'category',
  'source',
  'priority',
  'dateFrom',
  'dateTo',
] as const

function signature(filters: CaseFilters) {
  return SIGNATURE_KEYS.map((key) => filters[key] ?? '').join('|')
}

export function caseViewForFilters(filters: CaseFilters): string {
  const current = signature(filters)
  return CASE_SAVED_VIEWS.find((view) => signature(view.filters) === current)?.id ?? 'custom'
}
