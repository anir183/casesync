// Admin-only dashboard panel. Queries are scoped to the administrator role by
// the page before this component mounts; no route or permission is changed here.

import { SectionHeader } from '#/components/ui/section-header'
import { type AdminUser, useAdminUsers, useAuditLog } from '#/features/admin/api'
import { AdminHub, type AdminHubGroup } from '#/features/admin/components/admin-hub'
import {
  type HealthSignal,
  SystemHealthStrip,
} from '#/features/admin/components/system-health-strip'
import type { DashboardSummary } from '#/features/dashboard/types'
import { useAllBureaus, useAllCategories, useAllRegions } from '#/features/organization/api'
import { useOverlaps } from '#/features/overlaps/api'
import { useVerificationRequests } from '#/features/portal/api'
import { useInstitutionDomains, useRepresentativeQueue } from '#/features/representatives/api'
import { useJobRuns, useSlaConfigs } from '#/features/sla/api'

function countOrDash<T>(data: T[] | undefined, select: (items: T[]) => number): string | number {
  return data ? select(data) : '—'
}

function totalOrDash(data: { total: number } | undefined): string | number {
  return data ? data.total : '—'
}

function failedRuns(runs: Array<{ status: string; counts?: { errors?: number } }>): number {
  return runs.filter((run) => run.status === 'FAILED' || (run.counts?.errors ?? 0) > 0).length
}

export function AdminCommandPanel({ summary }: { summary?: DashboardSummary }) {
  const users = useAdminUsers()
  const representatives = useRepresentativeQueue({
    status: 'PENDING',
    page: 1,
    pageSize: 1,
  })
  const domains = useInstitutionDomains({})
  const verifications = useVerificationRequests('PENDING')
  const bureaus = useAllBureaus()
  const regions = useAllRegions()
  const categories = useAllCategories()
  const sla = useSlaConfigs()
  const overlaps = useOverlaps({
    status: 'PENDING',
    mergeStatus: 'candidate,manual_review',
    page: 1,
    pageSize: 1,
  })
  const audit = useAuditLog({ page: 1, pageSize: 1 })
  const jobs = useJobRuns()

  const activeUsers = countOrDash<AdminUser>(
    users.data,
    (items) => items.filter((item) => item.active).length,
  )
  const masterCount =
    bureaus.data && regions.data && categories.data
      ? bureaus.data.length + regions.data.length + categories.data.length
      : '—'
  const failedRunCount = jobs.data ? failedRuns(jobs.data.items) : '—'
  const pendingApprovals =
    representatives.data && verifications.data
      ? representatives.data.total + verifications.data.total
      : '—'
  const auditCount = totalOrDash(audit.data as { total: number } | undefined)
  const overlapCount = totalOrDash(overlaps.data)
  const verificationCount = totalOrDash(verifications.data)

  const groups: AdminHubGroup[] = [
    {
      title: 'People & access',
      description: 'Accounts, representatives, domains, and identity checks.',
      links: [
        {
          label: 'Users',
          to: '/admin/users',
          value: countOrDash<AdminUser>(users.data, (items) => items.length),
          hint: `${activeUsers} active`,
        },
        {
          label: 'Representatives',
          to: '/admin/institution-representatives',
          value: totalOrDash(representatives.data),
          hint: 'Pending approvals',
        },
        {
          label: 'Institution domains',
          to: '/admin/institution-domains',
          value: countOrDash(domains.data?.items, (items) => items.length),
          hint: 'Configured email domains',
        },
        {
          label: 'Verifications',
          to: '/admin/verifications',
          value: verificationCount,
          hint: 'Complainant identity requests',
        },
      ],
    },
    {
      title: 'Masters',
      description: 'Organization reference data and SLA policy.',
      links: [
        {
          label: 'Organization',
          to: '/admin/organization',
          value: masterCount,
          hint: 'Bureaus, regions, and categories',
        },
        {
          label: 'SLA rules',
          to: '/admin/sla',
          value: countOrDash(sla.data?.items ?? undefined, (items) => items.length),
          hint: 'Configured disposal targets',
        },
      ],
    },
    {
      title: 'Operations',
      description: 'Case pressure, coordination, and the change record.',
      links: [
        {
          label: 'Escalated cases',
          to: '/cases?status=ESCALATED',
          value: summary?.escalated ?? '—',
          hint: 'Awaiting senior review',
        },
        {
          label: 'Overlap alerts',
          to: '/overlaps',
          value: overlapCount,
          hint: 'Awaiting coordination review',
        },
        {
          label: 'Audit log',
          to: '/admin/audit',
          value: auditCount,
          hint: 'Recorded changes',
        },
      ],
    },
    {
      title: 'Data quality',
      description: 'Signals that need a decision or a retry.',
      links: [
        {
          label: 'Pending verifications',
          to: '/admin/verifications',
          value: verificationCount,
          hint: 'Identity checks to decide',
        },
        {
          label: 'Pending representatives',
          to: '/admin/institution-representatives',
          value: totalOrDash(representatives.data),
          hint: 'Institution access requests',
        },
        {
          label: 'Failed runs',
          to: '/admin/sla',
          value: failedRunCount,
          hint: 'Recent SLA scan failures',
        },
      ],
    },
  ]

  const latestRun = jobs.data?.items[0]
  const signals: HealthSignal[] = [
    {
      label: 'SLA jobs',
      value: latestRun ? latestRun.status.replace(/_/g, ' ') : '—',
      detail: latestRun ? 'Most recent SLA scan' : 'No scan recorded',
      tone: latestRun?.status === 'FAILED' ? 'danger' : 'success',
    },
    {
      label: 'Failed runs',
      value: failedRunCount,
      detail: 'Recent SLA scans with errors',
      tone: typeof failedRunCount === 'number' && failedRunCount > 0 ? 'warning' : 'default',
    },
    {
      label: 'Pending approvals',
      value: pendingApprovals,
      detail: 'Representatives and verifications',
      tone: typeof pendingApprovals === 'number' && pendingApprovals > 0 ? 'warning' : 'success',
    },
    {
      label: 'Beyond timeline',
      value: summary?.beyondTimelines ?? '—',
      detail: 'Cases past their target date',
      tone: summary?.beyondTimelines ? 'danger' : 'success',
    },
  ]

  return (
    <div className="space-y-section">
      <AdminHub groups={groups} />
      <section aria-label="System health" className="space-y-control">
        <SectionHeader
          title="System health"
          description="Jobs, failed runs, and pending approvals."
        />
        <SystemHealthStrip signals={signals} />
      </section>
    </div>
  )
}
