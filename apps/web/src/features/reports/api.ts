import { useQuery } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'

export interface ReportGroupRow {
  name: string
  total: number
  open: number
  disposed: number
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

export interface ReportFilters {
  dateFrom?: string
  dateTo?: string
  bureauId?: string
  regionId?: string
  status?: string
  category?: string
}

function buildQuery(filters: ReportFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function useReports(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'summary', filters],
    queryFn: () => apiClient.get<ReportsSummary>(`/reports/summary${buildQuery(filters)}`),
  })
}

export function downloadReports(filters: ReportFilters) {
  return apiClient.download(`/reports/export${buildQuery(filters)}`, 'casesync-reports.csv')
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

export interface ReportsGeoSummary {
  generatedAt: string
  regions: GeoRegionRow[]
}

export function useReportsGeo(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'geo', filters],
    queryFn: () => apiClient.get<ReportsGeoSummary>(`/reports/geo${buildQuery(filters)}`),
  })
}
