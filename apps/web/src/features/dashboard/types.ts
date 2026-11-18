// Dashboard data contracts kept out of the page so feature components and the
// role-landing config can share them without a circular import.

import type { CaseFilters } from '#/features/cases/api'

export interface StatusCounts {
  total: number
  open: number
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

export interface RecentOverlap {
  id: string
  matchType: string
  reviewStatus: string
  createdAt: string
  institutionName: string
  caseNumbers: string[]
}

export interface RecentEscalation {
  id: string
  caseId: string
  caseNumber: string
  remarks?: string
  createdAt: string
}

export interface DashboardSummary extends StatusCounts {
  generatedAt: string
  institutionWise: Array<StatusCounts & { institutionId: string; institutionName: string }>
  bureauWise: Array<StatusCounts & { bureauId: string; bureauName: string; bureauCode: string }>
  regionWise: Array<StatusCounts & { regionId: string; regionName: string; regionCode: string }>
  recentOverlaps: RecentOverlap[]
  recentEscalations: RecentEscalation[]
}

export interface DashboardAction {
  to: string
  label: string
  description?: string
  primary?: boolean
}

export interface RoleLanding {
  kicker: string
  queueTitle: string
  summary: string
  emptyTitle: string
  emptyDescription: string
  queueFilters: CaseFilters | null
  quickActions: DashboardAction[]
  reportsTo: string
  showAdminHub: boolean
  showSystemHealth: boolean
}
