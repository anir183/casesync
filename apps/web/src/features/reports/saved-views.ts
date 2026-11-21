import { CASE_STATUS } from '@casesync/config'
import type { ReportFilters } from './api'
import { reportFilterSignature } from './filters'

export interface ReportSavedView {
  id: string
  label: string
  filters: ReportFilters
}

export const REPORT_SAVED_VIEWS: ReportSavedView[] = [
  { id: 'all', label: 'All reports', filters: {} },
  { id: 'escalated', label: 'Escalated', filters: { status: CASE_STATUS.ESCALATED } },
  { id: 'reopened', label: 'Reopened', filters: { status: CASE_STATUS.REOPENED } },
  { id: 'disposed', label: 'Disposed', filters: { status: CASE_STATUS.DISPOSED } },
]

export const REPORT_CUSTOM_VIEW: ReportSavedView = {
  id: 'custom',
  label: 'Custom filters',
  filters: {},
}

export function reportViewForFilters(filters: ReportFilters): string {
  const current = reportFilterSignature(filters)
  return (
    REPORT_SAVED_VIEWS.find((view) => reportFilterSignature(view.filters) === current)?.id ??
    REPORT_CUSTOM_VIEW.id
  )
}
