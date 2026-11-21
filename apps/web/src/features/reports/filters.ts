import type { ReportFilters } from './api'

export const REPORT_PARAM_KEYS: Array<keyof ReportFilters> = [
  'dateFrom',
  'dateTo',
  'bureauId',
  'regionId',
  'status',
  'category',
]

export const REPORT_FILTER_LABELS: Record<keyof ReportFilters, string> = {
  dateFrom: 'Received from',
  dateTo: 'Received to',
  bureauId: 'Bureau',
  regionId: 'Region',
  status: 'Status',
  category: 'Category',
}

export function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
}

export function cleanReportFilters(input: ReportFilters): ReportFilters {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => Boolean(value)),
  ) as ReportFilters
}

export function readReportFilters(params: URLSearchParams): ReportFilters {
  const filters: ReportFilters = {}
  for (const key of REPORT_PARAM_KEYS) {
    const value = params.get(key)
    if (value) filters[key] = value
  }
  return filters
}

export function reportFiltersToParams(filters: ReportFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of REPORT_PARAM_KEYS) {
    const value = filters[key]
    if (value) params.set(key, value)
  }
  return params
}

export function removeReportFilter(
  filters: ReportFilters,
  key: keyof ReportFilters,
): ReportFilters {
  const next = { ...filters }
  delete next[key]
  return next
}

export function reportFilterSignature(filters: ReportFilters) {
  return REPORT_PARAM_KEYS.map((key) => filters[key] ?? '').join('|')
}
